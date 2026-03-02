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
  ControleMensalCompleto,
  AnexoWebhookData,
  AnexosSummaryWebhook,
  DisparoComAnexos
} from '@/types/clientBooks';
import { emailService } from './emailService';
import { clientBooksTemplateService } from './clientBooksTemplateService';
import { anexoService } from './anexoService';

class BooksDisparoService {
  /**
   * Dispara books mensais para todas as empresas ativas
   */
  async dispararBooksMensal(mes: number, ano: number): Promise<DisparoResult> {
    try {
      // Calcular período de referência (mês anterior ao mês de disparo)
      const mesReferencia = mes === 1 ? 12 : mes - 1;
      const anoReferencia = mes === 1 ? ano - 1 : ano;
      
      // Obter o último dia válido do mês de referência
      const ultimoDiaMes = new Date(anoReferencia, mesReferencia, 0).getDate();
      const dataReferenciaFim = `${anoReferencia}-${mesReferencia.toString().padStart(2, '0')}-${ultimoDiaMes.toString().padStart(2, '0')}`;

      // Buscar empresas ativas que têm AMS E são do tipo Qualidade E não têm book personalizado
      // E que tenham vigência inicial <= período de referência
      const { data: empresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select('*')
        .eq('status', 'ativo')
        .eq('tem_ams', true)
        .eq('tipo_book', 'qualidade')
        .eq('book_personalizado', false)
        .lte('vigencia_inicial', dataReferenciaFim);

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

      // Filtrar empresas que têm pelo menos um cliente ativo
      const empresasComClientes: EmpresaCliente[] = [];
      for (const empresa of empresas) {
        const { data: clientesAtivos, error: clientesError } = await supabase
          .from('clientes')
          .select('id')
          .eq('empresa_id', empresa.id)
          .eq('status', 'ativo')
          .limit(1);

        if (!clientesError && clientesAtivos && clientesAtivos.length > 0) {
          empresasComClientes.push(empresa);
        }
      }

      if (empresasComClientes.length === 0) {
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
      for (const empresa of empresasComClientes) {
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

      // Calcular período de referência (mês anterior ao mês de disparo)
      const mesReferencia = mes === 1 ? 12 : mes - 1;
      const anoReferencia = mes === 1 ? ano - 1 : ano;
      
      // Obter o último dia válido do mês de referência
      const ultimoDiaMes = new Date(anoReferencia, mesReferencia, 0).getDate();
      const dataReferenciaFim = `${anoReferencia}-${mesReferencia.toString().padStart(2, '0')}-${ultimoDiaMes.toString().padStart(2, '0')}`;

      // Buscar empresas selecionadas e ativas que têm AMS E são do tipo Qualidade E não têm book personalizado
      // E que tenham vigência inicial <= período de referência
      const { data: empresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select('*')
        .in('id', empresaIds)
        .eq('status', 'ativo')
        .eq('tem_ams', true)
        .eq('tipo_book', 'qualidade')
        .eq('book_personalizado', false)
        .lte('vigencia_inicial', dataReferenciaFim);

      if (empresasError) {
        throw new Error(`Erro ao buscar empresas: ${empresasError.message}`);
      }

      if (!empresas || empresas.length === 0) {
        return { sucesso: 0, falhas: 0, total: 0, detalhes: [] };
      }

      // Filtrar empresas que têm pelo menos um cliente ativo
      const empresasComClientes: EmpresaCliente[] = [];
      for (const empresa of empresas) {
        const { data: clientesAtivos, error: clientesError } = await supabase
          .from('clientes')
          .select('id')
          .eq('empresa_id', empresa.id)
          .eq('status', 'ativo')
          .limit(1);

        if (!clientesError && clientesAtivos && clientesAtivos.length > 0) {
          empresasComClientes.push(empresa);
        }
      }

      if (empresasComClientes.length === 0) {
        return { sucesso: 0, falhas: 0, total: 0, detalhes: [] };
      }

      const detalhes: DisparoDetalhe[] = [];
      let sucessos = 0;
      let falhas = 0;

      for (const empresa of empresasComClientes) {
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
      // Consulta otimizada única com JOINs para evitar N+1 queries
      const dataInicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
      
      // Calcular próximo mês corretamente (lidar com dezembro -> janeiro)
      const proximoMes = mes === 12 ? 1 : mes + 1;
      const proximoAno = mes === 12 ? ano + 1 : ano;
      const dataFim = `${proximoAno}-${proximoMes.toString().padStart(2, '0')}-01`;

      // Buscar empresas com book personalizado
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select(`
          *,
          controle_mensal!left(
            status,
            data_processamento,
            observacoes
          )
        `)
        .eq('status', 'ativo')
        .eq('book_personalizado', true)
        .eq('controle_mensal.mes', mes)
        .eq('controle_mensal.ano', ano)
        .order('nome_abreviado');

      if (empresasError) {
        throw new Error(`Erro ao buscar empresas: ${empresasError.message}`);
      }

      if (!empresasData || empresasData.length === 0) {
        return [];
      }

      // Buscar clientes ativos para cada empresa
      const empresasIds = empresasData.map(e => e.id);
      
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, empresa_id')
        .in('empresa_id', empresasIds)
        .eq('status', 'ativo');

      // Buscar histórico de disparos no período
      const { data: historicosData } = await supabase
        .from('historico_disparos')
        .select('id, empresa_id')
        .in('empresa_id', empresasIds)
        .eq('status', 'enviado')
        .gte('data_disparo', dataInicio)
        .lt('data_disparo', dataFim);

      // Processar resultados agrupando por empresa
      const empresasMap = new Map<string, any>();

      for (const row of empresasData) {
        const empresaId = row.id;

        empresasMap.set(empresaId, {
          empresa: {
            id: row.id,
            nome_completo: row.nome_completo,
            nome_abreviado: row.nome_abreviado,
            status: row.status,
            tem_ams: row.tem_ams,
            tipo_book: row.tipo_book,
            book_personalizado: row.book_personalizado,
            anexo: row.anexo,
            template_padrao: row.template_padrao,
            link_sharepoint: row.link_sharepoint,
            email_gestor: row.email_gestor,
            data_status: row.data_status,
            descricao_status: row.descricao_status,
            vigencia_inicial: row.vigencia_inicial,
            vigencia_final: row.vigencia_final,
            created_at: row.created_at,
            updated_at: row.updated_at
          },
          controle: row.controle_mensal?.[0] || null,
          clientesAtivos: new Set(),
          emailsEnviados: new Set()
        });
      }

      // Mapear clientes por empresa
      if (clientesData) {
        for (const cliente of clientesData) {
          const empresaData = empresasMap.get(cliente.empresa_id);
          if (empresaData && cliente.id) {
            empresaData.clientesAtivos.add(cliente.id);
          }
        }
      }

      // Mapear históricos por empresa
      if (historicosData) {
        for (const historico of historicosData) {
          const empresaData = empresasMap.get(historico.empresa_id);
          if (empresaData && historico.id) {
            empresaData.emailsEnviados.add(historico.id);
          }
        }
      }

      // Converter para formato final, aplicando filtro de vigência inicial
      const mesReferencia = mes === 1 ? 12 : mes - 1;
      const anoReferencia = mes === 1 ? ano - 1 : ano;
      
      // Obter o último dia válido do mês de referência
      const ultimoDiaMes = new Date(anoReferencia, mesReferencia, 0).getDate();
      const dataReferenciaFim = new Date(`${anoReferencia}-${mesReferencia.toString().padStart(2, '0')}-${ultimoDiaMes.toString().padStart(2, '0')}`);

      const statusMensal: StatusMensal[] = Array.from(empresasMap.values())
        .filter(empresaData => {
          // Se já foi efetivamente processada (enviado, falhou, agendado), sempre incluir
          if (empresaData.controle && ['enviado', 'falhou', 'agendado'].includes(empresaData.controle.status)) {
            return true;
          }
          
          // Para empresas pendentes ou sem controle mensal, aplicar filtro de vigência inicial
          const vigenciaInicial = empresaData.empresa.vigencia_inicial ? new Date(empresaData.empresa.vigencia_inicial) : null;
          if (vigenciaInicial) {
            // A vigência inicial deve ser <= primeiro dia do mês de referência
            const dataReferenciaInicio = new Date(`${anoReferencia}-${mesReferencia.toString().padStart(2, '0')}-01`);
            return vigenciaInicial <= dataReferenciaInicio;
          }
          
          // Se não tem vigência inicial definida, incluir (comportamento padrão)
          return true;
        })
        .map(empresaData => ({
          empresaId: empresaData.empresa.id,
          empresa: empresaData.empresa,
          status: empresaData.controle?.status as StatusControleMensal || 'pendente',
          dataProcessamento: empresaData.controle?.data_processamento ? new Date(empresaData.controle.data_processamento) : undefined,
          observacoes: empresaData.controle?.observacoes || undefined,
          clientesAtivos: empresaData.clientesAtivos.size,
          emailsEnviados: empresaData.emailsEnviados.size
        }));

      // Ordenação alfabética por nome abreviado da empresa
      return statusMensal.sort((a, b) => {
        const nomeA = (a.empresa.nome_abreviado || a.empresa.nome_completo || '').toLowerCase();
        const nomeB = (b.empresa.nome_abreviado || b.empresa.nome_completo || '').toLowerCase();
        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      });

    } catch (error) {
      throw new Error(`Erro ao obter status mensal personalizado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Dispara books mensais para empresas com books personalizados
   */
  async dispararBooksPersonalizados(mes: number, ano: number): Promise<DisparoResult> {
    try {
      // Calcular período de referência (mês anterior ao mês de disparo)
      const mesReferencia = mes === 1 ? 12 : mes - 1;
      const anoReferencia = mes === 1 ? ano - 1 : ano;
      
      // Obter o último dia válido do mês de referência
      const ultimoDiaMes = new Date(anoReferencia, mesReferencia, 0).getDate();
      const dataReferenciaFim = `${anoReferencia}-${mesReferencia.toString().padStart(2, '0')}-${ultimoDiaMes.toString().padStart(2, '0')}`;

      // Buscar empresas ativas com book personalizado
      // E que tenham vigência inicial <= período de referência
      const { data: empresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select('*')
        .eq('status', 'ativo')
        .eq('book_personalizado', true)
        .lte('vigencia_inicial', dataReferenciaFim);

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

      // Filtrar empresas que têm pelo menos um cliente ativo
      const empresasComClientes: EmpresaCliente[] = [];
      for (const empresa of empresas) {
        const { data: clientesAtivos, error: clientesError } = await supabase
          .from('clientes')
          .select('id')
          .eq('empresa_id', empresa.id)
          .eq('status', 'ativo')
          .limit(1);

        if (!clientesError && clientesAtivos && clientesAtivos.length > 0) {
          empresasComClientes.push(empresa);
        }
      }

      if (empresasComClientes.length === 0) {
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
      for (const empresa of empresasComClientes) {
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

      // Calcular período de referência (mês anterior ao mês de disparo)
      const mesReferencia = mes === 1 ? 12 : mes - 1;
      const anoReferencia = mes === 1 ? ano - 1 : ano;
      
      // Obter o último dia válido do mês de referência
      const ultimoDiaMes = new Date(anoReferencia, mesReferencia, 0).getDate();
      const dataReferenciaFim = `${anoReferencia}-${mesReferencia.toString().padStart(2, '0')}-${ultimoDiaMes.toString().padStart(2, '0')}`;

      // Buscar empresas selecionadas e ativas com book personalizado
      // E que tenham vigência inicial <= período de referência
      const { data: empresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select('*')
        .in('id', empresaIds)
        .eq('status', 'ativo')
        .eq('book_personalizado', true)
        .lte('vigencia_inicial', dataReferenciaFim);

      if (empresasError) {
        throw new Error(`Erro ao buscar empresas: ${empresasError.message}`);
      }

      if (!empresas || empresas.length === 0) {
        return { sucesso: 0, falhas: 0, total: 0, detalhes: [] };
      }

      // Filtrar empresas que têm pelo menos um cliente ativo
      const empresasComClientes: EmpresaCliente[] = [];
      for (const empresa of empresas) {
        const { data: clientesAtivos, error: clientesError } = await supabase
          .from('clientes')
          .select('id')
          .eq('empresa_id', empresa.id)
          .eq('status', 'ativo')
          .limit(1);

        if (!clientesError && clientesAtivos && clientesAtivos.length > 0) {
          empresasComClientes.push(empresa);
        }
      }

      if (empresasComClientes.length === 0) {
        return { sucesso: 0, falhas: 0, total: 0, detalhes: [] };
      }

      const detalhes: DisparoDetalhe[] = [];
      let sucessos = 0;
      let falhas = 0;

      for (const empresa of empresasComClientes) {
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

              // ✅ CORREÇÃO: Registrar falha no histórico de disparos personalizados
              try {
                // Buscar template para o histórico
                const templatePadrao = (empresa as any).template_padrao as ('portugues' | 'ingles') ?? 'portugues';
                const template = await clientBooksTemplateService.buscarTemplateBooks(templatePadrao);

                if (template && clientes.length > 0) {
                  // Preparar informações sobre anexos para o histórico
                  let anexoId: string | undefined;
                  let detalhesAnexos = '';

                  try {
                    const anexos = await anexoService.obterAnexosEmpresa(empresa.id);
                    const anexosEnviando = anexos.filter(a => a.status === 'enviando');

                    if (anexosEnviando.length > 0) {
                      anexoId = anexosEnviando[0].id;
                      detalhesAnexos = ` | Anexos: ${anexosEnviando.length} arquivo(s) (falha no envio personalizado)`;
                    }
                  } catch (anexoError) {
                    console.error('Erro ao verificar anexos para histórico de falha personalizada:', anexoError);
                  }

                  // Registrar falha no histórico
                  const historicoFalhaData: HistoricoDisparoInsert = {
                    empresa_id: empresa.id,
                    cliente_id: clientes[0].id, // Cliente de referência
                    template_id: template.id,
                    status: 'falhou',
                    data_disparo: new Date().toISOString(),
                    assunto: 'Falha no disparo personalizado',
                    emails_cc: emailsCC,
                    erro_detalhes: `Falha no envio personalizado para ${clientes.length} clientes: ${resultadoDisparo.erro}${detalhesAnexos}`,
                    anexo_id: anexoId,
                    anexo_processado: false
                  };

                  await supabase.from('historico_disparos').insert(historicoFalhaData);

                  console.log(`📝 Falha personalizada registrada no histórico - Empresa: ${empresa.nome_completo}, Erro: ${resultadoDisparo.erro}`);
                }
              } catch (historicoError) {
                console.error('Erro ao registrar falha personalizada no histórico:', historicoError);
              }

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
            const erroMensagem = error instanceof Error ? error.message : 'Erro desconhecido';

            // Registrar erro para todos os clientes da empresa
            clientes.forEach(cliente => {
              detalhes.push({
                empresaId: empresa.id,
                clienteId: cliente.id,
                status: 'falhou',
                erro: erroMensagem,
                emailsEnviados: []
              });
            });

            // ✅ CORREÇÃO: Registrar exceção no histórico de disparos personalizados
            try {
              // Buscar template para o histórico
              const templatePadrao = (empresa as any).template_padrao as ('portugues' | 'ingles') ?? 'portugues';
              const template = await clientBooksTemplateService.buscarTemplateBooks(templatePadrao);

              if (template && clientes.length > 0) {
                // Preparar informações sobre anexos para o histórico
                let anexoId: string | undefined;
                let detalhesAnexos = '';

                try {
                  const anexos = await anexoService.obterAnexosEmpresa(empresa.id);
                  const anexosEnviando = anexos.filter(a => a.status === 'enviando');

                  if (anexosEnviando.length > 0) {
                    anexoId = anexosEnviando[0].id;
                    detalhesAnexos = ` | Anexos: ${anexosEnviando.length} arquivo(s) (exceção no processamento personalizado)`;
                  }
                } catch (anexoError) {
                  console.error('Erro ao verificar anexos para histórico de exceção personalizada:', anexoError);
                }

                // Registrar exceção no histórico
                const historicoExcecaoData: HistoricoDisparoInsert = {
                  empresa_id: empresa.id,
                  cliente_id: clientes[0].id, // Cliente de referência
                  template_id: template.id,
                  status: 'falhou',
                  data_disparo: new Date().toISOString(),
                  assunto: 'Exceção no disparo personalizado',
                  emails_cc: emailsCC,
                  erro_detalhes: `Exceção no processamento personalizado para ${clientes.length} clientes: ${erroMensagem}${detalhesAnexos}`,
                  anexo_id: anexoId,
                  anexo_processado: false
                };

                await supabase.from('historico_disparos').insert(historicoExcecaoData);

                console.log(`📝 Exceção personalizada registrada no histórico - Empresa: ${empresa.nome_completo}, Erro: ${erroMensagem}`);
              }
            } catch (historicoError) {
              console.error('Erro ao registrar exceção personalizada no histórico:', historicoError);
            }

            await this.atualizarControleMensal(
              mes,
              ano,
              empresa.id,
              'falhou',
              forceResend ? `Reenvio manual personalizado: Erro no processamento - ${erroMensagem}` : `Erro no processamento (personalizado): ${erroMensagem}`
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
      // Consulta otimizada única com JOINs para evitar N+1 queries
      const dataInicio = `${ano}-${mes.toString().padStart(2, '0')}-01`;
      
      // Calcular próximo mês corretamente (lidar com dezembro -> janeiro)
      const proximoMes = mes === 12 ? 1 : mes + 1;
      const proximoAno = mes === 12 ? ano + 1 : ano;
      const dataFim = `${proximoAno}-${proximoMes.toString().padStart(2, '0')}-01`;

      // Buscar empresas com book padrão (não personalizado)
      const { data: empresasData, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select(`
          *,
          controle_mensal!left(
            status,
            data_processamento,
            observacoes
          )
        `)
        .eq('status', 'ativo')
        .eq('tem_ams', true)
        .eq('tipo_book', 'qualidade')
        .eq('book_personalizado', false)
        .eq('controle_mensal.mes', mes)
        .eq('controle_mensal.ano', ano)
        .order('nome_abreviado');

      if (empresasError) {
        throw new Error(`Erro ao buscar empresas: ${empresasError.message}`);
      }

      if (!empresasData || empresasData.length === 0) {
        return [];
      }

      // Buscar clientes ativos para cada empresa
      const empresasIds = empresasData.map(e => e.id);
      
      const { data: clientesData } = await supabase
        .from('clientes')
        .select('id, empresa_id')
        .in('empresa_id', empresasIds)
        .eq('status', 'ativo');

      // Buscar histórico de disparos no período
      const { data: historicosData } = await supabase
        .from('historico_disparos')
        .select('id, empresa_id')
        .in('empresa_id', empresasIds)
        .eq('status', 'enviado')
        .gte('data_disparo', dataInicio)
        .lt('data_disparo', dataFim);

      // Processar resultados agrupando por empresa
      const empresasMap = new Map<string, any>();

      for (const row of empresasData) {
        const empresaId = row.id;

        empresasMap.set(empresaId, {
          empresa: {
            id: row.id,
            nome_completo: row.nome_completo,
            nome_abreviado: row.nome_abreviado,
            status: row.status,
            tem_ams: row.tem_ams,
            tipo_book: row.tipo_book,
            book_personalizado: row.book_personalizado,
            anexo: row.anexo,
            template_padrao: row.template_padrao,
            link_sharepoint: row.link_sharepoint,
            email_gestor: row.email_gestor,
            data_status: row.data_status,
            descricao_status: row.descricao_status,
            vigencia_inicial: row.vigencia_inicial,
            vigencia_final: row.vigencia_final,
            created_at: row.created_at,
            updated_at: row.updated_at
          },
          controle: row.controle_mensal?.[0] || null,
          clientesAtivos: new Set(),
          emailsEnviados: new Set()
        });
      }

      // Mapear clientes por empresa
      if (clientesData) {
        for (const cliente of clientesData) {
          const empresaData = empresasMap.get(cliente.empresa_id);
          if (empresaData && cliente.id) {
            empresaData.clientesAtivos.add(cliente.id);
          }
        }
      }

      // Mapear históricos por empresa
      if (historicosData) {
        for (const historico of historicosData) {
          const empresaData = empresasMap.get(historico.empresa_id);
          if (empresaData && historico.id) {
            empresaData.emailsEnviados.add(historico.id);
          }
        }
      }

      // Converter para formato final, aplicando filtro de vigência inicial
      const mesReferencia = mes === 1 ? 12 : mes - 1;
      const anoReferencia = mes === 1 ? ano - 1 : ano;
      
      // Obter o último dia válido do mês de referência
      const ultimoDiaMes = new Date(anoReferencia, mesReferencia, 0).getDate();
      const dataReferenciaFim = new Date(`${anoReferencia}-${mesReferencia.toString().padStart(2, '0')}-${ultimoDiaMes.toString().padStart(2, '0')}`);

      const statusMensal: StatusMensal[] = Array.from(empresasMap.values())
        .filter(empresaData => {
          // Se já foi efetivamente processada (enviado, falhou, agendado), sempre incluir
          if (empresaData.controle && ['enviado', 'falhou', 'agendado'].includes(empresaData.controle.status)) {
            return true;
          }
          
          // Para empresas pendentes ou sem controle mensal, aplicar filtro de vigência inicial
          const vigenciaInicial = empresaData.empresa.vigencia_inicial ? new Date(empresaData.empresa.vigencia_inicial) : null;
          if (vigenciaInicial) {
            // A vigência inicial deve ser <= primeiro dia do mês de referência
            const dataReferenciaInicio = new Date(`${anoReferencia}-${mesReferencia.toString().padStart(2, '0')}-01`);
            return vigenciaInicial <= dataReferenciaInicio;
          }
          
          // Se não tem vigência inicial definida, incluir (comportamento padrão)
          return true;
        })
        .map(empresaData => ({
          empresaId: empresaData.empresa.id,
          empresa: empresaData.empresa,
          status: empresaData.controle?.status as StatusControleMensal || 'pendente',
          dataProcessamento: empresaData.controle?.data_processamento ? new Date(empresaData.controle.data_processamento) : undefined,
          observacoes: empresaData.controle?.observacoes || undefined,
          clientesAtivos: empresaData.clientesAtivos.size,
          emailsEnviados: empresaData.emailsEnviados.size
        }));

      // Ordenação alfabética por nome abreviado da empresa
      return statusMensal.sort((a, b) => {
        const nomeA = (a.empresa.nome_abreviado || a.empresa.nome_completo || '').toLowerCase();
        const nomeB = (b.empresa.nome_abreviado || b.empresa.nome_completo || '').toLowerCase();
        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      });

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
      // Primeiro, buscar apenas os dados do histórico
      let query = supabase
        .from('historico_disparos')
        .select('*');

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

      const { data: historicoData, error } = await query;

      if (error) {
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }

      if (!historicoData || historicoData.length === 0) {
        return [];
      }

      // Buscar dados relacionados separadamente
      const empresaIds = [...new Set(historicoData.map(h => h.empresa_id).filter(Boolean))];
      const clienteIds = [...new Set(historicoData.map(h => h.cliente_id).filter(Boolean))];

      // Buscar empresas
      const { data: empresas } = await supabase
        .from('empresas_clientes')
        .select('*')
        .in('id', empresaIds);

      // Buscar clientes
      const { data: clientes } = await supabase
        .from('clientes')
        .select('*')
        .in('id', clienteIds);

      // Combinar os dados
      const resultado: HistoricoDisparoCompleto[] = historicoData.map(historico => ({
        ...historico,
        empresas_clientes: empresas?.find(e => e.id === historico.empresa_id),
        clientes: clientes?.find(c => c.id === historico.cliente_id)
      }));

      return resultado;

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
    // Declarar anexosWebhook no escopo da função para estar disponível em todos os blocos
    let anexosWebhook: AnexoWebhookData[] = [];

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

      // Verificar se empresa tem anexos habilitados
      const temAnexos = empresa.anexo === true;

      // Buscar anexos da empresa se habilitado
      if (temAnexos) {
        try {
          anexosWebhook = await this.buscarAnexosEmpresa(empresa.id);
        } catch (error) {
          console.error('Erro ao buscar anexos:', error);
          // Continuar sem anexos em caso de erro
        }
      }

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

      // Enviar e-mail consolidado usando o emailService (com anexos se houver)
      const resultadoEnvio = await this.enviarEmailConsolidadoComAnexos(
        emailsClientes,
        emailsCC,
        templateProcessado.assunto,
        templateProcessado.corpo,
        empresa,
        clientes,
        anexosWebhook
      );

      if (resultadoEnvio.sucesso) {
        // Preparar informações sobre anexos para o histórico
        let anexoId: string | undefined;
        let anexoProcessado = false;
        let detalhesAnexos = '';

        if (anexosWebhook.length > 0) {
          // Buscar o primeiro anexo para referência no histórico
          try {
            const anexos = await anexoService.obterAnexosEmpresa(empresa.id);
            const anexosPendentes = anexos.filter(a => a.status === 'enviando' || a.status === 'processado');

            if (anexosPendentes.length > 0) {
              anexoId = anexosPendentes[0].id;
              anexoProcessado = anexosPendentes.every(a => a.status === 'processado');
              detalhesAnexos = ` | Anexos: ${anexosWebhook.length} arquivo(s) (${Math.round(anexosWebhook.reduce((total, a) => total + a.tamanho, 0) / 1024)} KB)`;
            }
          } catch (error) {
            console.error('Erro ao verificar anexos para histórico:', error);
          }
        }

        // Registrar no histórico - um registro por empresa com múltiplos clientes
        const historicoData: HistoricoDisparoInsert = {
          empresa_id: empresa.id,
          cliente_id: clienteReferencia.id, // Cliente de referência
          template_id: template.id,
          status: 'enviado',
          data_disparo: new Date().toISOString(),
          assunto: templateProcessado.assunto,
          emails_cc: emailsCC,
          erro_detalhes: `E-mail consolidado enviado para ${emailsClientes.length} clientes: ${emailsClientes.join(', ')}${detalhesAnexos}`,
          anexo_id: anexoId,
          anexo_processado: anexoProcessado
        };

        await supabase.from('historico_disparos').insert(historicoData);

        console.log(`✅ Histórico registrado - Empresa: ${empresa.nome_completo}, Clientes: ${emailsClientes.length}, Anexos: ${anexosWebhook.length}`);

        return {
          sucesso: true,
          clientesProcessados: clientes.map(c => c.id)
        };
      } else {
        console.log(`❌ Falha no envio - Empresa: ${empresa.nome_completo}, Erro: ${resultadoEnvio.erro}`);

        // ✅ CORREÇÃO: Registrar falha no histórico de disparos
        try {
          // Preparar informações sobre anexos para o histórico (mesmo em caso de falha)
          let anexoId: string | undefined;
          let detalhesAnexos = '';

          if (anexosWebhook.length > 0) {
            try {
              const anexos = await anexoService.obterAnexosEmpresa(empresa.id);
              const anexosEnviando = anexos.filter(a => a.status === 'enviando');

              if (anexosEnviando.length > 0) {
                anexoId = anexosEnviando[0].id;
                detalhesAnexos = ` | Anexos: ${anexosWebhook.length} arquivo(s) (falha no envio)`;
              }
            } catch (error) {
              console.error('Erro ao verificar anexos para histórico de falha:', error);
            }
          }

          // Registrar falha no histórico - um registro por empresa
          const historicoFalhaData: HistoricoDisparoInsert = {
            empresa_id: empresa.id,
            cliente_id: clienteReferencia.id, // Cliente de referência
            template_id: template.id,
            status: 'falhou',
            data_disparo: new Date().toISOString(),
            assunto: templateProcessado.assunto,
            emails_cc: emailsCC,
            erro_detalhes: `Falha no envio consolidado para ${emailsClientes.length} clientes: ${resultadoEnvio.erro}${detalhesAnexos}`,
            anexo_id: anexoId,
            anexo_processado: false
          };

          await supabase.from('historico_disparos').insert(historicoFalhaData);

          console.log(`📝 Falha registrada no histórico - Empresa: ${empresa.nome_completo}, Erro: ${resultadoEnvio.erro}`);
        } catch (historicoError) {
          console.error('Erro ao registrar falha no histórico:', historicoError);
        }

        return {
          sucesso: false,
          erro: resultadoEnvio.erro,
          clientesProcessados: []
        };
      }

    } catch (error) {
      const erroMensagem = error instanceof Error ? error.message : 'Erro desconhecido';
      console.log(`💥 Exceção no processamento - Empresa: ${empresa.nome_completo}, Erro: ${erroMensagem}`);

      // ✅ CORREÇÃO: Registrar exceção no histórico de disparos
      try {
        // Buscar template e cliente de referência para o histórico
        let templateId: string | null = null;
        let clienteReferenciaId: string | null = null;

        try {
          const templatePadrao = (empresa as any).template_padrao as ('portugues' | 'ingles') ?? 'portugues';
          const template = await clientBooksTemplateService.buscarTemplateBooks(templatePadrao);
          templateId = template?.id || null;
        } catch (templateError) {
          console.error('Erro ao buscar template para histórico de exceção:', templateError);
        }

        if (clientes.length > 0) {
          clienteReferenciaId = clientes[0].id;
        }

        if (templateId && clienteReferenciaId) {
          // Preparar informações sobre anexos para o histórico (mesmo em caso de exceção)
          let anexoId: string | undefined;
          let detalhesAnexos = '';

          if (anexosWebhook.length > 0) {
            try {
              const anexos = await anexoService.obterAnexosEmpresa(empresa.id);
              const anexosEnviando = anexos.filter(a => a.status === 'enviando');

              if (anexosEnviando.length > 0) {
                anexoId = anexosEnviando[0].id;
                detalhesAnexos = ` | Anexos: ${anexosWebhook.length} arquivo(s) (exceção no processamento)`;
              }
            } catch (anexoError) {
              console.error('Erro ao verificar anexos para histórico de exceção:', anexoError);
            }
          }

          // Registrar exceção no histórico
          const historicoExcecaoData: HistoricoDisparoInsert = {
            empresa_id: empresa.id,
            cliente_id: clienteReferenciaId,
            template_id: templateId,
            status: 'falhou',
            data_disparo: new Date().toISOString(),
            assunto: 'Erro no processamento',
            emails_cc: emailsCC,
            erro_detalhes: `Exceção no processamento para ${clientes.length} clientes: ${erroMensagem}${detalhesAnexos}`,
            anexo_id: anexoId,
            anexo_processado: false
          };

          await supabase.from('historico_disparos').insert(historicoExcecaoData);

          console.log(`📝 Exceção registrada no histórico - Empresa: ${empresa.nome_completo}, Erro: ${erroMensagem}`);
        }
      } catch (historicoError) {
        console.error('Erro ao registrar exceção no histórico:', historicoError);
      }

      return {
        sucesso: false,
        erro: erroMensagem,
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

  /**
   * Envia e-mail consolidado com suporte a anexos
   */
  private async enviarEmailConsolidadoComAnexos(
    destinatarios: string[],
    emailsCC: string[],
    assunto: string,
    corpo: string,
    empresa: EmpresaCliente,
    clientes: Cliente[],
    anexosWebhook: AnexoWebhookData[]
  ): Promise<{ sucesso: boolean; erro?: string }> {
    try {
      console.log(`📧 Preparando e-mail consolidado para ${destinatarios.length} destinatários`);
      console.log(`📎 Anexos incluídos: ${anexosWebhook.length}`);

      // Preparar dados básicos para o emailService
      const emailData: any = {
        to: destinatarios,
        cc: emailsCC.length > 0 ? emailsCC : [],
        subject: assunto,
        html: corpo
      };

      // Incluir dados dos anexos no payload se houver
      if (anexosWebhook.length > 0) {
        const dadosAnexos = this.prepararDadosAnexosWebhook(anexosWebhook);
        if (dadosAnexos) {
          emailData.anexos = dadosAnexos;
          console.log(`📎 Dados de anexos adicionados ao payload: ${dadosAnexos.totalArquivos} arquivos, ${dadosAnexos.tamanhoTotal} bytes`);
        }
      }

      // Enviar e-mail usando o emailService
      console.log(`📤 Enviando e-mail via webhook...`);
      const resultado = await emailService.sendEmail(emailData);

      if (resultado.success) {
        console.log(`✅ E-mail enviado com sucesso`);

        // Se há anexos, atualizar status para processado após envio bem-sucedido
        if (anexosWebhook.length > 0) {
          try {
            // Buscar anexos da empresa que estão sendo enviados
            const anexos = await anexoService.obterAnexosEmpresa(empresa.id);
            const anexosEnviando = anexos.filter(a => a.status === 'enviando');

            // Atualizar status para 'processado' imediatamente após envio bem-sucedido
            await Promise.all(
              anexosEnviando.map(anexo =>
                this.atualizarStatusAnexoComLog(
                  anexo.id,
                  'processado',
                  `Anexo enviado com sucesso via Power Automate em ${new Date().toLocaleString()}`
                )
              )
            );

            // Atualizar histórico de disparos para marcar anexos como processados
            await Promise.all(
              anexosEnviando.map(async (anexo) => {
                const { error: historicoError } = await supabase
                  .from('historico_disparos')
                  .update({
                    anexo_processado: true,
                    erro_detalhes: null // Limpar erros anteriores
                  })
                  .eq('anexo_id', anexo.id);

                if (historicoError) {
                  console.error(`Erro ao atualizar histórico para anexo ${anexo.id}:`, historicoError);
                }
              })
            );

            // Registrar que os anexos foram processados com sucesso
            await this.registrarEventoAnexos(
              empresa.id,
              anexosEnviando.map(a => a.id),
              'processados_com_sucesso',
              `${anexosEnviando.length} anexos processados com sucesso via Power Automate`
            );

            console.log(`✅ ${anexosEnviando.length} anexos marcados como processados após envio bem-sucedido`);

          } catch (error) {
            console.error('Erro ao atualizar status dos anexos para processado:', error);
            // Não falhar o disparo por erro nos anexos pós-envio
          }
        }

        return { sucesso: true };
      } else {
        console.log(`❌ Falha no envio do e-mail: ${resultado.error}`);

        // Se há anexos e falhou o envio, marcar como erro
        if (anexosWebhook.length > 0) {
          try {
            // Buscar anexos da empresa e marcar como erro
            const anexos = await anexoService.obterAnexosEmpresa(empresa.id);
            const anexosEnviando = anexos.filter(a => a.status === 'enviando');

            // Atualizar status com detalhes do erro
            await Promise.all(
              anexosEnviando.map(anexo =>
                this.atualizarStatusAnexoComLog(
                  anexo.id,
                  'erro',
                  `Falha no envio do e-mail: ${resultado.error}`
                )
              )
            );

            // Registrar evento de erro
            await this.registrarEventoAnexos(
              empresa.id,
              anexosEnviando.map(a => a.id),
              'erro_envio_email',
              `Falha no envio do e-mail impediu processamento dos anexos: ${resultado.error}`
            );

            console.log(`📎 ${anexosEnviando.length} anexos marcados como erro devido a falha no envio`);
          } catch (error) {
            console.error('Erro ao atualizar status dos anexos para erro:', error);
          }
        }

        return {
          sucesso: false,
          erro: resultado.error || 'Falha no envio do e-mail consolidado'
        };
      }

    } catch (error) {
      console.error('Erro no envio consolidado com anexos:', error);

      // Se há anexos e houve erro, marcar como erro com detalhes
      if (anexosWebhook.length > 0) {
        try {
          const anexos = await anexoService.obterAnexosEmpresa(empresa.id);
          const anexosEnviando = anexos.filter(a => a.status === 'enviando');

          const erroDetalhes = error instanceof Error ? error.message : 'Erro desconhecido no envio consolidado';

          // Atualizar status com detalhes do erro
          await Promise.all(
            anexosEnviando.map(anexo =>
              this.atualizarStatusAnexoComLog(anexo.id, 'erro', erroDetalhes)
            )
          );

          // Registrar evento de erro geral
          await this.registrarEventoAnexos(
            empresa.id,
            anexosEnviando.map(a => a.id),
            'erro_geral_disparo',
            `Erro geral no processo de disparo: ${erroDetalhes}`
          );

          console.log(`📎 ${anexosEnviando.length} anexos marcados como erro devido a falha geral`);
        } catch (anexoError) {
          console.error('Erro ao atualizar status dos anexos para erro:', anexoError);
        }
      }

      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido no envio consolidado'
      };
    }
  }

  /**
   * Método legado mantido para compatibilidade
   */
  private async enviarEmailConsolidado(
    destinatarios: string[],
    emailsCC: string[],
    assunto: string,
    corpo: string,
    empresa: EmpresaCliente,
    clientes: Cliente[]
  ): Promise<{ sucesso: boolean; erro?: string }> {
    // Chamar o novo método sem anexos
    return this.enviarEmailConsolidadoComAnexos(
      destinatarios,
      emailsCC,
      assunto,
      corpo,
      empresa,
      clientes,
      []
    );
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

  /**
   * Registra histórico de disparo com suporte a anexos
   */
  async registrarHistoricoComAnexo(
    empresaId: string,
    clienteId: string,
    templateId: string,
    status: StatusDisparo,
    anexoId?: string,
    dadosAdicionais?: {
      assunto?: string;
      emailsCC?: string[];
      erroDetalhes?: string;
      dataDisparo?: string;
    }
  ): Promise<void> {
    try {
      const historicoData: HistoricoDisparoInsert = {
        empresa_id: empresaId,
        cliente_id: clienteId,
        template_id: templateId,
        status,
        anexo_id: anexoId || null,
        anexo_processado: false,
        data_disparo: dadosAdicionais?.dataDisparo || new Date().toISOString(),
        assunto: dadosAdicionais?.assunto || null,
        emails_cc: dadosAdicionais?.emailsCC || null,
        erro_detalhes: dadosAdicionais?.erroDetalhes || null
      };

      const { error } = await supabase
        .from('historico_disparos')
        .insert(historicoData);

      if (error) {
        console.error('Erro ao registrar histórico com anexo:', error);
        throw error;
      }

      console.log(`✅ Histórico registrado com anexo: ${anexoId ? 'com anexo' : 'sem anexo'}`);
    } catch (error) {
      console.error('Erro ao registrar histórico com anexo:', error);
      throw new Error(`Erro ao registrar histórico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Atualiza status de processamento do anexo no histórico
   */
  async atualizarStatusAnexoHistorico(
    historicoId: string,
    anexoProcessado: boolean,
    erroDetalhes?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        anexo_processado: anexoProcessado
      };

      if (erroDetalhes) {
        updateData.erro_detalhes = erroDetalhes;
      }

      const { error } = await supabase
        .from('historico_disparos')
        .update(updateData)
        .eq('id', historicoId);

      if (error) {
        console.error('Erro ao atualizar status do anexo no histórico:', error);
        throw error;
      }

      console.log(`✅ Status do anexo atualizado no histórico: ${anexoProcessado ? 'processado' : 'erro'}`);
    } catch (error) {
      console.error('Erro ao atualizar status do anexo:', error);
      throw new Error(`Erro ao atualizar status do anexo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Busca anexos da empresa e gera tokens de acesso para webhook
   */
  private async buscarAnexosEmpresa(empresaId: string): Promise<AnexoWebhookData[]> {
    try {
      console.log(`🔍 Buscando anexos para empresa: ${empresaId}`);

      // Buscar anexos pendentes da empresa
      const anexos = await anexoService.obterAnexosEmpresa(empresaId);
      const anexosPendentes = anexos.filter(anexo => anexo.status === 'pendente');

      if (anexosPendentes.length === 0) {
        console.log(`📎 Nenhum anexo pendente encontrado para empresa: ${empresaId}`);
        return [];
      }

      console.log(`📎 Encontrados ${anexosPendentes.length} anexos pendentes para empresa: ${empresaId}`);

      // Gerar tokens de acesso para cada anexo
      const anexosComToken: AnexoWebhookData[] = [];
      const anexosProcessados: string[] = [];

      for (const anexo of anexosPendentes) {
        try {
          // Atualizar status para "enviando" com timestamp
          await this.atualizarStatusAnexoComLog(anexo.id, 'enviando', `Iniciando processo de disparo para empresa ${empresaId}`);

          // Gerar token de acesso
          const token = await anexoService.gerarTokenAcessoPublico(anexo.id);

          anexosComToken.push({
            url: anexo.url,
            nome: anexo.nome,
            tipo: anexo.tipo,
            tamanho: anexo.tamanho,
            token: token
          });

          anexosProcessados.push(anexo.id);
          console.log(`🔑 Token gerado para anexo: ${anexo.nome} (${anexo.id})`);
        } catch (error) {
          console.error(`❌ Erro ao processar anexo ${anexo.id}:`, error);
          // Marcar anexo como erro com detalhes
          await this.atualizarStatusAnexoComLog(
            anexo.id,
            'erro',
            `Erro ao gerar token: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
          );
        }
      }

      // Registrar no histórico que anexos foram preparados para disparo
      if (anexosProcessados.length > 0) {
        await this.registrarEventoAnexos(
          empresaId,
          anexosProcessados,
          'preparados_para_disparo',
          `${anexosProcessados.length} anexos preparados para webhook`
        );
      }

      console.log(`✅ ${anexosComToken.length} anexos preparados para webhook`);
      return anexosComToken;
    } catch (error) {
      console.error('Erro ao buscar anexos da empresa:', error);
      throw new Error(`Erro ao buscar anexos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Prepara dados de anexos para incluir no payload do webhook
   */
  private prepararDadosAnexosWebhook(anexos: AnexoWebhookData[]): AnexosSummaryWebhook | undefined {
    console.log(`🔧 Preparando dados de anexos para webhook:`, {
      anexosRecebidos: anexos?.length || 0,
      anexos: anexos?.map(a => ({ nome: a.nome, tamanho: a.tamanho })) || []
    });

    if (!anexos || anexos.length === 0) {
      console.log(`⚠️ Nenhum anexo para preparar - retornando undefined`);
      return undefined;
    }

    const tamanhoTotal = anexos.reduce((total, anexo) => total + anexo.tamanho, 0);

    const dadosPreparados = {
      totalArquivos: anexos.length,
      tamanhoTotal,
      arquivos: anexos
    };

    console.log(`✅ Dados de anexos preparados:`, {
      totalArquivos: dadosPreparados.totalArquivos,
      tamanhoTotal: dadosPreparados.tamanhoTotal,
      tamanhoMB: (dadosPreparados.tamanhoTotal / 1024 / 1024).toFixed(2)
    });

    return dadosPreparados;
  }

  /**
   * Atualiza status do anexo com log detalhado
   */
  private async atualizarStatusAnexoComLog(
    anexoId: string,
    novoStatus: 'pendente' | 'enviando' | 'processado' | 'erro',
    detalhes?: string
  ): Promise<void> {
    try {
      // Atualizar status no anexoService
      await anexoService.atualizarStatusAnexo(anexoId, novoStatus);

      // Registrar log detalhado
      console.log(`📎 Anexo ${anexoId}: ${novoStatus.toUpperCase()}${detalhes ? ` - ${detalhes}` : ''}`);

      // Se for erro, salvar detalhes no banco
      if (novoStatus === 'erro' && detalhes) {
        const { error } = await supabase
          .from('anexos_temporarios')
          .update({ erro_detalhes: detalhes })
          .eq('id', anexoId);

        if (error) {
          console.error(`Erro ao salvar detalhes do erro para anexo ${anexoId}:`, error);
        }
      }
    } catch (error) {
      console.error(`Erro ao atualizar status do anexo ${anexoId}:`, error);
      throw error;
    }
  }

  /**
   * Registra evento relacionado aos anexos para auditoria
   */
  private async registrarEventoAnexos(
    empresaId: string,
    anexoIds: string[],
    evento: string,
    detalhes: string
  ): Promise<void> {
    try {
      // Registrar evento no log de auditoria (se disponível)
      console.log(`📋 Evento de anexos - Empresa: ${empresaId}, Evento: ${evento}, Anexos: ${anexoIds.join(', ')}, Detalhes: ${detalhes}`);

      // Aqui poderia ser integrado com um sistema de auditoria mais robusto
      // Por enquanto, apenas log no console
    } catch (error) {
      console.error('Erro ao registrar evento de anexos:', error);
      // Não falhar o processo principal por erro de log
    }
  }

  /**
   * Processa confirmação de recebimento do anexo pelo Power Automate
   */
  async processarConfirmacaoAnexo(
    empresaId: string,
    anexoIds: string[],
    sucesso: boolean,
    erroDetalhes?: string
  ): Promise<void> {
    try {
      console.log(`📨 Processando confirmação de anexos para empresa: ${empresaId}`);
      console.log(`📎 Anexos: ${anexoIds.join(', ')}`);
      console.log(`✅ Sucesso: ${sucesso}`);

      const anexosProcessados: string[] = [];
      const anexosComErro: string[] = [];

      for (const anexoId of anexoIds) {
        try {
          if (sucesso) {
            // Marcar anexo como processado com log
            await this.atualizarStatusAnexoComLog(
              anexoId,
              'processado',
              'Confirmação de processamento recebida do Power Automate'
            );

            // Atualizar histórico
            const { error: historicoError } = await supabase
              .from('historico_disparos')
              .update({
                anexo_processado: true,
                erro_detalhes: null // Limpar erros anteriores
              })
              .eq('anexo_id', anexoId);

            if (historicoError) {
              console.error(`Erro ao atualizar histórico para anexo ${anexoId}:`, historicoError);
            }

            anexosProcessados.push(anexoId);
            console.log(`✅ Anexo ${anexoId} marcado como processado`);
          } else {
            // Marcar anexo como erro com detalhes
            await this.atualizarStatusAnexoComLog(
              anexoId,
              'erro',
              erroDetalhes || 'Erro no processamento pelo Power Automate'
            );

            // Atualizar histórico com erro
            const { error: historicoError } = await supabase
              .from('historico_disparos')
              .update({
                anexo_processado: false,
                erro_detalhes: erroDetalhes || 'Erro no processamento pelo Power Automate'
              })
              .eq('anexo_id', anexoId);

            if (historicoError) {
              console.error(`Erro ao atualizar histórico para anexo ${anexoId}:`, historicoError);
            }

            anexosComErro.push(anexoId);
            console.log(`❌ Anexo ${anexoId} marcado como erro: ${erroDetalhes}`);
          }
        } catch (error) {
          console.error(`Erro ao processar confirmação do anexo ${anexoId}:`, error);
          anexosComErro.push(anexoId);
        }
      }

      // Registrar eventos de auditoria
      if (anexosProcessados.length > 0) {
        await this.registrarEventoAnexos(
          empresaId,
          anexosProcessados,
          'processados_com_sucesso',
          `${anexosProcessados.length} anexos processados com sucesso pelo Power Automate`
        );

        // Mover anexos processados para storage permanente
        try {
          await anexoService.moverParaPermanente(anexosProcessados);
          console.log(`📁 ${anexosProcessados.length} anexos movidos para storage permanente`);

          await this.registrarEventoAnexos(
            empresaId,
            anexosProcessados,
            'movidos_para_permanente',
            `${anexosProcessados.length} anexos movidos para storage permanente`
          );
        } catch (error) {
          console.error('Erro ao mover anexos para storage permanente:', error);
          // Não falhar o processo por causa disso, mas registrar o erro
          await this.registrarEventoAnexos(
            empresaId,
            anexosProcessados,
            'erro_mover_permanente',
            `Erro ao mover anexos para storage permanente: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
          );
        }
      }

      if (anexosComErro.length > 0) {
        await this.registrarEventoAnexos(
          empresaId,
          anexosComErro,
          'processamento_com_erro',
          `${anexosComErro.length} anexos falharam no processamento: ${erroDetalhes || 'Erro não especificado'}`
        );
      }

    } catch (error) {
      console.error('Erro ao processar confirmação de anexo:', error);
      throw new Error(`Erro ao processar confirmação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Obtém status detalhado dos anexos de uma empresa
   */
  async obterStatusAnexosEmpresa(empresaId: string): Promise<{
    total: number;
    pendentes: number;
    enviando: number;
    processados: number;
    comErro: number;
    detalhes: Array<{
      id: string;
      nome: string;
      status: string;
      dataUpload: string;
      dataProcessamento?: string;
      erroDetalhes?: string;
    }>;
  }> {
    try {
      const anexos = await anexoService.obterAnexosEmpresa(empresaId);

      const status = {
        total: anexos.length,
        pendentes: anexos.filter(a => a.status === 'pendente').length,
        enviando: anexos.filter(a => a.status === 'enviando').length,
        processados: anexos.filter(a => a.status === 'processado').length,
        comErro: anexos.filter(a => a.status === 'erro').length,
        detalhes: anexos.map(anexo => ({
          id: anexo.id,
          nome: anexo.nome,
          status: anexo.status,
          dataUpload: anexo.dataUpload || '',
          dataProcessamento: anexo.dataExpiracao,
          erroDetalhes: undefined // Será buscado do banco se necessário
        }))
      };

      return status;
    } catch (error) {
      console.error('Erro ao obter status dos anexos:', error);
      throw new Error(`Erro ao obter status dos anexos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Limpa anexos órfãos (sem referência no histórico)
   */
  async limparAnexosOrfaos(empresaId?: string): Promise<number> {
    try {
      console.log(`🧹 Iniciando limpeza de anexos órfãos${empresaId ? ` para empresa ${empresaId}` : ''}`);

      // Buscar anexos que não têm referência no histórico
      let query = supabase
        .from('anexos_temporarios')
        .select(`
          id,
          empresa_id,
          nome_original,
          status,
          data_upload
        `);

      if (empresaId) {
        query = query.eq('empresa_id', empresaId);
      }

      const { data: anexos, error: anexosError } = await query;

      if (anexosError) {
        throw new Error(`Erro ao buscar anexos: ${anexosError.message}`);
      }

      if (!anexos || anexos.length === 0) {
        console.log('🧹 Nenhum anexo encontrado para limpeza');
        return 0;
      }

      let anexosOrfaos = 0;

      for (const anexo of anexos) {
        // Verificar se existe referência no histórico
        const { data: historico, error: historicoError } = await supabase
          .from('historico_disparos')
          .select('id')
          .eq('anexo_id', anexo.id)
          .limit(1);

        if (historicoError) {
          console.error(`Erro ao verificar histórico para anexo ${anexo.id}:`, historicoError);
          continue;
        }

        // Se não tem referência no histórico e está há mais de 1 hora sem processamento
        const dataUpload = new Date(anexo.data_upload);
        const agora = new Date();
        const diferencaHoras = (agora.getTime() - dataUpload.getTime()) / (1000 * 60 * 60);

        if (!historico || historico.length === 0) {
          if (diferencaHoras > 1) {
            try {
              await anexoService.removerAnexo(anexo.id);
              anexosOrfaos++;
              console.log(`🗑️ Anexo órfão removido: ${anexo.nome_original} (${anexo.id})`);
            } catch (error) {
              console.error(`Erro ao remover anexo órfão ${anexo.id}:`, error);
            }
          }
        }
      }

      console.log(`🧹 Limpeza concluída: ${anexosOrfaos} anexos órfãos removidos`);
      return anexosOrfaos;
    } catch (error) {
      console.error('Erro na limpeza de anexos órfãos:', error);
      throw new Error(`Erro na limpeza: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}

export const booksDisparoService = new BooksDisparoService();