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
  Cliente,
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
      // Buscar empresas ativas que têm AMS E são do tipo Qualidade E não têm book personalizado
      const { data: empresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select(`
          *,
          clientes!inner(*)
        `)
        .eq('status', 'ativo')
        .eq('clientes.status', 'ativo')
        .eq('tem_ams', true)
        .eq('tipo_book', 'qualidade')
        .eq('book_personalizado', false);

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

          // Buscar clientes ativos da empresa
          const { data: clientes, error: clientesError } = await supabase
            .from('clientes')
            .select('*')
            .eq('empresa_id', empresa.id)
            .eq('status', 'ativo');

          if (clientesError || !clientes || clientes.length === 0) {
            await this.registrarFalhaControle(mes, ano, empresa.id, 'Nenhum cliente ativo encontrado');
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

          // Processar empresa com e-mail consolidado
          try {
            const resultadoDisparo = await this.enviarBookEmpresa(
              empresa,
              clientes,
              emailsCC,
              mes,
              ano
            );

            if (resultadoDisparo.sucesso) {
              // Registrar sucesso para todos os clientes da empresa
              clientes.forEach(cliente => {
                detalhes.push({
                  empresaId: empresa.id,
                  clienteId: cliente.id,
                  status: 'enviado',
                  erro: undefined,
                  emailsEnviados: [cliente.email, ...emailsCC]
                });
              });

              await this.atualizarControleMensal(mes, ano, empresa.id, 'enviado', `E-mail consolidado enviado para ${clientes.length} clientes`);
              sucessos++;
            } else {
              // Registrar falha para todos os clientes da empresa
              clientes.forEach(cliente => {
                detalhes.push({
                  empresaId: empresa.id,
                  clienteId: cliente.id,
                  status: 'falhou',
                  erro: resultadoDisparo.erro,
                  emailsEnviados: []
                });
              });

              await this.atualizarControleMensal(mes, ano, empresa.id, 'falhou', `Falha no envio consolidado: ${resultadoDisparo.erro}`);
              falhas++;
            }

          } catch (error) {
            // Registrar erro para todos os clientes da empresa
            clientes.forEach(cliente => {
              detalhes.push({
                empresaId: empresa.id,
                clienteId: cliente.id,
                status: 'falhou',
                erro: error instanceof Error ? error.message : 'Erro desconhecido',
                emailsEnviados: []
              });
            });

            await this.atualizarControleMensal(mes, ano, empresa.id, 'falhou', `Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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

      // Buscar empresas selecionadas e ativas que têm AMS E são do tipo Qualidade E não têm book personalizado
      const { data: empresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select(`
          *,
          clientes!inner(*)
        `)
        .in('id', empresaIds)
        .eq('status', 'ativo')
        .eq('clientes.status', 'ativo')
        .eq('tem_ams', true)
        .eq('tipo_book', 'qualidade')
        .eq('book_personalizado', false);

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

          // Buscar clientes ativos
          const { data: clientes, error: clientesError } = await supabase
            .from('clientes')
            .select('*')
            .eq('empresa_id', empresa.id)
            .eq('status', 'ativo');

          if (clientesError || !clientes || clientes.length === 0) {
            await this.registrarFalhaControle(mes, ano, empresa.id, 'Nenhum cliente ativo encontrado');
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

          // Processar empresa com e-mail consolidado
          try {
            const resultadoDisparo = await this.enviarBookEmpresa(
              empresa,
              clientes,
              emailsCC,
              mes,
              ano
            );

            if (resultadoDisparo.sucesso) {
              // Registrar sucesso para todos os clientes da empresa
              clientes.forEach(cliente => {
                detalhes.push({
                  empresaId: empresa.id,
                  clienteId: cliente.id,
                  status: 'enviado',
                  erro: undefined,
                  emailsEnviados: [cliente.email, ...emailsCC]
                });
              });

              await this.atualizarControleMensal(
                mes,
                ano,
                empresa.id,
                'enviado',
                forceResend ? `Reenvio manual: E-mail consolidado para ${clientes.length} clientes` : `E-mail consolidado enviado para ${clientes.length} clientes`
              );
              sucessos++;
            } else {
              // Registrar falha para todos os clientes da empresa
              clientes.forEach(cliente => {
                detalhes.push({
                  empresaId: empresa.id,
                  clienteId: cliente.id,
                  status: 'falhou',
                  erro: resultadoDisparo.erro,
                  emailsEnviados: []
                });
              });

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
            // Registrar erro para todos os clientes da empresa
            clientes.forEach(cliente => {
              detalhes.push({
                empresaId: empresa.id,
                clienteId: cliente.id,
                status: 'falhou',
                erro: error instanceof Error ? error.message : 'Erro desconhecido',
                emailsEnviados: []
              });
            });

            await this.atualizarControleMensal(
              mes,
              ano,
              empresa.id,
              'falhou',
              forceResend ? `Reenvio manual: Erro no processamento - ${error instanceof Error ? error.message : 'Erro desconhecido'}` : `Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
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
      const agendamentos: HistoricoDisparoInsert[] = agendamento.clienteIds.map(clienteId => ({
        empresa_id: agendamento.empresaId,
        cliente_id: clienteId,
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
   * Obtém status mensal de empresas com books personalizados
   */
  async obterStatusMensalPersonalizados(mes: number, ano: number): Promise<StatusMensal[]> {
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

      // Buscar empresas que não têm controle mensal ainda (apenas com book personalizado)
      const { data: todasEmpresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select('*')
        .eq('status', 'ativo')
        .eq('book_personalizado', true);

      if (empresasError) {
        throw new Error(`Erro ao buscar empresas: ${empresasError.message}`);
      }

      const statusMensal: StatusMensal[] = [];

      for (const empresa of todasEmpresas || []) {
        const controle = controles?.find(c => c.empresa_id === empresa.id);

        // Contar clientes ativos
        const { count: clientesAtivos } = await supabase
          .from('clientes')
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
          clientesAtivos: clientesAtivos || 0,
          emailsEnviados: emailsEnviados || 0
        });
      }

      return statusMensal;

    } catch (error) {
      throw new Error(`Erro ao obter status mensal personalizado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Dispara books mensais para empresas com books personalizados
   */
  async dispararBooksPersonalizados(mes: number, ano: number): Promise<DisparoResult> {
    try {
      // Buscar empresas ativas com book personalizado
      const { data: empresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select(`
          *,
          clientes!inner(*)
        `)
        .eq('status', 'ativo')
        .eq('clientes.status', 'ativo')
        .eq('book_personalizado', true);

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

          // Buscar clientes ativos da empresa
          const { data: clientes, error: clientesError } = await supabase
            .from('clientes')
            .select('*')
            .eq('empresa_id', empresa.id)
            .eq('status', 'ativo');

          if (clientesError || !clientes || clientes.length === 0) {
            await this.registrarFalhaControle(mes, ano, empresa.id, 'Nenhum cliente ativo encontrado');
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

          // Processar empresa com e-mail consolidado
          try {
            const resultadoDisparo = await this.enviarBookEmpresa(
              empresa,
              clientes,
              emailsCC,
              mes,
              ano
            );

            if (resultadoDisparo.sucesso) {
              // Registrar sucesso para todos os clientes da empresa
              clientes.forEach(cliente => {
                detalhes.push({
                  empresaId: empresa.id,
                  clienteId: cliente.id,
                  status: 'enviado',
                  erro: undefined,
                  emailsEnviados: [cliente.email, ...emailsCC]
                });
              });

              await this.atualizarControleMensal(mes, ano, empresa.id, 'enviado', `E-mail consolidado enviado para ${clientes.length} clientes (personalizado)`);
              sucessos++;
            } else {
              // Registrar falha para todos os clientes da empresa
              clientes.forEach(cliente => {
                detalhes.push({
                  empresaId: empresa.id,
                  clienteId: cliente.id,
                  status: 'falhou',
                  erro: resultadoDisparo.erro,
                  emailsEnviados: []
                });
              });

              await this.atualizarControleMensal(mes, ano, empresa.id, 'falhou', `Falha no envio consolidado (personalizado): ${resultadoDisparo.erro}`);
              falhas++;
            }

          } catch (error) {
            // Registrar erro para todos os clientes da empresa
            clientes.forEach(cliente => {
              detalhes.push({
                empresaId: empresa.id,
                clienteId: cliente.id,
                status: 'falhou',
                erro: error instanceof Error ? error.message : 'Erro desconhecido',
                emailsEnviados: []
              });
            });

            await this.atualizarControleMensal(mes, ano, empresa.id, 'falhou', `Erro no processamento (personalizado): ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
      throw new Error(`Erro no disparo personalizado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Dispara books para empresas personalizadas selecionadas
   */
  async dispararEmpresasPersonalizadasSelecionadas(
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

      // Buscar empresas selecionadas e ativas com book personalizado
      const { data: empresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select(`
          *,
          clientes!inner(*)
        `)
        .in('id', empresaIds)
        .eq('status', 'ativo')
        .eq('clientes.status', 'ativo')
        .eq('book_personalizado', true);

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

          // Buscar clientes ativos
          const { data: clientes, error: clientesError } = await supabase
            .from('clientes')
            .select('*')
            .eq('empresa_id', empresa.id)
            .eq('status', 'ativo');

          if (clientesError || !clientes || clientes.length === 0) {
            await this.registrarFalhaControle(mes, ano, empresa.id, 'Nenhum cliente ativo encontrado');
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

          // Processar empresa com e-mail consolidado
          try {
            const resultadoDisparo = await this.enviarBookEmpresa(
              empresa,
              clientes,
              emailsCC,
              mes,
              ano
            );

            if (resultadoDisparo.sucesso) {
              // Registrar sucesso para todos os clientes da empresa
              clientes.forEach(cliente => {
                detalhes.push({
                  empresaId: empresa.id,
                  clienteId: cliente.id,
                  status: 'enviado',
                  erro: undefined,
                  emailsEnviados: [cliente.email, ...emailsCC]
                });
              });

              await this.atualizarControleMensal(
                mes,
                ano,
                empresa.id,
                'enviado',
                forceResend ? `Reenvio manual personalizado: E-mail consolidado para ${clientes.length} clientes` : `E-mail consolidado enviado para ${clientes.length} clientes (personalizado)`
              );
              sucessos++;
            } else {
              // Registrar falha para todos os clientes da empresa
              clientes.forEach(cliente => {
                detalhes.push({
                  empresaId: empresa.id,
                  clienteId: cliente.id,
                  status: 'falhou',
                  erro: resultadoDisparo.erro,
                  emailsEnviados: []
                });
              });

              await this.atualizarControleMensal(
                mes,
                ano,
                empresa.id,
                'falhou',
                forceResend ? `Reenvio manual personalizado: Falha no envio consolidado - ${resultadoDisparo.erro}` : `Falha no envio consolidado (personalizado): ${resultadoDisparo.erro}`
              );
              falhas++;
            }

          } catch (error) {
            // Registrar erro para todos os clientes da empresa
            clientes.forEach(cliente => {
              detalhes.push({
                empresaId: empresa.id,
                clienteId: cliente.id,
                status: 'falhou',
                erro: error instanceof Error ? error.message : 'Erro desconhecido',
                emailsEnviados: []
              });
            });

            await this.atualizarControleMensal(
              mes,
              ano,
              empresa.id,
              'falhou',
              forceResend ? `Reenvio manual personalizado: Erro no processamento - ${error instanceof Error ? error.message : 'Erro desconhecido'}` : `Erro no processamento (personalizado): ${error instanceof Error ? error.message : 'Erro desconhecido'}`
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
      throw new Error(`Erro no disparo personalizado por seleção: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Reenvia disparos personalizados que falharam
   */
  async reenviarFalhasPersonalizadas(mes: number, ano: number): Promise<DisparoResult> {
    try {
      // Buscar controles mensais com falha para empresas com book personalizado
      const { data: controlesFalha, error } = await supabase
        .from('controle_mensal')
        .select(`
          *,
          empresas_clientes!inner(*)
        `)
        .eq('mes', mes)
        .eq('ano', ano)
        .eq('status', 'falhou')
        .eq('empresas_clientes.book_personalizado', true);

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

        // Declarar clientes fora do try para estar disponível no catch
        let clientes: any[] = [];

        try {
          // Buscar clientes ativos
          const { data: clientesData } = await supabase
            .from('clientes')
            .select('*')
            .eq('empresa_id', controle.empresa_id)
            .eq('status', 'ativo');

          clientes = clientesData || [];

          if (clientes.length === 0) {
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

          // Reenviar com e-mail consolidado
          try {
            const resultado = await this.enviarBookEmpresa(
              controle.empresas_clientes,
              clientes,
              emailsCC,
              mes,
              ano
            );

            if (resultado.sucesso) {
              // Registrar sucesso para todos os clientes da empresa
              clientes.forEach(cliente => {
                detalhes.push({
                  empresaId: controle.empresa_id!,
                  clienteId: cliente.id,
                  status: 'enviado',
                  erro: undefined,
                  emailsEnviados: [cliente.email, ...emailsCC]
                });
              });

              await this.atualizarControleMensal(
                mes,
                ano,
                controle.empresa_id!,
                'enviado',
                `Reenvio personalizado: E-mail consolidado para ${clientes.length} clientes`
              );
              sucessos++;
            } else {
              // Registrar falha para todos os clientes da empresa
              clientes.forEach(cliente => {
                detalhes.push({
                  empresaId: controle.empresa_id!,
                  clienteId: cliente.id,
                  status: 'falhou',
                  erro: resultado.erro,
                  emailsEnviados: []
                });
              });

              await this.atualizarControleMensal(
                mes,
                ano,
                controle.empresa_id!,
                'falhou',
                `Reenvio personalizado: Falha no envio consolidado - ${resultado.erro}`
              );
              falhas++;
            }

          } catch (error) {
            // Registrar erro interno para todos os clientes da empresa
            clientes.forEach(cliente => {
              detalhes.push({
                empresaId: controle.empresa_id!,
                clienteId: cliente.id,
                status: 'falhou',
                erro: error instanceof Error ? error.message : 'Erro desconhecido',
                emailsEnviados: []
              });
            });

            await this.atualizarControleMensal(
              mes,
              ano,
              controle.empresa_id!,
              'falhou',
              `Reenvio personalizado: Erro interno - ${error instanceof Error ? error.message : 'Erro desconhecido'}`
            );
            falhas++;
          }

        } catch (error) {
          // Registrar erro para todos os clientes da empresa (agora clientes está no escopo)
          clientes.forEach(cliente => {
            detalhes.push({
              empresaId: controle.empresa_id!,
              clienteId: cliente.id,
              status: 'falhou',
              erro: error instanceof Error ? error.message : 'Erro desconhecido',
              emailsEnviados: []
            });
          });

          await this.atualizarControleMensal(
            mes,
            ano,
            controle.empresa_id!,
            'falhou',
            `Reenvio personalizado: Erro no processamento - ${error instanceof Error ? error.message : 'Erro desconhecido'}`
          );
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
      throw new Error(`Erro ao reenviar falhas personalizadas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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

      // Buscar empresas que não têm controle mensal ainda (apenas com AMS E tipo Qualidade E sem book personalizado)
      const { data: todasEmpresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select('*')
        .eq('status', 'ativo')
        .eq('tem_ams', true)
        .eq('tipo_book', 'qualidade')
        .eq('book_personalizado', false);

      if (empresasError) {
        throw new Error(`Erro ao buscar empresas: ${empresasError.message}`);
      }

      const statusMensal: StatusMensal[] = [];

      for (const empresa of todasEmpresas || []) {
        const controle = controles?.find(c => c.empresa_id === empresa.id);

        // Contar clientes ativos
        const { count: clientesAtivos } = await supabase
          .from('clientes')
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
          clientesAtivos: clientesAtivos || 0,
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
          // Buscar clientes ativos
          const { data: clientes } = await supabase
            .from('clientes')
            .select('*')
            .eq('empresa_id', controle.empresa_id)
            .eq('status', 'ativo');

          if (!clientes || clientes.length === 0) {
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

          // Reenviar com e-mail consolidado
          try {
            const resultado = await this.enviarBookEmpresa(
              controle.empresas_clientes,
              clientes,
              emailsCC,
              mes,
              ano
            );

            if (resultado.sucesso) {
              // Registrar sucesso para todos os clientes da empresa
              clientes.forEach(cliente => {
                detalhes.push({
                  empresaId: controle.empresa_id!,
                  clienteId: cliente.id,
                  status: 'enviado',
                  erro: undefined,
                  emailsEnviados: [cliente.email, ...emailsCC]
                });
              });

              sucessos++;
            } else {
              // Registrar falha para todos os clientes da empresa
              clientes.forEach(cliente => {
                detalhes.push({
                  empresaId: controle.empresa_id!,
                  clienteId: cliente.id,
                  status: 'falhou',
                  erro: resultado.erro,
                  emailsEnviados: []
                });
              });

              await this.atualizarControleMensal(
                mes,
                ano,
                controle.empresa_id!,
                'falhou',
                `Reenvio: Falha no envio consolidado - ${resultado.erro}`
              );
              falhas++;
            }

          } catch (error) {
            // Registrar erro interno para todos os clientes da empresa
            clientes.forEach(cliente => {
              detalhes.push({
                empresaId: controle.empresa_id!,
                clienteId: cliente.id,
                status: 'falhou',
                erro: error instanceof Error ? error.message : 'Erro desconhecido',
                emailsEnviados: []
              });
            });

            await this.atualizarControleMensal(
              mes,
              ano,
              controle.empresa_id!,
              'falhou',
              `Reenvio: Erro interno - ${error instanceof Error ? error.message : 'Erro desconhecido'}`
            );
            falhas++;
          }

        } catch (error) {
          // Registrar erro do loop principal para todos os clientes da empresa
          const { data: clientes } = await supabase
            .from('clientes')
            .select('*')
            .eq('empresa_id', controle.empresa_id)
            .eq('status', 'ativo');

          if (clientes) {
            clientes.forEach(cliente => {
              detalhes.push({
                empresaId: controle.empresa_id!,
                clienteId: cliente.id,
                status: 'falhou',
                erro: error instanceof Error ? error.message : 'Erro desconhecido',
                emailsEnviados: []
              });
            });
          }

          await this.atualizarControleMensal(
            mes,
            ano,
            controle.empresa_id!,
            'falhou',
            `Reenvio: Erro no processamento - ${error instanceof Error ? error.message : 'Erro desconhecido'}`
          );
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
          clientes(*)
        `);

      // Aplicar filtros
      if (filtros.empresaId) {
        query = query.eq('empresa_id', filtros.empresaId);
      }

      if (filtros.clienteId) {
        query = query.eq('cliente_id', filtros.clienteId);
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

  private async enviarBookEmpresa(
    empresa: EmpresaCliente,
    clientes: Cliente[],
    emailsCC: string[],
    mes: number,
    ano: number
  ): Promise<{ sucesso: boolean; erro?: string; clientesProcessados: string[] }> {
    try {
      if (clientes.length === 0) {
        return {
          sucesso: false,
          erro: 'Nenhum cliente ativo encontrado para a empresa',
          clientesProcessados: []
        };
      }

      // Debug: verificar template_padrao da empresa
      const templatePadrao = (empresa as any).template_padrao as ('portugues' | 'ingles') ?? 'portugues';
      console.log(`🏢 Empresa: ${empresa.nome_completo}`);
      console.log(`🌐 Template padrão configurado: ${templatePadrao}`);
      console.log(`📧 Enviando para ${clientes.length} clientes em um único e-mail`);

      // Buscar template apropriado para books
      const template = await clientBooksTemplateService.buscarTemplateBooks(templatePadrao);

      if (!template) {
        return {
          sucesso: false,
          erro: 'Template de e-mail não encontrado para books',
          clientesProcessados: []
        };
      }

      // Usar o primeiro cliente como referência para o template (todos da mesma empresa)
      const clienteReferencia = clientes[0];

      // Validar template antes do processamento
      const validacao = clientBooksTemplateService.validarTemplate(template, empresa as any, clienteReferencia as any);

      if (!validacao.valido) {
        console.warn('Template possui variáveis não encontradas:', validacao.variaveisNaoEncontradas);
        // Continuar mesmo com avisos, mas registrar no log
      }

      // Processar template com dados reais
      const templateProcessado = await clientBooksTemplateService.processarTemplate(
        template,
        empresa as any,
        clienteReferencia as any,
        { mes, ano, dataDisparo: new Date() }
      );

      // Coletar todos os e-mails dos clientes para o campo "Para"
      const emailsClientes = clientes.map(cliente => cliente.email).filter(email => email);

      if (emailsClientes.length === 0) {
        return {
          sucesso: false,
          erro: 'Nenhum cliente possui e-mail válido',
          clientesProcessados: []
        };
      }

      // Enviar e-mail consolidado usando o emailService
      const resultadoEnvio = await this.enviarEmailConsolidado(
        emailsClientes,
        emailsCC,
        templateProcessado.assunto,
        templateProcessado.corpo,
        empresa,
        clientes
      );

      if (resultadoEnvio.sucesso) {
        // Registrar no histórico - um registro por empresa com múltiplos clientes
        const historicoData: HistoricoDisparoInsert = {
          empresa_id: empresa.id,
          cliente_id: clienteReferencia.id, // Cliente de referência
          template_id: template.id,
          status: 'enviado',
          data_disparo: new Date().toISOString(),
          assunto: templateProcessado.assunto,
          emails_cc: emailsCC,
          erro_detalhes: `E-mail consolidado enviado para ${emailsClientes.length} clientes: ${emailsClientes.join(', ')}`
        };

        await supabase.from('historico_disparos').insert(historicoData);

        return {
          sucesso: true,
          clientesProcessados: clientes.map(c => c.id)
        };
      } else {
        return {
          sucesso: false,
          erro: resultadoEnvio.erro,
          clientesProcessados: []
        };
      }

    } catch (error) {
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        clientesProcessados: []
      };
    }
  }

  private async enviarBookCliente(
    empresa: EmpresaCliente,
    cliente: Cliente,
    emailsCC: string[],
    mes: number,
    ano: number
  ): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      // Debug: verificar template_padrao da empresa
      const templatePadrao = (empresa as any).template_padrao as ('portugues' | 'ingles') ?? 'portugues';
      console.log(`🏢 Empresa: ${empresa.nome_completo}`);
      console.log(`🌐 Template padrão configurado: ${templatePadrao}`);
      console.log(`📧 Enviando para: ${cliente.email}`);

      // Buscar template apropriado para books
      const template = await clientBooksTemplateService.buscarTemplateBooks(templatePadrao);

      if (!template) {
        return {
          sucesso: false,
          erro: 'Template de e-mail não encontrado para books'
        };
      }

      // Validar template antes do processamento
      const validacao = clientBooksTemplateService.validarTemplate(template, empresa as any, cliente as any);

      if (!validacao.valido) {
        console.warn('Template possui variáveis não encontradas:', validacao.variaveisNaoEncontradas);
        // Continuar mesmo com avisos, mas registrar no log
      }

      // Processar template com dados reais
      const templateProcessado = await clientBooksTemplateService.processarTemplate(
        template,
        empresa as any,
        cliente as any,
        { mes, ano, dataDisparo: new Date() }
      );

      // Enviar e-mail usando o emailService
      const resultadoEnvio = await this.enviarEmailComTemplate(
        cliente.email,
        emailsCC,
        templateProcessado.assunto,
        templateProcessado.corpo,
        empresa,
        cliente
      );

      // Registrar no histórico
      const historicoData: HistoricoDisparoInsert = {
        empresa_id: empresa.id,
        cliente_id: cliente.id,
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

  private async enviarEmailConsolidado(
    destinatarios: string[],
    emailsCC: string[],
    assunto: string,
    corpo: string,
    empresa: EmpresaCliente,
    clientes: Cliente[]
  ): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      // Preparar dados para o emailService - todos os destinatários no campo "to"
      const emailData = {
        to: destinatarios, // ✅ CORREÇÃO: Array de destinatários no campo "to"
        cc: emailsCC.length > 0 ? emailsCC : [], // ✅ CORREÇÃO: Apenas CC no campo "cc"
        subject: assunto,
        html: corpo
      };

      // Enviar e-mail usando o método padrão
      const resultado = await emailService.sendEmail(emailData);

      if (resultado.success) {
        return { sucesso: true };
      } else {
        return {
          sucesso: false,
          erro: resultado.error || 'Falha no envio do e-mail consolidado'
        };
      }

    } catch (error) {
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido no envio consolidado'
      };
    }
  }

  private async enviarEmailComTemplate(
    destinatario: string,
    emailsCC: string[],
    assunto: string,
    corpo: string,
    empresa: EmpresaCliente,
    cliente: Cliente
  ): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      // Preparar dados para o emailService
      const emailData = {
        to: destinatario,
        cc: emailsCC.length > 0 ? emailsCC : undefined,
        subject: assunto,
        html: corpo
      };

      // Enviar e-mail usando o método padrão
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