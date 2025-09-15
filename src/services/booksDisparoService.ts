import { supabase } from '@/integrations/supabase/client';
import type {
  DisparoResult,
  DisparoDetalhe,
  StatusMensal,
  AgendamentoDisparo,
  HistoricoDisparo,
  HistoricoDisparoInsert,
  ControleMensal,
  ControleMensalInsert,
  ControleMensalUpdate,
  StatusDisparo,
  StatusControleMensal,
  EmpresaCliente,
  Colaborador,
  HistoricoFiltros,
  ControleMensalFiltros,
  HistoricoDisparoCompleto,
  ControleMensalCompleto
} from '@/types/clientBooks';
import { emailService } from './emailService';
import { clientBooksTemplateService } from './clientBooksTemplateService';

class BooksDisparoService {
  /**
   * Dispara books mensais para todas as empresas ativas
   */
  async dispararBooksMensal(mes: number, ano: number): Promise<DisparoResult> {
    try {
      // Buscar empresas ativas
      const { data: empresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select(`
          *,
          colaboradores!inner(*)
        `)
        .eq('status', 'ativo')
        .eq('colaboradores.status', 'ativo');

      if (empresasError) {
        throw new Error(`Erro ao buscar empresas: ${empresasError.message}`);
      }


      if (!empresas || empresas.length === 0) {
        return {
          sucesso: 0,
          falhas: 0,
          total: 0,
          detalhes: []
        };
      }

      const detalhes: DisparoDetalhe[] = [];
      let sucessos = 0;
      let falhas = 0;

      // Processar cada empresa
      for (const empresa of empresas) {
        try {
          // Verificar se já existe controle mensal para esta empresa
          const { data: controleExistente } = await supabase
            .from('controle_mensal')
            .select('*')
            .eq('mes', mes)
            .eq('ano', ano)
            .eq('empresa_id', empresa.id)
            .single();

          // Se já foi processado com sucesso, pular
          if (controleExistente && controleExistente.status === 'enviado') {
            continue;
          }

          // Buscar colaboradores ativos da empresa
          const { data: colaboradores, error: colaboradoresError } = await supabase
            .from('colaboradores')
            .select('*')
            .eq('empresa_id', empresa.id)
            .eq('status', 'ativo');

          if (colaboradoresError || !colaboradores || colaboradores.length === 0) {
            await this.registrarFalhaControle(mes, ano, empresa.id, 'Nenhum colaborador ativo encontrado');
            continue;
          }

          // Buscar grupos de e-mail para CC
          const { data: gruposEmpresas } = await supabase
            .from('empresa_grupos')
            .select(`
              grupos_responsaveis(
                grupo_emails(email, nome)
              )
            `)
            .eq('empresa_id', empresa.id);

          const emailsCC: string[] = [];
          if (gruposEmpresas) {
            gruposEmpresas.forEach(grupo => {
              if (grupo.grupos_responsaveis?.grupo_emails) {
                grupo.grupos_responsaveis.grupo_emails.forEach(email => {
                  emailsCC.push(email.email);
                });
              }
            });
          }

          // Adicionar e-mail do gestor se existir
          if (empresa.email_gestor) {
            emailsCC.push(empresa.email_gestor);
          }

          // Processar cada colaborador
          let emailsEnviados = 0;
          const colaboradoresProcessados: string[] = [];

          for (const colaborador of colaboradores) {
            try {
              const resultadoDisparo = await this.enviarBookColaborador(
                empresa,
                colaborador,
                emailsCC,
                mes,
                ano
              );

              if (resultadoDisparo.sucesso) {
                emailsEnviados++;
                colaboradoresProcessados.push(colaborador.id);
              }

              detalhes.push({
                empresaId: empresa.id,
                colaboradorId: colaborador.id,
                status: resultadoDisparo.sucesso ? 'enviado' : 'falhou',
                erro: resultadoDisparo.erro,
                emailsEnviados: resultadoDisparo.sucesso ? [colaborador.email, ...emailsCC] : []
              });

            } catch (error) {
              detalhes.push({
                empresaId: empresa.id,
                colaboradorId: colaborador.id,
                status: 'falhou',
                erro: error instanceof Error ? error.message : 'Erro desconhecido',
                emailsEnviados: []
              });
            }
          }

          // Atualizar controle mensal
          if (emailsEnviados > 0) {
            await this.atualizarControleMensal(mes, ano, empresa.id, 'enviado', `${emailsEnviados} e-mails enviados`);
            sucessos++;
          } else {
            await this.atualizarControleMensal(mes, ano, empresa.id, 'falhou', 'Nenhum e-mail foi enviado com sucesso');
            falhas++;
          }

        } catch (error) {
          falhas++;
          await this.registrarFalhaControle(
            mes, 
            ano, 
            empresa.id, 
            error instanceof Error ? error.message : 'Erro desconhecido'
          );
        }
      }

      return {
        sucesso: sucessos,
        falhas: falhas,
        total: empresas.length,
        detalhes
      };

    } catch (error) {
      throw new Error(`Erro no disparo mensal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Dispara books para empresas selecionadas.
   * Se options.forceResend = true, reenvia mesmo que já conste como 'enviado'.
   * Sempre registra no histórico, preservando disparos anteriores.
   */
  async dispararEmpresasSelecionadas(
    mes: number,
    ano: number,
    empresaIds: string[],
    options?: { forceResend?: boolean }
  ): Promise<DisparoResult> {
    const forceResend = options?.forceResend === true;
    try {
      if (!empresaIds || empresaIds.length === 0) {
        return { sucesso: 0, falhas: 0, total: 0, detalhes: [] };
      }

      // Buscar empresas selecionadas e ativas
      const { data: empresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select(`
          *,
          colaboradores!inner(*)
        `)
        .in('id', empresaIds)
        .eq('status', 'ativo')
        .eq('colaboradores.status', 'ativo');

      if (empresasError) {
        throw new Error(`Erro ao buscar empresas: ${empresasError.message}`);
      }

      if (!empresas || empresas.length === 0) {
        return { sucesso: 0, falhas: 0, total: 0, detalhes: [] };
      }

      const detalhes: DisparoDetalhe[] = [];
      let sucessos = 0;
      let falhas = 0;

      for (const empresa of empresas) {
        try {
          // Se não for reenvio forçado, pular já enviados
          if (!forceResend) {
            const { data: controleExistente } = await supabase
              .from('controle_mensal')
              .select('*')
              .eq('mes', mes)
              .eq('ano', ano)
              .eq('empresa_id', empresa.id)
              .single();
            if (controleExistente && controleExistente.status === 'enviado') {
              continue;
            }
          }

          // Buscar colaboradores ativos
          const { data: colaboradores, error: colaboradoresError } = await supabase
            .from('colaboradores')
            .select('*')
            .eq('empresa_id', empresa.id)
            .eq('status', 'ativo');

          if (colaboradoresError || !colaboradores || colaboradores.length === 0) {
            await this.registrarFalhaControle(mes, ano, empresa.id, 'Nenhum colaborador ativo encontrado');
            continue;
          }

          // Coletar e-mails em cópia
          const { data: gruposEmpresas } = await supabase
            .from('empresa_grupos')
            .select(`
              grupos_responsaveis(
                grupo_emails(email, nome)
              )
            `)
            .eq('empresa_id', empresa.id);

          const emailsCC: string[] = [];
          if (gruposEmpresas) {
            gruposEmpresas.forEach(grupo => {
              if (grupo.grupos_responsaveis?.grupo_emails) {
                grupo.grupos_responsaveis.grupo_emails.forEach(email => emailsCC.push(email.email));
              }
            });
          }
          if (empresa.email_gestor) emailsCC.push(empresa.email_gestor);

          let emailsEnviados = 0;
          for (const colaborador of colaboradores) {
            try {
              const resultadoDisparo = await this.enviarBookColaborador(
                empresa,
                colaborador,
                emailsCC,
                mes,
                ano
              );
              if (resultadoDisparo.sucesso) emailsEnviados++;
              detalhes.push({
                empresaId: empresa.id,
                colaboradorId: colaborador.id,
                status: resultadoDisparo.sucesso ? 'enviado' : 'falhou',
                erro: resultadoDisparo.erro,
                emailsEnviados: resultadoDisparo.sucesso ? [colaborador.email, ...emailsCC] : []
              });
            } catch (error) {
              detalhes.push({
                empresaId: empresa.id,
                colaboradorId: colaborador.id,
                status: 'falhou',
                erro: error instanceof Error ? error.message : 'Erro desconhecido',
                emailsEnviados: []
              });
            }
          }

          // Atualizar controle mensal com observação apropriada
          if (emailsEnviados > 0) {
            await this.atualizarControleMensal(
              mes,
              ano,
              empresa.id,
              'enviado',
              forceResend ? `Reenvio manual: ${emailsEnviados} e-mails enviados` : `${emailsEnviados} e-mails enviados`
            );
            sucessos++;
          } else {
            await this.atualizarControleMensal(
              mes,
              ano,
              empresa.id,
              'falhou',
              forceResend ? 'Reenvio manual: Nenhum e-mail foi enviado com sucesso' : 'Nenhum e-mail foi enviado com sucesso'
            );
            falhas++;
          }
        } catch (error) {
          falhas++;
          await this.registrarFalhaControle(
            mes,
            ano,
            empresa.id,
            error instanceof Error ? error.message : 'Erro desconhecido'
          );
        }
      }

      return { sucesso: sucessos, falhas, total: empresaIds.length, detalhes };
    } catch (error) {
      throw new Error(`Erro no disparo por seleção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Agenda disparo para data específica
   */
  async agendarDisparo(agendamento: AgendamentoDisparo): Promise<void> {
    try {
      // Registrar agendamentos no histórico
      const agendamentos: HistoricoDisparoInsert[] = agendamento.colaboradorIds.map(colaboradorId => ({
        empresa_id: agendamento.empresaId,
        colaborador_id: colaboradorId,
        template_id: agendamento.templateId,
        status: 'agendado',
        data_agendamento: agendamento.dataAgendamento.toISOString(),
        erro_detalhes: agendamento.observacoes
      }));

      const { error } = await supabase
        .from('historico_disparos')
        .insert(agendamentos);

      if (error) {
        throw new Error(`Erro ao agendar disparo: ${error.message}`);
      }

      // Atualizar controle mensal se necessário
      const mes = agendamento.dataAgendamento.getMonth() + 1;
      const ano = agendamento.dataAgendamento.getFullYear();

      await this.atualizarControleMensal(
        mes, 
        ano, 
        agendamento.empresaId, 
        'agendado',
        `Agendado para ${agendamento.dataAgendamento.toLocaleDateString()}`
      );

    } catch (error) {
      throw new Error(`Erro ao agendar disparo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Obtém status mensal de todas as empresas
   */
  async obterStatusMensal(mes: number, ano: number): Promise<StatusMensal[]> {
    try {
      const { data: controles, error } = await supabase
        .from('controle_mensal')
        .select(`
          *,
          empresas_clientes(*)
        `)
        .eq('mes', mes)
        .eq('ano', ano);

      if (error) {
        throw new Error(`Erro ao buscar status mensal: ${error.message}`);
      }

      // Buscar empresas que não têm controle mensal ainda
      const { data: todasEmpresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select('*')
        .eq('status', 'ativo');

      if (empresasError) {
        throw new Error(`Erro ao buscar empresas: ${empresasError.message}`);
      }

      const statusMensal: StatusMensal[] = [];

      for (const empresa of todasEmpresas || []) {
        const controle = controles?.find(c => c.empresa_id === empresa.id);
        
        // Contar colaboradores ativos
        const { count: colaboradoresAtivos } = await supabase
          .from('colaboradores')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresa.id)
          .eq('status', 'ativo');

        // Contar e-mails enviados no mês
        const { count: emailsEnviados } = await supabase
          .from('historico_disparos')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresa.id)
          .eq('status', 'enviado')
          .gte('data_disparo', `${ano}-${mes.toString().padStart(2, '0')}-01`)
          .lt('data_disparo', `${ano}-${(mes + 1).toString().padStart(2, '0')}-01`);

        statusMensal.push({
          empresaId: empresa.id,
          empresa: empresa,
          status: controle?.status as StatusControleMensal || 'pendente',
          dataProcessamento: controle?.data_processamento ? new Date(controle.data_processamento) : undefined,
          observacoes: controle?.observacoes || undefined,
          colaboradoresAtivos: colaboradoresAtivos || 0,
          emailsEnviados: emailsEnviados || 0
        });
      }

      return statusMensal;

    } catch (error) {
      throw new Error(`Erro ao obter status mensal: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Reenvia disparos que falharam
   */
  async reenviarFalhas(mes: number, ano: number): Promise<DisparoResult> {
    try {
      // Buscar controles mensais com falha
      const { data: controlesFalha, error } = await supabase
        .from('controle_mensal')
        .select(`
          *,
          empresas_clientes(*)
        `)
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('status', 'falhou');

      if (error) {
        throw new Error(`Erro ao buscar falhas: ${error.message}`);
      }

      if (!controlesFalha || controlesFalha.length === 0) {
        return {
          sucesso: 0,
          falhas: 0,
          total: 0,
          detalhes: []
        };
      }

      const detalhes: DisparoDetalhe[] = [];
      let sucessos = 0;
      let falhas = 0;

      for (const controle of controlesFalha) {
        if (!controle.empresas_clientes) continue;

        try {
          // Buscar colaboradores ativos
          const { data: colaboradores } = await supabase
            .from('colaboradores')
            .select('*')
            .eq('empresa_id', controle.empresa_id)
            .eq('status', 'ativo');

          if (!colaboradores || colaboradores.length === 0) {
            continue;
          }

          // Buscar e-mails CC
          const { data: gruposEmpresas } = await supabase
            .from('empresa_grupos')
            .select(`
              grupos_responsaveis(
                grupo_emails(email, nome)
              )
            `)
            .eq('empresa_id', controle.empresa_id);

          const emailsCC: string[] = [];
          if (gruposEmpresas) {
            gruposEmpresas.forEach(grupo => {
              if (grupo.grupos_responsaveis?.grupo_emails) {
                grupo.grupos_responsaveis.grupo_emails.forEach(email => {
                  emailsCC.push(email.email);
                });
              }
            });
          }

          if (controle.empresas_clientes.email_gestor) {
            emailsCC.push(controle.empresas_clientes.email_gestor);
          }

          let emailsEnviados = 0;

          // Reenviar para cada colaborador
          for (const colaborador of colaboradores) {
            try {
              const resultado = await this.enviarBookColaborador(
                controle.empresas_clientes,
                colaborador,
                emailsCC,
                mes,
                ano
              );

              if (resultado.sucesso) {
                emailsEnviados++;
              }

              detalhes.push({
                empresaId: controle.empresa_id!,
                colaboradorId: colaborador.id,
                status: resultado.sucesso ? 'enviado' : 'falhou',
                erro: resultado.erro,
                emailsEnviados: resultado.sucesso ? [colaborador.email, ...emailsCC] : []
              });

            } catch (error) {
              detalhes.push({
                empresaId: controle.empresa_id!,
                colaboradorId: colaborador.id,
                status: 'falhou',
                erro: error instanceof Error ? error.message : 'Erro desconhecido',
                emailsEnviados: []
              });
            }
          }

          // Atualizar status do controle
          if (emailsEnviados > 0) {
            await this.atualizarControleMensal(
              mes, 
              ano, 
              controle.empresa_id!, 
              'enviado', 
              `Reenvio: ${emailsEnviados} e-mails enviados`
            );
            sucessos++;
          } else {
            await this.atualizarControleMensal(
              mes, 
              ano, 
              controle.empresa_id!, 
              'falhou', 
              'Reenvio: Nenhum e-mail foi enviado com sucesso'
            );
            falhas++;
          }

        } catch (error) {
          falhas++;
        }
      }

      return {
        sucesso: sucessos,
        falhas: falhas,
        total: controlesFalha.length,
        detalhes
      };

    } catch (error) {
      throw new Error(`Erro ao reenviar falhas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca histórico de disparos com filtros
   */
  async buscarHistorico(filtros: HistoricoFiltros): Promise<HistoricoDisparoCompleto[]> {
    try {
      let query = supabase
        .from('historico_disparos')
        .select(`
          *,
          empresas_clientes(*),
          colaboradores(*)
        `);

      // Aplicar filtros
      if (filtros.empresaId) {
        query = query.eq('empresa_id', filtros.empresaId);
      }

      if (filtros.colaboradorId) {
        query = query.eq('colaborador_id', filtros.colaboradorId);
      }

      if (filtros.status && filtros.status.length > 0) {
        query = query.in('status', filtros.status);
      }

      if (filtros.dataInicio) {
        query = query.gte('data_disparo', filtros.dataInicio.toISOString());
      }

      if (filtros.dataFim) {
        query = query.lte('data_disparo', filtros.dataFim.toISOString());
      }

      // Filtro por mês/ano
      if (filtros.mes && filtros.ano) {
        const dataInicio = new Date(filtros.ano, filtros.mes - 1, 1);
        const dataFim = new Date(filtros.ano, filtros.mes, 0, 23, 59, 59);
        query = query.gte('data_disparo', dataInicio.toISOString())
                    .lte('data_disparo', dataFim.toISOString());
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      throw new Error(`Erro ao buscar histórico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca controles mensais com filtros
   */
  async buscarControlesMensais(filtros: ControleMensalFiltros): Promise<ControleMensalCompleto[]> {
    try {
      let query = supabase
        .from('controle_mensal')
        .select(`
          *,
          empresas_clientes(*)
        `);

      if (filtros.mes) {
        query = query.eq('mes', filtros.mes);
      }

      if (filtros.ano) {
        query = query.eq('ano', filtros.ano);
      }

      if (filtros.status && filtros.status.length > 0) {
        query = query.in('status', filtros.status);
      }

      if (filtros.empresaIds && filtros.empresaIds.length > 0) {
        query = query.in('empresa_id', filtros.empresaIds);
      }

      query = query.order('ano', { ascending: false })
                  .order('mes', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar controles mensais: ${error.message}`);
      }

      return (data?.filter(item => item.empresas_clientes) as unknown) as ControleMensalCompleto[] || [];

    } catch (error) {
      throw new Error(`Erro ao buscar controles mensais: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // ...

  private async enviarBookColaborador(
    empresa: EmpresaCliente,
    colaborador: Colaborador,
    emailsCC: string[],
    mes: number,
    ano: number
  ): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      // Buscar template apropriado para books
      const template = await clientBooksTemplateService.buscarTemplateBooks((empresa as any).template_padrao as ('portugues' | 'ingles') ?? 'portugues');
      
      if (!template) {
        return {
          sucesso: false,
          erro: 'Template de e-mail não encontrado para books'
        };
      }

      // Validar template antes do processamento
      const validacao = clientBooksTemplateService.validarTemplate(template, empresa as any, colaborador as any);
      
      if (!validacao.valido) {
        console.warn('Template possui variáveis não encontradas:', validacao.variaveisNaoEncontradas);
        // Continuar mesmo com avisos, mas registrar no log
      }

      // Processar template com dados reais
      const templateProcessado = await clientBooksTemplateService.processarTemplate(
        template,
        empresa as any,
        colaborador as any,
        { mes, ano, dataDisparo: new Date() }
      );

      // Enviar e-mail usando o emailService
      const resultadoEnvio = await this.enviarEmailComTemplate(
        colaborador.email,
        emailsCC,
        templateProcessado.assunto,
        templateProcessado.corpo,
        empresa,
        colaborador
      );

      // Registrar no histórico
      const historicoData: HistoricoDisparoInsert = {
        empresa_id: empresa.id,
        colaborador_id: colaborador.id,
        template_id: template.id,
        status: resultadoEnvio.sucesso ? 'enviado' : 'falhou',
        data_disparo: new Date().toISOString(),
        assunto: templateProcessado.assunto,
        emails_cc: emailsCC,
        erro_detalhes: resultadoEnvio.erro
      };

      await supabase.from('historico_disparos').insert(historicoData);

      return resultadoEnvio;

    } catch (error) {
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  private async enviarEmailComTemplate(
    destinatario: string,
    emailsCC: string[],
    assunto: string,
    corpo: string,
    empresa: EmpresaCliente,
    colaborador: Colaborador
  ): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      // Preparar dados para o emailService
      const emailData = {
        to: destinatario,
        cc: emailsCC.length > 0 ? emailsCC : undefined,
        subject: assunto,
        html: corpo,
        // Adicionar metadados para rastreamento
        metadata: {
          empresaId: empresa.id,
          colaboradorId: colaborador.id,
          tipo: 'book_mensal',
          nomeEmpresa: empresa.nome_completo,
          nomeColaborador: colaborador.nome_completo
        }
      };

      // Enviar usando o emailService
      const resultado = await emailService.sendEmail(emailData);

      if (resultado.success) {
        return { sucesso: true };
      } else {
        return {
          sucesso: false,
          erro: resultado.error || 'Falha no envio do e-mail'
        };
      }

    } catch (error) {
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido no envio'
      };
    }
  }

  private async atualizarControleMensal(
    mes: number,
    ano: number,
    empresaId: string,
    status: StatusControleMensal,
    observacoes?: string
  ): Promise<void> {
    const controleData: ControleMensalInsert = {
      mes,
      ano,
      empresa_id: empresaId,
      status,
      data_processamento: new Date().toISOString(),
      observacoes
    };

    const { error } = await supabase
      .from('controle_mensal')
      .upsert(controleData, {
        onConflict: 'mes,ano,empresa_id'
      });

    if (error) {
      console.error('Erro ao atualizar controle mensal:', error);
    }
  }

  private async registrarFalhaControle(
    mes: number,
    ano: number,
    empresaId: string,
    erro: string
  ): Promise<void> {
    await this.atualizarControleMensal(mes, ano, empresaId, 'falhou', erro);
  }
}

export const booksDisparoService = new BooksDisparoService();