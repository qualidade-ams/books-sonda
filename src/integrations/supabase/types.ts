export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          message: string
          read_at: string | null
          severity: string
          source: string
          title: string
          type: string
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id: string
          message: string
          read_at?: string | null
          severity: string
          source: string
          title: string
          type: string
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          read_at?: string | null
          severity?: string
          source?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      anexos_temporarios: {
        Row: {
          created_at: string | null
          data_expiracao: string | null
          data_processamento: string | null
          data_upload: string | null
          empresa_id: string
          erro_detalhes: string | null
          id: string
          nome_arquivo: string
          nome_original: string
          status: string | null
          tamanho_bytes: number
          tipo_mime: string
          token_acesso: string
          updated_at: string | null
          url_permanente: string | null
          url_temporaria: string
        }
        Insert: {
          created_at?: string | null
          data_expiracao?: string | null
          data_processamento?: string | null
          data_upload?: string | null
          empresa_id: string
          erro_detalhes?: string | null
          id?: string
          nome_arquivo: string
          nome_original: string
          status?: string | null
          tamanho_bytes: number
          tipo_mime: string
          token_acesso: string
          updated_at?: string | null
          url_permanente?: string | null
          url_temporaria: string
        }
        Update: {
          created_at?: string | null
          data_expiracao?: string | null
          data_processamento?: string | null
          data_upload?: string | null
          empresa_id?: string
          erro_detalhes?: string | null
          id?: string
          nome_arquivo?: string
          nome_original?: string
          status?: string | null
          tamanho_bytes?: number
          tipo_mime?: string
          token_acesso?: string
          updated_at?: string | null
          url_permanente?: string | null
          url_temporaria?: string
        }
        Relationships: [
          {
            foreignKeyName: "anexos_temporarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      apontamentos_aranda: {
        Row: {
          analista_caso: string | null
          analista_tarefa: string | null
          ativi_interna: string | null
          autor_id: string | null
          autor_nome: string | null
          caso_estado: string | null
          caso_grupo: string | null
          categoria: string | null
          causa_raiz: string | null
          cod_resolucao: string | null
          created_at: string | null
          data_abertura: string | null
          data_atividade: string | null
          data_fechamento: string | null
          data_sistema: string | null
          data_ult_modificacao: string | null
          data_ult_modificacao_geral: string | null
          data_ult_modificacao_tarefa: string | null
          descricao_tarefa: string | null
          estado_tarefa: string | null
          grupo_tarefa: string | null
          id: string
          id_externo: string
          item_configuracao: string | null
          log: string | null
          nro_chamado: string | null
          nro_tarefa: string | null
          org_us_final: string | null
          origem: string
          problema: string | null
          resumo_tarefa: string | null
          solicitante: string | null
          source_updated_at: string | null
          synced_at: string | null
          tempo_gasto_horas: string | null
          tempo_gasto_minutos: number | null
          tempo_gasto_segundos: number | null
          tipo_chamado: string | null
          updated_at: string | null
          us_final_afetado: string | null
        }
        Insert: {
          analista_caso?: string | null
          analista_tarefa?: string | null
          ativi_interna?: string | null
          autor_id?: string | null
          autor_nome?: string | null
          caso_estado?: string | null
          caso_grupo?: string | null
          categoria?: string | null
          causa_raiz?: string | null
          cod_resolucao?: string | null
          created_at?: string | null
          data_abertura?: string | null
          data_atividade?: string | null
          data_fechamento?: string | null
          data_sistema?: string | null
          data_ult_modificacao?: string | null
          data_ult_modificacao_geral?: string | null
          data_ult_modificacao_tarefa?: string | null
          descricao_tarefa?: string | null
          estado_tarefa?: string | null
          grupo_tarefa?: string | null
          id?: string
          id_externo: string
          item_configuracao?: string | null
          log?: string | null
          nro_chamado?: string | null
          nro_tarefa?: string | null
          org_us_final?: string | null
          origem?: string
          problema?: string | null
          resumo_tarefa?: string | null
          solicitante?: string | null
          source_updated_at?: string | null
          synced_at?: string | null
          tempo_gasto_horas?: string | null
          tempo_gasto_minutos?: number | null
          tempo_gasto_segundos?: number | null
          tipo_chamado?: string | null
          updated_at?: string | null
          us_final_afetado?: string | null
        }
        Update: {
          analista_caso?: string | null
          analista_tarefa?: string | null
          ativi_interna?: string | null
          autor_id?: string | null
          autor_nome?: string | null
          caso_estado?: string | null
          caso_grupo?: string | null
          categoria?: string | null
          causa_raiz?: string | null
          cod_resolucao?: string | null
          created_at?: string | null
          data_abertura?: string | null
          data_atividade?: string | null
          data_fechamento?: string | null
          data_sistema?: string | null
          data_ult_modificacao?: string | null
          data_ult_modificacao_geral?: string | null
          data_ult_modificacao_tarefa?: string | null
          descricao_tarefa?: string | null
          estado_tarefa?: string | null
          grupo_tarefa?: string | null
          id?: string
          id_externo?: string
          item_configuracao?: string | null
          log?: string | null
          nro_chamado?: string | null
          nro_tarefa?: string | null
          org_us_final?: string | null
          origem?: string
          problema?: string | null
          resumo_tarefa?: string | null
          solicitante?: string | null
          source_updated_at?: string | null
          synced_at?: string | null
          tempo_gasto_horas?: string | null
          tempo_gasto_minutos?: number | null
          tempo_gasto_segundos?: number | null
          tipo_chamado?: string | null
          updated_at?: string | null
          us_final_afetado?: string | null
        }
        Relationships: []
      }
      apontamentos_tickets_aranda: {
        Row: {
          autor: string | null
          caso_pai: string | null
          categoria: string | null
          causa_raiz: string | null
          chamado_reaberto: string | null
          cliente: string | null
          cod_resolucao: string | null
          cod_tipo: string | null
          created_at: string | null
          criado_via: string | null
          data_abertura: string | null
          data_aprovacao: string | null
          data_fechamento: string | null
          data_prevista_entrega: string | null
          data_prevista_tda: string | null
          data_prevista_tds: string | null
          data_real_entrega: string | null
          data_sincronizacao: string | null
          data_solucao: string | null
          data_ultima_modificacao: string | null
          data_ultima_nota: string | null
          data_ultima_nota_publica: string | null
          data_ultimo_comentario: string | null
          desc_ultima_nota: string | null
          desc_ultimo_comentario: string | null
          descricao: string | null
          empresa: string | null
          id: string
          impacto: string | null
          item_configuracao: string | null
          log: string | null
          nome_grupo: string | null
          nome_responsavel: string | null
          nro_solicitacao: string
          numero_pai: string | null
          organizacao: string | null
          prioridade: string | null
          relatado: string | null
          resumo: string | null
          solicitante: string | null
          solucao: string | null
          source_updated_at: string | null
          status: string | null
          synced_at: string | null
          tda_cumprido: string | null
          tds_cumprido: string | null
          tempo_gasto_dias: string | null
          tempo_gasto_horas: string | null
          tempo_gasto_minutos: number | null
          tempo_real_tda: number | null
          tempo_restante_tda: string | null
          tempo_restante_tds: string | null
          tempo_restante_tds_em_minutos: number | null
          ticket_externo: string | null
          total_orcamento: number | null
          ultima_modificacao: string | null
          updated_at: string | null
          urgencia: string | null
          usuario_final: string | null
          violacao_sla: string | null
        }
        Insert: {
          autor?: string | null
          caso_pai?: string | null
          categoria?: string | null
          causa_raiz?: string | null
          chamado_reaberto?: string | null
          cliente?: string | null
          cod_resolucao?: string | null
          cod_tipo?: string | null
          created_at?: string | null
          criado_via?: string | null
          data_abertura?: string | null
          data_aprovacao?: string | null
          data_fechamento?: string | null
          data_prevista_entrega?: string | null
          data_prevista_tda?: string | null
          data_prevista_tds?: string | null
          data_real_entrega?: string | null
          data_sincronizacao?: string | null
          data_solucao?: string | null
          data_ultima_modificacao?: string | null
          data_ultima_nota?: string | null
          data_ultima_nota_publica?: string | null
          data_ultimo_comentario?: string | null
          desc_ultima_nota?: string | null
          desc_ultimo_comentario?: string | null
          descricao?: string | null
          empresa?: string | null
          id?: string
          impacto?: string | null
          item_configuracao?: string | null
          log?: string | null
          nome_grupo?: string | null
          nome_responsavel?: string | null
          nro_solicitacao: string
          numero_pai?: string | null
          organizacao?: string | null
          prioridade?: string | null
          relatado?: string | null
          resumo?: string | null
          solicitante?: string | null
          solucao?: string | null
          source_updated_at?: string | null
          status?: string | null
          synced_at?: string | null
          tda_cumprido?: string | null
          tds_cumprido?: string | null
          tempo_gasto_dias?: string | null
          tempo_gasto_horas?: string | null
          tempo_gasto_minutos?: number | null
          tempo_real_tda?: number | null
          tempo_restante_tda?: string | null
          tempo_restante_tds?: string | null
          tempo_restante_tds_em_minutos?: number | null
          ticket_externo?: string | null
          total_orcamento?: number | null
          ultima_modificacao?: string | null
          updated_at?: string | null
          urgencia?: string | null
          usuario_final?: string | null
          violacao_sla?: string | null
        }
        Update: {
          autor?: string | null
          caso_pai?: string | null
          categoria?: string | null
          causa_raiz?: string | null
          chamado_reaberto?: string | null
          cliente?: string | null
          cod_resolucao?: string | null
          cod_tipo?: string | null
          created_at?: string | null
          criado_via?: string | null
          data_abertura?: string | null
          data_aprovacao?: string | null
          data_fechamento?: string | null
          data_prevista_entrega?: string | null
          data_prevista_tda?: string | null
          data_prevista_tds?: string | null
          data_real_entrega?: string | null
          data_sincronizacao?: string | null
          data_solucao?: string | null
          data_ultima_modificacao?: string | null
          data_ultima_nota?: string | null
          data_ultima_nota_publica?: string | null
          data_ultimo_comentario?: string | null
          desc_ultima_nota?: string | null
          desc_ultimo_comentario?: string | null
          descricao?: string | null
          empresa?: string | null
          id?: string
          impacto?: string | null
          item_configuracao?: string | null
          log?: string | null
          nome_grupo?: string | null
          nome_responsavel?: string | null
          nro_solicitacao?: string
          numero_pai?: string | null
          organizacao?: string | null
          prioridade?: string | null
          relatado?: string | null
          resumo?: string | null
          solicitante?: string | null
          solucao?: string | null
          source_updated_at?: string | null
          status?: string | null
          synced_at?: string | null
          tda_cumprido?: string | null
          tds_cumprido?: string | null
          tempo_gasto_dias?: string | null
          tempo_gasto_horas?: string | null
          tempo_gasto_minutos?: number | null
          tempo_real_tda?: number | null
          tempo_restante_tda?: string | null
          tempo_restante_tds?: string | null
          tempo_restante_tds_em_minutos?: number | null
          ticket_externo?: string | null
          total_orcamento?: number | null
          ultima_modificacao?: string | null
          updated_at?: string | null
          urgencia?: string | null
          usuario_final?: string | null
          violacao_sla?: string | null
        }
        Relationships: []
      }
      aranda_uso_diario: {
        Row: {
          atualizado_em: string
          dia: string
          fonte: string
          grupo: string
          organizacao: string | null
          primeiro_em: string
          quantidade: number
        }
        Insert: {
          atualizado_em?: string
          dia: string
          fonte: string
          grupo: string
          organizacao?: string | null
          primeiro_em: string
          quantidade: number
        }
        Update: {
          atualizado_em?: string
          dia?: string
          fonte?: string
          grupo?: string
          organizacao?: string | null
          primeiro_em?: string
          quantidade?: number
        }
        Relationships: []
      }
      auditoria_alteracoes: {
        Row: {
          acao: string
          banco_id: string | null
          campos_alterados: string[] | null
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          empresa_id: string | null
          id: number
          motivo: string | null
          origem: string
          registro_id: string
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          banco_id?: string | null
          campos_alterados?: string[] | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          empresa_id?: string | null
          id?: never
          motivo?: string | null
          origem: string
          registro_id: string
          tabela: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          banco_id?: string | null
          campos_alterados?: string[] | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          empresa_id?: string | null
          id?: never
          motivo?: string | null
          origem?: string
          registro_id?: string
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      banco_horas_ajustes_retroativos: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          ano_aplicacao: number | null
          ano_referencia: number
          created_at: string
          created_by: string | null
          detalhes_mudanca: Json | null
          diferenca: string | null
          diferenca_minutos: number | null
          empresa_id: string
          fechamento_id: string
          id: string
          mes_aplicacao: number | null
          mes_referencia: number
          motivo_decisao: string | null
          reajuste_gerado_id: string | null
          status: string
          sync_id: string | null
          tipo_dado: string
          updated_at: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          ano_aplicacao?: number | null
          ano_referencia: number
          created_at?: string
          created_by?: string | null
          detalhes_mudanca?: Json | null
          diferenca?: string | null
          diferenca_minutos?: number | null
          empresa_id: string
          fechamento_id: string
          id?: string
          mes_aplicacao?: number | null
          mes_referencia: number
          motivo_decisao?: string | null
          reajuste_gerado_id?: string | null
          status?: string
          sync_id?: string | null
          tipo_dado: string
          updated_at?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          ano_aplicacao?: number | null
          ano_referencia?: number
          created_at?: string
          created_by?: string | null
          detalhes_mudanca?: Json | null
          diferenca?: string | null
          diferenca_minutos?: number | null
          empresa_id?: string
          fechamento_id?: string
          id?: string
          mes_aplicacao?: number | null
          mes_referencia?: number
          motivo_decisao?: string | null
          reajuste_gerado_id?: string | null
          status?: string
          sync_id?: string | null
          tipo_dado?: string
          updated_at?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_ajustes_retroativos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_ajustes_retroativos_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "banco_horas_fechamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_ajustes_retroativos_reajuste_gerado_id_fkey"
            columns: ["reajuste_gerado_id"]
            isOneToOne: false
            referencedRelation: "banco_horas_reajustes"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_alocacoes: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          empresa_id: string
          id: string
          nome_alocacao: string
          percentual_baseline: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          empresa_id: string
          id?: string
          nome_alocacao: string
          percentual_baseline: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          empresa_id?: string
          id?: string
          nome_alocacao?: string
          percentual_baseline?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_alocacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_audit_log: {
        Row: {
          acao: string
          calculo_id: string | null
          created_at: string | null
          created_by: string | null
          dados_acao: Json | null
          descricao: string | null
          empresa_id: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          acao: string
          calculo_id?: string | null
          created_at?: string | null
          created_by?: string | null
          dados_acao?: Json | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          acao?: string
          calculo_id?: string | null
          created_at?: string | null
          created_by?: string | null
          dados_acao?: Json | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_audit_log_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "banco_horas_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_audit_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_calculos: {
        Row: {
          ano: number
          baseline_horas: string | null
          baseline_tickets: number | null
          consumo_horas: string | null
          consumo_tickets: number | null
          consumo_total_horas: string | null
          consumo_total_tickets: number | null
          created_at: string | null
          created_by: string | null
          empresa_id: string
          excedentes_horas: string | null
          excedentes_tickets: number | null
          id: string
          is_fim_periodo: boolean | null
          mes: number
          observacao_publica: string | null
          reajustes_horas: string | null
          reajustes_tickets: number | null
          repasse_horas: string | null
          repasse_tickets: number | null
          repasses_mes_anterior_horas: string | null
          repasses_mes_anterior_tickets: number | null
          requerimentos_horas: string | null
          requerimentos_tickets: number | null
          saldo_a_utilizar_horas: string | null
          saldo_a_utilizar_tickets: number | null
          saldo_horas: string | null
          saldo_tickets: number | null
          taxa_hora_utilizada: number | null
          taxa_ticket_utilizada: number | null
          updated_at: string | null
          updated_by: string | null
          valor_a_faturar: number | null
          valor_excedentes_horas: number | null
          valor_excedentes_tickets: number | null
        }
        Insert: {
          ano: number
          baseline_horas?: string | null
          baseline_tickets?: number | null
          consumo_horas?: string | null
          consumo_tickets?: number | null
          consumo_total_horas?: string | null
          consumo_total_tickets?: number | null
          created_at?: string | null
          created_by?: string | null
          empresa_id: string
          excedentes_horas?: string | null
          excedentes_tickets?: number | null
          id?: string
          is_fim_periodo?: boolean | null
          mes: number
          observacao_publica?: string | null
          reajustes_horas?: string | null
          reajustes_tickets?: number | null
          repasse_horas?: string | null
          repasse_tickets?: number | null
          repasses_mes_anterior_horas?: string | null
          repasses_mes_anterior_tickets?: number | null
          requerimentos_horas?: string | null
          requerimentos_tickets?: number | null
          saldo_a_utilizar_horas?: string | null
          saldo_a_utilizar_tickets?: number | null
          saldo_horas?: string | null
          saldo_tickets?: number | null
          taxa_hora_utilizada?: number | null
          taxa_ticket_utilizada?: number | null
          updated_at?: string | null
          updated_by?: string | null
          valor_a_faturar?: number | null
          valor_excedentes_horas?: number | null
          valor_excedentes_tickets?: number | null
        }
        Update: {
          ano?: number
          baseline_horas?: string | null
          baseline_tickets?: number | null
          consumo_horas?: string | null
          consumo_tickets?: number | null
          consumo_total_horas?: string | null
          consumo_total_tickets?: number | null
          created_at?: string | null
          created_by?: string | null
          empresa_id?: string
          excedentes_horas?: string | null
          excedentes_tickets?: number | null
          id?: string
          is_fim_periodo?: boolean | null
          mes?: number
          observacao_publica?: string | null
          reajustes_horas?: string | null
          reajustes_tickets?: number | null
          repasse_horas?: string | null
          repasse_tickets?: number | null
          repasses_mes_anterior_horas?: string | null
          repasses_mes_anterior_tickets?: number | null
          requerimentos_horas?: string | null
          requerimentos_tickets?: number | null
          saldo_a_utilizar_horas?: string | null
          saldo_a_utilizar_tickets?: number | null
          saldo_horas?: string | null
          saldo_tickets?: number | null
          taxa_hora_utilizada?: number | null
          taxa_ticket_utilizada?: number | null
          updated_at?: string | null
          updated_by?: string | null
          valor_a_faturar?: number | null
          valor_excedentes_horas?: number | null
          valor_excedentes_tickets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_calculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_calculos_segmentados: {
        Row: {
          alocacao_id: string
          baseline_horas: string | null
          baseline_tickets: number | null
          calculo_id: string
          consumo_horas: string | null
          consumo_tickets: number | null
          consumo_total_horas: string | null
          consumo_total_tickets: number | null
          created_at: string | null
          id: string
          reajustes_horas: string | null
          reajustes_tickets: number | null
          repasse_horas: string | null
          repasse_tickets: number | null
          repasses_mes_anterior_horas: string | null
          repasses_mes_anterior_tickets: number | null
          requerimentos_horas: string | null
          requerimentos_tickets: number | null
          saldo_a_utilizar_horas: string | null
          saldo_a_utilizar_tickets: number | null
          saldo_horas: string | null
          saldo_tickets: number | null
        }
        Insert: {
          alocacao_id: string
          baseline_horas?: string | null
          baseline_tickets?: number | null
          calculo_id: string
          consumo_horas?: string | null
          consumo_tickets?: number | null
          consumo_total_horas?: string | null
          consumo_total_tickets?: number | null
          created_at?: string | null
          id?: string
          reajustes_horas?: string | null
          reajustes_tickets?: number | null
          repasse_horas?: string | null
          repasse_tickets?: number | null
          repasses_mes_anterior_horas?: string | null
          repasses_mes_anterior_tickets?: number | null
          requerimentos_horas?: string | null
          requerimentos_tickets?: number | null
          saldo_a_utilizar_horas?: string | null
          saldo_a_utilizar_tickets?: number | null
          saldo_horas?: string | null
          saldo_tickets?: number | null
        }
        Update: {
          alocacao_id?: string
          baseline_horas?: string | null
          baseline_tickets?: number | null
          calculo_id?: string
          consumo_horas?: string | null
          consumo_tickets?: number | null
          consumo_total_horas?: string | null
          consumo_total_tickets?: number | null
          created_at?: string | null
          id?: string
          reajustes_horas?: string | null
          reajustes_tickets?: number | null
          repasse_horas?: string | null
          repasse_tickets?: number | null
          repasses_mes_anterior_horas?: string | null
          repasses_mes_anterior_tickets?: number | null
          requerimentos_horas?: string | null
          requerimentos_tickets?: number | null
          saldo_a_utilizar_horas?: string | null
          saldo_a_utilizar_tickets?: number | null
          saldo_horas?: string | null
          saldo_tickets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_calculos_segmentados_alocacao_id_fkey"
            columns: ["alocacao_id"]
            isOneToOne: false
            referencedRelation: "banco_horas_alocacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_calculos_segmentados_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "banco_horas_calculos"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_envio_agendamento_empresas: {
        Row: {
          agendamento_id: string
          created_at: string
          empresa_id: string
          id: string
        }
        Insert: {
          agendamento_id: string
          created_at?: string
          empresa_id: string
          id?: string
        }
        Update: {
          agendamento_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_envio_agendamento_empresas_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "banco_horas_envio_agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_envio_agendamento_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_envio_agendamentos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          dias_mes: number[]
          dias_semana: number[]
          emails_cc: string[]
          frequencia: string
          hora_fim: string | null
          hora_inicio: string | null
          horarios: string[]
          id: string
          intervalo_horas: number | null
          modo_horario: string
          nome: string
          proxima_execucao: string | null
          ultima_execucao: string | null
          ultimo_dia_mes: boolean
          ultimo_status: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          dias_mes?: number[]
          dias_semana?: number[]
          emails_cc?: string[]
          frequencia: string
          hora_fim?: string | null
          hora_inicio?: string | null
          horarios?: string[]
          id?: string
          intervalo_horas?: number | null
          modo_horario: string
          nome: string
          proxima_execucao?: string | null
          ultima_execucao?: string | null
          ultimo_dia_mes?: boolean
          ultimo_status?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          dias_mes?: number[]
          dias_semana?: number[]
          emails_cc?: string[]
          frequencia?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          horarios?: string[]
          id?: string
          intervalo_horas?: number | null
          modo_horario?: string
          nome?: string
          proxima_execucao?: string | null
          ultima_execucao?: string | null
          ultimo_dia_mes?: boolean
          ultimo_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      banco_horas_envio_execucoes: {
        Row: {
          agendamento_id: string | null
          disparado_por: string | null
          empresa_id: string
          erro: string | null
          executado_para: string
          finalizado_em: string | null
          id: string
          iniciado_em: string
          origem: string
          qtd_destinatarios: number | null
          qtd_emails: number | null
          status: string
        }
        Insert: {
          agendamento_id?: string | null
          disparado_por?: string | null
          empresa_id: string
          erro?: string | null
          executado_para: string
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          origem: string
          qtd_destinatarios?: number | null
          qtd_emails?: number | null
          status?: string
        }
        Update: {
          agendamento_id?: string | null
          disparado_por?: string | null
          empresa_id?: string
          erro?: string | null
          executado_para?: string
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          origem?: string
          qtd_destinatarios?: number | null
          qtd_emails?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_envio_execucoes_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "banco_horas_envio_agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_envio_execucoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_fechamentos: {
        Row: {
          ano: number
          apontamentos_ids: string[] | null
          created_at: string
          empresa_id: string
          fechado_em: string
          fechado_por: string | null
          id: string
          mes: number
          motivo: string | null
          snapshot_calculo: Json | null
          snapshot_consumo_horas: string | null
          snapshot_consumo_tickets: number | null
          snapshot_requerimentos_horas: string | null
          snapshot_requerimentos_tickets: number | null
          tickets_ids: string[] | null
        }
        Insert: {
          ano: number
          apontamentos_ids?: string[] | null
          created_at?: string
          empresa_id: string
          fechado_em?: string
          fechado_por?: string | null
          id?: string
          mes: number
          motivo?: string | null
          snapshot_calculo?: Json | null
          snapshot_consumo_horas?: string | null
          snapshot_consumo_tickets?: number | null
          snapshot_requerimentos_horas?: string | null
          snapshot_requerimentos_tickets?: number | null
          tickets_ids?: string[] | null
        }
        Update: {
          ano?: number
          apontamentos_ids?: string[] | null
          created_at?: string
          empresa_id?: string
          fechado_em?: string
          fechado_por?: string | null
          id?: string
          mes?: number
          motivo?: string | null
          snapshot_calculo?: Json | null
          snapshot_consumo_horas?: string | null
          snapshot_consumo_tickets?: number | null
          snapshot_requerimentos_horas?: string | null
          snapshot_requerimentos_tickets?: number | null
          tickets_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_fechamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_observacoes: {
        Row: {
          ano: number
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          mes: number
          observacao: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          mes: number
          observacao: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          mes?: number
          observacao?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_observacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_reajustes: {
        Row: {
          ano: number
          ativo: boolean | null
          calculo_id: string | null
          created_at: string | null
          created_by: string | null
          empresa_id: string
          empresa_segmentada: string | null
          id: string
          mes: number
          observacao: string | null
          tipo_reajuste: string | null
          valor_reajuste_horas: string | null
          valor_reajuste_tickets: number | null
        }
        Insert: {
          ano: number
          ativo?: boolean | null
          calculo_id?: string | null
          created_at?: string | null
          created_by?: string | null
          empresa_id: string
          empresa_segmentada?: string | null
          id?: string
          mes: number
          observacao?: string | null
          tipo_reajuste?: string | null
          valor_reajuste_horas?: string | null
          valor_reajuste_tickets?: number | null
        }
        Update: {
          ano?: number
          ativo?: boolean | null
          calculo_id?: string | null
          created_at?: string | null
          created_by?: string | null
          empresa_id?: string
          empresa_segmentada?: string | null
          id?: string
          mes?: number
          observacao?: string | null
          tipo_reajuste?: string | null
          valor_reajuste_horas?: string | null
          valor_reajuste_tickets?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_reajustes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_versoes: {
        Row: {
          ano: number | null
          baseline_tickets: number | null
          calculo_id: string | null
          consumo_tickets: number | null
          consumo_total_tickets: number | null
          created_at: string | null
          created_by: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          empresa_id: string | null
          excedentes_tickets: number | null
          id: string
          mes: number | null
          motivo: string | null
          observacao: string | null
          reajuste_id: string | null
          reajustes_tickets: number | null
          repasse_tickets: number | null
          repasses_mes_anterior_tickets: number | null
          requerimentos_tickets: number | null
          saldo_a_utilizar_tickets: number | null
          saldo_tickets: number | null
          snapshot_calculo: Json | null
          tipo_alteracao: string | null
          tipo_mudanca: string | null
          versao: number | null
          versao_anterior: number | null
          versao_nova: number | null
        }
        Insert: {
          ano?: number | null
          baseline_tickets?: number | null
          calculo_id?: string | null
          consumo_tickets?: number | null
          consumo_total_tickets?: number | null
          created_at?: string | null
          created_by?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id?: string | null
          excedentes_tickets?: number | null
          id?: string
          mes?: number | null
          motivo?: string | null
          observacao?: string | null
          reajuste_id?: string | null
          reajustes_tickets?: number | null
          repasse_tickets?: number | null
          repasses_mes_anterior_tickets?: number | null
          requerimentos_tickets?: number | null
          saldo_a_utilizar_tickets?: number | null
          saldo_tickets?: number | null
          snapshot_calculo?: Json | null
          tipo_alteracao?: string | null
          tipo_mudanca?: string | null
          versao?: number | null
          versao_anterior?: number | null
          versao_nova?: number | null
        }
        Update: {
          ano?: number | null
          baseline_tickets?: number | null
          calculo_id?: string | null
          consumo_tickets?: number | null
          consumo_total_tickets?: number | null
          created_at?: string | null
          created_by?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id?: string | null
          excedentes_tickets?: number | null
          id?: string
          mes?: number | null
          motivo?: string | null
          observacao?: string | null
          reajuste_id?: string | null
          reajustes_tickets?: number | null
          repasse_tickets?: number | null
          repasses_mes_anterior_tickets?: number | null
          requerimentos_tickets?: number | null
          saldo_a_utilizar_tickets?: number | null
          saldo_tickets?: number | null
          snapshot_calculo?: Json | null
          tipo_alteracao?: string | null
          tipo_mudanca?: string | null
          versao?: number | null
          versao_anterior?: number | null
          versao_nova?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_versoes_calculo_id_fkey"
            columns: ["calculo_id"]
            isOneToOne: false
            referencedRelation: "banco_horas_calculos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_versoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_versoes_reajuste_id_fkey"
            columns: ["reajuste_id"]
            isOneToOne: false
            referencedRelation: "banco_horas_reajustes"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_horas: {
        Row: {
          ativo: boolean
          consome_outros_bancos: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          dia_fim_apuracao: number
          dia_inicio_apuracao: number
          duracao_periodo_meses: number | null
          empresa_id: string
          espelha_legado: boolean
          filtro_ic_operador: string | null
          filtro_ic_valor: string | null
          fim_vigencia: string | null
          id: string
          inativado_em: string | null
          inativado_por: string | null
          inicio_vigencia: string
          nome: string
          ordem: number
          origem: string
          padrao: boolean
          periodo_apuracao: number
          periodos_ate_zerar: number | null
          repasse_especial: string
          taxa_produto: string
          taxa_tipo_hora: string
          tipo_contrato: string
          updated_at: string
          updated_by: string | null
          visivel_cliente: boolean
        }
        Insert: {
          ativo?: boolean
          consome_outros_bancos?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          dia_fim_apuracao?: number
          dia_inicio_apuracao?: number
          duracao_periodo_meses?: number | null
          empresa_id: string
          espelha_legado?: boolean
          filtro_ic_operador?: string | null
          filtro_ic_valor?: string | null
          fim_vigencia?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          inicio_vigencia: string
          nome: string
          ordem: number
          origem: string
          padrao?: boolean
          periodo_apuracao: number
          periodos_ate_zerar?: number | null
          repasse_especial?: string
          taxa_produto: string
          taxa_tipo_hora?: string
          tipo_contrato: string
          updated_at?: string
          updated_by?: string | null
          visivel_cliente?: boolean
        }
        Update: {
          ativo?: boolean
          consome_outros_bancos?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          dia_fim_apuracao?: number
          dia_inicio_apuracao?: number
          duracao_periodo_meses?: number | null
          empresa_id?: string
          espelha_legado?: boolean
          filtro_ic_operador?: string | null
          filtro_ic_valor?: string | null
          fim_vigencia?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          inicio_vigencia?: string
          nome?: string
          ordem?: number
          origem?: string
          padrao?: boolean
          periodo_apuracao?: number
          periodos_ate_zerar?: number | null
          repasse_especial?: string
          taxa_produto?: string
          taxa_tipo_hora?: string
          tipo_contrato?: string
          updated_at?: string
          updated_by?: string | null
          visivel_cliente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_horas_baseline: {
        Row: {
          banco_id: string
          baseline_minutos: number | null
          baseline_tickets: number | null
          created_at: string
          created_by: string | null
          credito: string
          data_fim: string | null
          data_inicio: string
          id: string
          motivo: string | null
          observacao: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          banco_id: string
          baseline_minutos?: number | null
          baseline_tickets?: number | null
          created_at?: string
          created_by?: string | null
          credito?: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          banco_id?: string
          baseline_minutos?: number | null
          baseline_tickets?: number | null
          created_at?: string
          created_by?: string | null
          credito?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_baseline_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_horas_comparacao: {
        Row: {
          calculado_em: string | null
          consumo_legado_minutos: number
          consumo_legado_tickets: number
          consumo_novo_minutos: number
          consumo_novo_tickets: number
          empresa_id: string
          erro: string | null
          erro_em: string | null
          meses_comparados: number
          situacao: string | null
          validacao_situacao: string | null
          validada_em: string | null
          validada_por: string | null
        }
        Insert: {
          calculado_em?: string | null
          consumo_legado_minutos?: number
          consumo_legado_tickets?: number
          consumo_novo_minutos?: number
          consumo_novo_tickets?: number
          empresa_id: string
          erro?: string | null
          erro_em?: string | null
          meses_comparados?: number
          situacao?: string | null
          validacao_situacao?: string | null
          validada_em?: string | null
          validada_por?: string | null
        }
        Update: {
          calculado_em?: string | null
          consumo_legado_minutos?: number
          consumo_legado_tickets?: number
          consumo_novo_minutos?: number
          consumo_novo_tickets?: number
          empresa_id?: string
          erro?: string | null
          erro_em?: string | null
          meses_comparados?: number
          situacao?: string | null
          validacao_situacao?: string | null
          validada_em?: string | null
          validada_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_comparacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_horas_comparacao_meses: {
        Row: {
          ano: number
          calculado_em: string
          empresa_id: string
          fechamento_legado_em: string
          itens: Json
          itens_total: number
          legado: Json
          mes: number
          novo: Json
          origem_saldo: Json | null
          situacao: string
        }
        Insert: {
          ano: number
          calculado_em?: string
          empresa_id: string
          fechamento_legado_em: string
          itens?: Json
          itens_total?: number
          legado: Json
          mes: number
          novo: Json
          origem_saldo?: Json | null
          situacao: string
        }
        Update: {
          ano?: number
          calculado_em?: string
          empresa_id?: string
          fechamento_legado_em?: string
          itens?: Json
          itens_total?: number
          legado?: Json
          mes?: number
          novo?: Json
          origem_saldo?: Json | null
          situacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_comparacao_meses_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas_comparacao"
            referencedColumns: ["empresa_id"]
          },
        ]
      }
      bancos_horas_escopo: {
        Row: {
          banco_id: string
          created_at: string
          created_by: string | null
          id: string
          modulo_id: string | null
          produto_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          banco_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo_id?: string | null
          produto_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          banco_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          modulo_id?: string | null
          produto_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_escopo_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_horas_escopo_modulo_fk"
            columns: ["modulo_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produto_modulos"
            referencedColumns: ["id", "produto_id"]
          },
          {
            foreignKeyName: "bancos_horas_escopo_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_horas_fechamento_itens: {
        Row: {
          created_at: string
          created_by: string | null
          fechamento_id: string
          id: string
          item_id: string
          minutos: number
          tickets: number
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fechamento_id: string
          id?: string
          item_id: string
          minutos?: number
          tickets?: number
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fechamento_id?: string
          id?: string
          item_id?: string
          minutos?: number
          tickets?: number
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_fechamento_itens_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas_fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_horas_fechamentos: {
        Row: {
          alertas: string[]
          ano: number
          banco_id: string
          baseline_minutos: number | null
          baseline_tickets: number | null
          cedido_outros_minutos: number | null
          cedido_outros_tickets: number | null
          consumido_outros_minutos: number | null
          consumido_outros_tickets: number | null
          consumo_minutos: number | null
          consumo_tickets: number | null
          consumo_total_minutos: number | null
          consumo_total_tickets: number | null
          created_at: string
          created_by: string | null
          excedente_minutos: number | null
          excedente_tickets: number | null
          fechado_em: string
          fechado_por: string | null
          fim_periodo: boolean
          id: string
          mes: number
          motivo: string
          nome_banco: string
          parametros: Json
          percentual_repasse: number | null
          reajustes_minutos: number | null
          reajustes_tickets: number | null
          repasse_anterior_minutos: number | null
          repasse_anterior_tickets: number | null
          repasse_minutos: number | null
          repasse_tickets: number | null
          requerimentos_minutos: number | null
          requerimentos_tickets: number | null
          saldo_a_utilizar_minutos: number | null
          saldo_a_utilizar_tickets: number | null
          saldo_final_minutos: number | null
          saldo_final_tickets: number | null
          saldo_minutos: number | null
          saldo_tickets: number | null
          taxa_hora: number | null
          taxa_ticket: number | null
          transicao_periodo: boolean
          updated_at: string
          updated_by: string | null
          valor_a_faturar: number
          valor_excedente_horas: number
          valor_excedente_tickets: number
          versao: number
          vigente: boolean
        }
        Insert: {
          alertas?: string[]
          ano: number
          banco_id: string
          baseline_minutos?: number | null
          baseline_tickets?: number | null
          cedido_outros_minutos?: number | null
          cedido_outros_tickets?: number | null
          consumido_outros_minutos?: number | null
          consumido_outros_tickets?: number | null
          consumo_minutos?: number | null
          consumo_tickets?: number | null
          consumo_total_minutos?: number | null
          consumo_total_tickets?: number | null
          created_at?: string
          created_by?: string | null
          excedente_minutos?: number | null
          excedente_tickets?: number | null
          fechado_em?: string
          fechado_por?: string | null
          fim_periodo?: boolean
          id?: string
          mes: number
          motivo: string
          nome_banco: string
          parametros?: Json
          percentual_repasse?: number | null
          reajustes_minutos?: number | null
          reajustes_tickets?: number | null
          repasse_anterior_minutos?: number | null
          repasse_anterior_tickets?: number | null
          repasse_minutos?: number | null
          repasse_tickets?: number | null
          requerimentos_minutos?: number | null
          requerimentos_tickets?: number | null
          saldo_a_utilizar_minutos?: number | null
          saldo_a_utilizar_tickets?: number | null
          saldo_final_minutos?: number | null
          saldo_final_tickets?: number | null
          saldo_minutos?: number | null
          saldo_tickets?: number | null
          taxa_hora?: number | null
          taxa_ticket?: number | null
          transicao_periodo?: boolean
          updated_at?: string
          updated_by?: string | null
          valor_a_faturar?: number
          valor_excedente_horas?: number
          valor_excedente_tickets?: number
          versao: number
          vigente?: boolean
        }
        Update: {
          alertas?: string[]
          ano?: number
          banco_id?: string
          baseline_minutos?: number | null
          baseline_tickets?: number | null
          cedido_outros_minutos?: number | null
          cedido_outros_tickets?: number | null
          consumido_outros_minutos?: number | null
          consumido_outros_tickets?: number | null
          consumo_minutos?: number | null
          consumo_tickets?: number | null
          consumo_total_minutos?: number | null
          consumo_total_tickets?: number | null
          created_at?: string
          created_by?: string | null
          excedente_minutos?: number | null
          excedente_tickets?: number | null
          fechado_em?: string
          fechado_por?: string | null
          fim_periodo?: boolean
          id?: string
          mes?: number
          motivo?: string
          nome_banco?: string
          parametros?: Json
          percentual_repasse?: number | null
          reajustes_minutos?: number | null
          reajustes_tickets?: number | null
          repasse_anterior_minutos?: number | null
          repasse_anterior_tickets?: number | null
          repasse_minutos?: number | null
          repasse_tickets?: number | null
          requerimentos_minutos?: number | null
          requerimentos_tickets?: number | null
          saldo_a_utilizar_minutos?: number | null
          saldo_a_utilizar_tickets?: number | null
          saldo_final_minutos?: number | null
          saldo_final_tickets?: number | null
          saldo_minutos?: number | null
          saldo_tickets?: number | null
          taxa_hora?: number | null
          taxa_ticket?: number | null
          transicao_periodo?: boolean
          updated_at?: string
          updated_by?: string | null
          valor_a_faturar?: number
          valor_excedente_horas?: number
          valor_excedente_tickets?: number
          versao?: number
          vigente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_fechamentos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_horas_observacoes: {
        Row: {
          ano: number
          ativo: boolean
          banco_id: string
          created_at: string
          created_by: string | null
          fechamento_id: string | null
          id: string
          inativado_em: string | null
          inativado_por: string | null
          mes: number
          origem: string
          reajuste_id: string | null
          texto: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ano: number
          ativo?: boolean
          banco_id: string
          created_at?: string
          created_by?: string | null
          fechamento_id?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          mes: number
          origem: string
          reajuste_id?: string | null
          texto: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ano?: number
          ativo?: boolean
          banco_id?: string
          created_at?: string
          created_by?: string | null
          fechamento_id?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          mes?: number
          origem?: string
          reajuste_id?: string | null
          texto?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_observacoes_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_horas_observacoes_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas_fechamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_horas_observacoes_reajuste_id_fkey"
            columns: ["reajuste_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas_reajustes"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_horas_reajustes: {
        Row: {
          ano: number
          anotacao_interna: string | null
          ativo: boolean
          banco_id: string
          created_at: string
          created_by: string | null
          id: string
          inativado_em: string | null
          inativado_por: string | null
          justificativa: string
          mes: number
          minutos: number
          motivo_inativacao: string | null
          origem: string
          reajuste_legado_id: string | null
          tickets: number
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ano: number
          anotacao_interna?: string | null
          ativo?: boolean
          banco_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          justificativa: string
          mes: number
          minutos?: number
          motivo_inativacao?: string | null
          origem?: string
          reajuste_legado_id?: string | null
          tickets?: number
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ano?: number
          anotacao_interna?: string | null
          ativo?: boolean
          banco_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          justificativa?: string
          mes?: number
          minutos?: number
          motivo_inativacao?: string | null
          origem?: string
          reajuste_legado_id?: string | null
          tickets?: number
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_reajustes_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_horas_repasse: {
        Row: {
          banco_id: string
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          motivo: string | null
          observacao: string | null
          percentual_dentro_periodo: number | null
          percentual_entre_periodos: number | null
          percentual_mensal: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          banco_id: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          percentual_dentro_periodo?: number | null
          percentual_entre_periodos?: number | null
          percentual_mensal: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          banco_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          percentual_dentro_periodo?: number | null
          percentual_entre_periodos?: number | null
          percentual_mensal?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_repasse_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_horas_retroativos: {
        Row: {
          ano: number
          atualizado_em: string
          banco_id: string
          consumo_antes_minutos: number
          consumo_antes_tickets: number
          consumo_depois_minutos: number
          consumo_depois_tickets: number
          created_at: string
          created_by: string | null
          decidido_em: string | null
          decidido_por: string | null
          detectado_em: string
          fechamento_aplicado_id: string | null
          fechamento_id: string
          id: string
          justificativa: string | null
          mes: number
          situacao: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ano: number
          atualizado_em?: string
          banco_id: string
          consumo_antes_minutos: number
          consumo_antes_tickets: number
          consumo_depois_minutos: number
          consumo_depois_tickets: number
          created_at?: string
          created_by?: string | null
          decidido_em?: string | null
          decidido_por?: string | null
          detectado_em?: string
          fechamento_aplicado_id?: string | null
          fechamento_id: string
          id?: string
          justificativa?: string | null
          mes: number
          situacao?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ano?: number
          atualizado_em?: string
          banco_id?: string
          consumo_antes_minutos?: number
          consumo_antes_tickets?: number
          consumo_depois_minutos?: number
          consumo_depois_tickets?: number
          created_at?: string
          created_by?: string | null
          decidido_em?: string | null
          decidido_por?: string | null
          detectado_em?: string
          fechamento_aplicado_id?: string | null
          fechamento_id?: string
          id?: string
          justificativa?: string | null
          mes?: number
          situacao?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_retroativos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_horas_retroativos_fechamento_aplicado_id_fkey"
            columns: ["fechamento_aplicado_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas_fechamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_horas_retroativos_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas_fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_horas_retroativos_itens: {
        Row: {
          aviso_enviado_em: string | null
          aviso_enviado_por: string | null
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          minutos: number
          retroativo_id: string
          tickets: number
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          aviso_enviado_em?: string | null
          aviso_enviado_por?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          minutos?: number
          retroativo_id: string
          tickets?: number
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          aviso_enviado_em?: string | null
          aviso_enviado_por?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          minutos?: number
          retroativo_id?: string
          tickets?: number
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_retroativos_itens_retroativo_id_fkey"
            columns: ["retroativo_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas_retroativos"
            referencedColumns: ["id"]
          },
        ]
      }
      bancos_horas_transferencias: {
        Row: {
          created_at: string
          created_by: string | null
          fechamento_cedente_id: string
          fechamento_consumidor_id: string
          id: string
          quantidade: number
          unidade: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fechamento_cedente_id: string
          fechamento_consumidor_id: string
          id?: string
          quantidade: number
          unidade: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fechamento_cedente_id?: string
          fechamento_consumidor_id?: string
          id?: string
          quantidade?: number
          unidade?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bancos_horas_transferencias_fechamento_cedente_id_fkey"
            columns: ["fechamento_cedente_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas_fechamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bancos_horas_transferencias_fechamento_consumidor_id_fkey"
            columns: ["fechamento_consumidor_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas_fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      baseline_historico: {
        Row: {
          baseline_horas: number | null
          baseline_tickets: number | null
          created_at: string | null
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          empresa_id: string
          id: string
          motivo: string | null
          observacao: string | null
          tipo_banco: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          baseline_horas?: number | null
          baseline_tickets?: number | null
          created_at?: string | null
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          empresa_id: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          tipo_banco?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          baseline_horas?: number | null
          baseline_tickets?: number | null
          created_at?: string | null
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          empresa_id?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          tipo_banco?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "baseline_historico_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baseline_historico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baseline_historico_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      book_generation_queue: {
        Row: {
          ano: number
          batch_id: string
          book_id: string | null
          completed_at: string | null
          created_at: string
          criado_por: string | null
          destinatarios_email: string[] | null
          email_enviado: boolean | null
          empresa_id: string
          empresa_nome: string | null
          empresa_nome_abreviado: string | null
          enviar_email: boolean | null
          erro_mensagem: string | null
          etapa_atual: string | null
          forcar_atualizacao: boolean | null
          id: string
          mes: number
          pdf_url: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ano: number
          batch_id?: string
          book_id?: string | null
          completed_at?: string | null
          created_at?: string
          criado_por?: string | null
          destinatarios_email?: string[] | null
          email_enviado?: boolean | null
          empresa_id: string
          empresa_nome?: string | null
          empresa_nome_abreviado?: string | null
          enviar_email?: boolean | null
          erro_mensagem?: string | null
          etapa_atual?: string | null
          forcar_atualizacao?: boolean | null
          id?: string
          mes: number
          pdf_url?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ano?: number
          batch_id?: string
          book_id?: string | null
          completed_at?: string | null
          created_at?: string
          criado_por?: string | null
          destinatarios_email?: string[] | null
          email_enviado?: boolean | null
          empresa_id?: string
          empresa_nome?: string | null
          empresa_nome_abreviado?: string | null
          enviar_email?: boolean | null
          erro_mensagem?: string | null
          etapa_atual?: string | null
          forcar_atualizacao?: boolean | null
          id?: string
          mes?: number
          pdf_url?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_generation_queue_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          ano: number
          created_at: string | null
          dados_backlog: Json | null
          dados_capa: Json | null
          dados_consumo: Json | null
          dados_consumo_segmentado: Json | null
          dados_pesquisa: Json | null
          dados_requerimentos_em_desenvolvimento: Json | null
          dados_requerimentos_faturados: Json | null
          dados_sla: Json | null
          dados_volumetria: Json | null
          destinatarios_envio: string[] | null
          empresa_id: string
          enviado_em: string | null
          enviado_por: string | null
          erro_detalhes: string | null
          id: string
          mes: number
          pdf_gerado_em: string | null
          pdf_url: string | null
          precisa_retificacao: boolean | null
          status: string
          updated_at: string | null
          versao_atual: number | null
        }
        Insert: {
          ano: number
          created_at?: string | null
          dados_backlog?: Json | null
          dados_capa?: Json | null
          dados_consumo?: Json | null
          dados_consumo_segmentado?: Json | null
          dados_pesquisa?: Json | null
          dados_requerimentos_em_desenvolvimento?: Json | null
          dados_requerimentos_faturados?: Json | null
          dados_sla?: Json | null
          dados_volumetria?: Json | null
          destinatarios_envio?: string[] | null
          empresa_id: string
          enviado_em?: string | null
          enviado_por?: string | null
          erro_detalhes?: string | null
          id?: string
          mes: number
          pdf_gerado_em?: string | null
          pdf_url?: string | null
          precisa_retificacao?: boolean | null
          status?: string
          updated_at?: string | null
          versao_atual?: number | null
        }
        Update: {
          ano?: number
          created_at?: string | null
          dados_backlog?: Json | null
          dados_capa?: Json | null
          dados_consumo?: Json | null
          dados_consumo_segmentado?: Json | null
          dados_pesquisa?: Json | null
          dados_requerimentos_em_desenvolvimento?: Json | null
          dados_requerimentos_faturados?: Json | null
          dados_sla?: Json | null
          dados_volumetria?: Json | null
          destinatarios_envio?: string[] | null
          empresa_id?: string
          enviado_em?: string | null
          enviado_por?: string | null
          erro_detalhes?: string | null
          id?: string
          mes?: number
          pdf_gerado_em?: string | null
          pdf_url?: string | null
          precisa_retificacao?: boolean | null
          status?: string
          updated_at?: string | null
          versao_atual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "books_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      books_consumo_bancos: {
        Row: {
          banco_id: string
          book_id: string
          created_at: string
          created_by: string | null
          dados: Json
          empresa_id: string
          fechamento_id: string | null
          id: string
          nome_banco: string
          nome_empresa: string
          ordem: number
        }
        Insert: {
          banco_id: string
          book_id: string
          created_at?: string
          created_by?: string | null
          dados: Json
          empresa_id: string
          fechamento_id?: string | null
          id?: string
          nome_banco: string
          nome_empresa: string
          ordem: number
        }
        Update: {
          banco_id?: string
          book_id?: string
          created_at?: string
          created_by?: string | null
          dados?: Json
          empresa_id?: string
          fechamento_id?: string | null
          id?: string
          nome_banco?: string
          nome_empresa?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "books_consumo_bancos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_consumo_bancos_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_consumo_bancos_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_com_empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_consumo_bancos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_consumo_bancos_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas_fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      books_historico_geracao: {
        Row: {
          acao: string
          book_id: string | null
          created_at: string | null
          detalhes: Json | null
          id: string
          status: string
          tempo_processamento_ms: number | null
          usuario_id: string | null
        }
        Insert: {
          acao: string
          book_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          status: string
          tempo_processamento_ms?: number | null
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          book_id?: string | null
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          status?: string
          tempo_processamento_ms?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_historico_geracao_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_historico_geracao_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_com_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      books_versoes: {
        Row: {
          book_id: string
          created_at: string
          dados_backlog: Json | null
          dados_capa: Json | null
          dados_consumo: Json | null
          dados_pesquisa: Json | null
          dados_sla: Json | null
          dados_volumetria: Json | null
          destinatarios: string[]
          enviado_em: string
          enviado_por: string | null
          id: string
          motivo_retificacao: string | null
          pdf_gerado_em: string | null
          pdf_url: string | null
          retificado_em: string | null
          retificado_por: string | null
          versao: number
        }
        Insert: {
          book_id: string
          created_at?: string
          dados_backlog?: Json | null
          dados_capa?: Json | null
          dados_consumo?: Json | null
          dados_pesquisa?: Json | null
          dados_sla?: Json | null
          dados_volumetria?: Json | null
          destinatarios?: string[]
          enviado_em?: string
          enviado_por?: string | null
          id?: string
          motivo_retificacao?: string | null
          pdf_gerado_em?: string | null
          pdf_url?: string | null
          retificado_em?: string | null
          retificado_por?: string | null
          versao: number
        }
        Update: {
          book_id?: string
          created_at?: string
          dados_backlog?: Json | null
          dados_capa?: Json | null
          dados_consumo?: Json | null
          dados_pesquisa?: Json | null
          dados_sla?: Json | null
          dados_volumetria?: Json | null
          destinatarios?: string[]
          enviado_em?: string
          enviado_por?: string | null
          id?: string
          motivo_retificacao?: string | null
          pdf_gerado_em?: string | null
          pdf_url?: string | null
          retificado_em?: string | null
          retificado_por?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "books_versoes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "books_versoes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books_com_empresa"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          created_at: string | null
          data_status: string | null
          descricao_status: string | null
          email: string
          empresa_id: string | null
          finalidade_envio: string
          funcao: string | null
          id: string
          nome_completo: string
          principal_contato: boolean | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_status?: string | null
          descricao_status?: string | null
          email: string
          empresa_id?: string | null
          finalidade_envio?: string
          funcao?: string | null
          id?: string
          nome_completo: string
          principal_contato?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_status?: string | null
          descricao_status?: string | null
          email?: string
          empresa_id?: string | null
          finalidade_envio?: string
          funcao?: string | null
          id?: string
          nome_completo?: string
          principal_contato?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      codigo_resolucao_modificacoes_aranda: {
        Row: {
          created: string
          created_at: string | null
          id: string
          id_externo: string
          item_id: string
          new_value: string | null
          old_value: string | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          created: string
          created_at?: string | null
          id?: string
          id_externo: string
          item_id: string
          new_value?: string | null
          old_value?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created?: string
          created_at?: string | null
          id?: string
          id_externo?: string
          item_id?: string
          new_value?: string | null
          old_value?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      codigos_resolucao_banco: {
        Row: {
          codigo: string
          conta_horas: boolean
          conta_tickets: boolean
          created_at: string
          created_by: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          codigo: string
          conta_horas: boolean
          conta_tickets: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          codigo?: string
          conta_horas?: boolean
          conta_tickets?: boolean
          created_at?: string
          created_by?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      controle_mensal: {
        Row: {
          ano: number
          created_at: string | null
          data_processamento: string | null
          empresa_id: string | null
          id: string
          mes: number
          observacoes: string | null
          status: string | null
        }
        Insert: {
          ano: number
          created_at?: string | null
          data_processamento?: string | null
          empresa_id?: string | null
          id?: string
          mes: number
          observacoes?: string | null
          status?: string | null
        }
        Update: {
          ano?: number
          created_at?: string | null
          data_processamento?: string | null
          empresa_id?: string | null
          id?: string
          mes?: number
          observacoes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "controle_mensal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      de_para_categoria: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          criado_por: string | null
          grupo: string | null
          grupo_book: string | null
          id: string
          status: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          grupo?: string | null
          grupo_book?: string | null
          id?: string
          status?: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          grupo?: string | null
          grupo_book?: string | null
          id?: string
          status?: string
        }
        Relationships: []
      }
      elogio_especialistas: {
        Row: {
          created_at: string | null
          elogio_id: string
          especialista_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          elogio_id: string
          especialista_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          elogio_id?: string
          especialista_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elogio_especialistas_elogio_id_fkey"
            columns: ["elogio_id"]
            isOneToOne: false
            referencedRelation: "elogios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elogio_especialistas_especialista_id_fkey"
            columns: ["especialista_id"]
            isOneToOne: false
            referencedRelation: "especialistas"
            referencedColumns: ["id"]
          },
        ]
      }
      elogios: {
        Row: {
          acao_tomada: string | null
          atualizado_em: string | null
          chamado: string | null
          compartilhado_com: string | null
          criado_em: string | null
          criado_por: string | null
          data_resposta: string | null
          empresa_id: string | null
          id: string
          observacao: string | null
          pesquisa_id: string
          status: string | null
        }
        Insert: {
          acao_tomada?: string | null
          atualizado_em?: string | null
          chamado?: string | null
          compartilhado_com?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_resposta?: string | null
          empresa_id?: string | null
          id?: string
          observacao?: string | null
          pesquisa_id: string
          status?: string | null
        }
        Update: {
          acao_tomada?: string | null
          atualizado_em?: string | null
          chamado?: string | null
          compartilhado_com?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_resposta?: string | null
          empresa_id?: string | null
          id?: string
          observacao?: string | null
          pesquisa_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elogios_empresa_id_fkey1"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elogios_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: true
            referencedRelation: "pesquisas_satisfacao"
            referencedColumns: ["id"]
          },
        ]
      }
      elogios_historico: {
        Row: {
          criado_em: string | null
          data_atualizacao: string | null
          descricao_atualizacao: string
          elogio_id: string
          id: string
          tipo_atualizacao: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          criado_em?: string | null
          data_atualizacao?: string | null
          descricao_atualizacao: string
          elogio_id: string
          id?: string
          tipo_atualizacao?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          criado_em?: string | null
          data_atualizacao?: string | null
          descricao_atualizacao?: string
          elogio_id?: string
          id?: string
          tipo_atualizacao?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elogios_historico_elogio_id_fkey"
            columns: ["elogio_id"]
            isOneToOne: false
            referencedRelation: "elogios"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          assunto: string
          created_at: string | null
          destinatario: string
          enviado_em: string | null
          erro: string | null
          id: string
          status: string
        }
        Insert: {
          assunto: string
          created_at?: string | null
          destinatario: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          status?: string
        }
        Update: {
          assunto?: string
          created_at?: string | null
          destinatario?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          status?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          assunto: string
          ativo: boolean | null
          converter_em_imagem: boolean
          corpo: string
          created_at: string | null
          descricao: string | null
          formulario: string | null
          id: string
          modalidade: string | null
          nome: string
          tipo: string | null
          updated_at: string | null
          vinculado_formulario: boolean | null
        }
        Insert: {
          assunto: string
          ativo?: boolean | null
          converter_em_imagem?: boolean
          corpo: string
          created_at?: string | null
          descricao?: string | null
          formulario?: string | null
          id?: string
          modalidade?: string | null
          nome?: string
          tipo?: string | null
          updated_at?: string | null
          vinculado_formulario?: boolean | null
        }
        Update: {
          assunto?: string
          ativo?: boolean | null
          converter_em_imagem?: boolean
          corpo?: string
          created_at?: string | null
          descricao?: string | null
          formulario?: string | null
          id?: string
          modalidade?: string | null
          nome?: string
          tipo?: string | null
          updated_at?: string | null
          vinculado_formulario?: boolean | null
        }
        Relationships: []
      }
      email_test_data: {
        Row: {
          created_at: string
          created_by: string | null
          dados: Json
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dados: Json
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dados?: Json
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      empresa_anexos: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome_arquivo: string
          nome_original: string
          ordem: number
          storage_path: string
          tamanho_bytes: number
          tipo_mime: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome_arquivo: string
          nome_original: string
          ordem?: number
          storage_path: string
          tamanho_bytes: number
          tipo_mime: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome_arquivo?: string
          nome_original?: string
          ordem?: number
          storage_path?: string
          tamanho_bytes?: number
          tipo_mime?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresa_anexos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_grupos: {
        Row: {
          created_at: string | null
          empresa_id: string | null
          grupo_id: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          empresa_id?: string | null
          grupo_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string | null
          grupo_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_grupos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_grupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_produtos: {
        Row: {
          created_at: string | null
          empresa_id: string | null
          id: string
          produto: string
        }
        Insert: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          produto: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string | null
          id?: string
          produto?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          book_anexo: boolean
          book_personalizado: boolean
          created_at: string
          created_by: string | null
          data_status: string | null
          descricao_status: string | null
          em_projeto: boolean
          email_comercial: string | null
          email_gestor: string | null
          email_tm: string | null
          empresa_consolidadora_id: string | null
          excluida_no_legado_em: string | null
          grupo_empresarial: string | null
          id: string
          id_aranda: string | null
          link_sharepoint: string | null
          meta_sla_percentual: number | null
          modelo_alterado_em: string | null
          modelo_alterado_por: string | null
          modelo_calculo: string
          nome_abreviado: string
          nome_completo: string
          observacao: string | null
          quantidade_minima_chamados_sla: number | null
          sincronizado_em: string | null
          status: string
          tem_ams: boolean
          template_padrao: string | null
          tipo_book: string
          updated_at: string
          updated_by: string | null
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          book_anexo?: boolean
          book_personalizado?: boolean
          created_at?: string
          created_by?: string | null
          data_status?: string | null
          descricao_status?: string | null
          em_projeto?: boolean
          email_comercial?: string | null
          email_gestor?: string | null
          email_tm?: string | null
          empresa_consolidadora_id?: string | null
          excluida_no_legado_em?: string | null
          grupo_empresarial?: string | null
          id: string
          id_aranda?: string | null
          link_sharepoint?: string | null
          meta_sla_percentual?: number | null
          modelo_alterado_em?: string | null
          modelo_alterado_por?: string | null
          modelo_calculo?: string
          nome_abreviado: string
          nome_completo: string
          observacao?: string | null
          quantidade_minima_chamados_sla?: number | null
          sincronizado_em?: string | null
          status?: string
          tem_ams?: boolean
          template_padrao?: string | null
          tipo_book?: string
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          book_anexo?: boolean
          book_personalizado?: boolean
          created_at?: string
          created_by?: string | null
          data_status?: string | null
          descricao_status?: string | null
          em_projeto?: boolean
          email_comercial?: string | null
          email_gestor?: string | null
          email_tm?: string | null
          empresa_consolidadora_id?: string | null
          excluida_no_legado_em?: string | null
          grupo_empresarial?: string | null
          id?: string
          id_aranda?: string | null
          link_sharepoint?: string | null
          meta_sla_percentual?: number | null
          modelo_alterado_em?: string | null
          modelo_alterado_por?: string | null
          modelo_calculo?: string
          nome_abreviado?: string
          nome_completo?: string
          observacao?: string | null
          quantidade_minima_chamados_sla?: number | null
          sincronizado_em?: string | null
          status?: string
          tem_ams?: boolean
          template_padrao?: string | null
          tipo_book?: string
          updated_at?: string
          updated_by?: string | null
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_empresa_consolidadora_id_fkey"
            columns: ["empresa_consolidadora_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_clientes: {
        Row: {
          anexo: boolean | null
          baseline_horas_mensal: string | null
          baseline_segmentado: boolean | null
          baseline_tickets_mensal: number | null
          book_personalizado: boolean | null
          ciclo_atual: number | null
          ciclos_para_zerar: number | null
          created_at: string | null
          data_status: string | null
          descricao_status: string | null
          dia_fim_apuracao: number | null
          dia_inicio_apuracao: number | null
          duracao_periodo_meses: number | null
          em_projeto: boolean | null
          email_comercial: string | null
          email_gestor: string | null
          email_tm: string | null
          empresa_consolidadora_id: string | null
          id: string
          inicio_vigencia: string | null
          link_sharepoint: string | null
          meta_sla_percentual: number | null
          nome_abreviado: string
          nome_completo: string
          observacao: string | null
          percentual_dentro_periodo: number | null
          percentual_entre_periodos: number | null
          percentual_repasse_especial: number | null
          percentual_repasse_mensal: number | null
          periodo_apuracao: number | null
          periodos_ate_zerar: number | null
          possui_repasse_especial: boolean | null
          quantidade_minima_chamados_sla: number | null
          segmentacao_config: Json | null
          status: string | null
          tem_ams: boolean | null
          template_padrao: string | null
          tipo_book: Database["public"]["Enums"]["tipo_book_enum"] | null
          tipo_cobranca:
            | Database["public"]["Enums"]["tipo_cobranca_enum"]
            | null
          tipo_contrato: string | null
          tipo_repasse_especial: string | null
          updated_at: string | null
          vigencia_final: string | null
          vigencia_inicial: string | null
        }
        Insert: {
          anexo?: boolean | null
          baseline_horas_mensal?: string | null
          baseline_segmentado?: boolean | null
          baseline_tickets_mensal?: number | null
          book_personalizado?: boolean | null
          ciclo_atual?: number | null
          ciclos_para_zerar?: number | null
          created_at?: string | null
          data_status?: string | null
          descricao_status?: string | null
          dia_fim_apuracao?: number | null
          dia_inicio_apuracao?: number | null
          duracao_periodo_meses?: number | null
          em_projeto?: boolean | null
          email_comercial?: string | null
          email_gestor?: string | null
          email_tm?: string | null
          empresa_consolidadora_id?: string | null
          id?: string
          inicio_vigencia?: string | null
          link_sharepoint?: string | null
          meta_sla_percentual?: number | null
          nome_abreviado: string
          nome_completo: string
          observacao?: string | null
          percentual_dentro_periodo?: number | null
          percentual_entre_periodos?: number | null
          percentual_repasse_especial?: number | null
          percentual_repasse_mensal?: number | null
          periodo_apuracao?: number | null
          periodos_ate_zerar?: number | null
          possui_repasse_especial?: boolean | null
          quantidade_minima_chamados_sla?: number | null
          segmentacao_config?: Json | null
          status?: string | null
          tem_ams?: boolean | null
          template_padrao?: string | null
          tipo_book?: Database["public"]["Enums"]["tipo_book_enum"] | null
          tipo_cobranca?:
            | Database["public"]["Enums"]["tipo_cobranca_enum"]
            | null
          tipo_contrato?: string | null
          tipo_repasse_especial?: string | null
          updated_at?: string | null
          vigencia_final?: string | null
          vigencia_inicial?: string | null
        }
        Update: {
          anexo?: boolean | null
          baseline_horas_mensal?: string | null
          baseline_segmentado?: boolean | null
          baseline_tickets_mensal?: number | null
          book_personalizado?: boolean | null
          ciclo_atual?: number | null
          ciclos_para_zerar?: number | null
          created_at?: string | null
          data_status?: string | null
          descricao_status?: string | null
          dia_fim_apuracao?: number | null
          dia_inicio_apuracao?: number | null
          duracao_periodo_meses?: number | null
          em_projeto?: boolean | null
          email_comercial?: string | null
          email_gestor?: string | null
          email_tm?: string | null
          empresa_consolidadora_id?: string | null
          id?: string
          inicio_vigencia?: string | null
          link_sharepoint?: string | null
          meta_sla_percentual?: number | null
          nome_abreviado?: string
          nome_completo?: string
          observacao?: string | null
          percentual_dentro_periodo?: number | null
          percentual_entre_periodos?: number | null
          percentual_repasse_especial?: number | null
          percentual_repasse_mensal?: number | null
          periodo_apuracao?: number | null
          periodos_ate_zerar?: number | null
          possui_repasse_especial?: boolean | null
          quantidade_minima_chamados_sla?: number | null
          segmentacao_config?: Json | null
          status?: string | null
          tem_ams?: boolean | null
          template_padrao?: string | null
          tipo_book?: Database["public"]["Enums"]["tipo_book_enum"] | null
          tipo_cobranca?:
            | Database["public"]["Enums"]["tipo_cobranca_enum"]
            | null
          tipo_contrato?: string | null
          tipo_repasse_especial?: string | null
          updated_at?: string | null
          vigencia_final?: string | null
          vigencia_inicial?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_clientes_empresa_consolidadora_id_fkey"
            columns: ["empresa_consolidadora_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_informacoes_contrato: {
        Row: {
          created_at: string
          created_by: string | null
          descricao_atividade: string | null
          empresa_id: string
          fiscal_atualizacao_contratada: boolean | null
          fiscal_atualizacoes_por_ano: number | null
          fiscal_banco_dados: string | null
          fiscal_dba: string | null
          fiscal_dba_minutos_atendimento: number | null
          fiscal_dba_minutos_monitoramento: number | null
          fiscal_edocs_24x7: boolean | null
          fiscal_modalidade: string | null
          ramo_atividade_id: string | null
          ramo_secundario_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao_atividade?: string | null
          empresa_id: string
          fiscal_atualizacao_contratada?: boolean | null
          fiscal_atualizacoes_por_ano?: number | null
          fiscal_banco_dados?: string | null
          fiscal_dba?: string | null
          fiscal_dba_minutos_atendimento?: number | null
          fiscal_dba_minutos_monitoramento?: number | null
          fiscal_edocs_24x7?: boolean | null
          fiscal_modalidade?: string | null
          ramo_atividade_id?: string | null
          ramo_secundario_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao_atividade?: string | null
          empresa_id?: string
          fiscal_atualizacao_contratada?: boolean | null
          fiscal_atualizacoes_por_ano?: number | null
          fiscal_banco_dados?: string | null
          fiscal_dba?: string | null
          fiscal_dba_minutos_atendimento?: number | null
          fiscal_dba_minutos_monitoramento?: number | null
          fiscal_edocs_24x7?: boolean | null
          fiscal_modalidade?: string | null
          ramo_atividade_id?: string | null
          ramo_secundario_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_informacoes_contrato_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_informacoes_contrato_ramo_atividade_id_fkey"
            columns: ["ramo_atividade_id"]
            isOneToOne: false
            referencedRelation: "ramos_atividade"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_informacoes_contrato_ramo_secundario_id_fkey"
            columns: ["ramo_secundario_id"]
            isOneToOne: false
            referencedRelation: "ramos_atividade"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_organizacoes_aranda: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          empresa_id: string
          id: string
          inativado_em: string | null
          inativado_por: string | null
          nome_organizacao: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          empresa_id: string
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          nome_organizacao: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          empresa_id?: string
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          nome_organizacao?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_organizacoes_aranda_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_solucoes: {
        Row: {
          created_at: string
          created_by: string | null
          em_projeto: boolean
          empresa_id: string
          id: string
          justificativa_projeto: string | null
          solucao_id: string
          tem_ams: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          em_projeto?: boolean
          empresa_id: string
          id?: string
          justificativa_projeto?: string | null
          solucao_id: string
          tem_ams: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          em_projeto?: boolean
          empresa_id?: string
          id?: string
          justificativa_projeto?: string | null
          solucao_id?: string
          tem_ams?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_solucoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_solucoes_solucao_id_fkey"
            columns: ["solucao_id"]
            isOneToOne: false
            referencedRelation: "solucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      especialistas: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          cargo: string | null
          codigo: string | null
          created_at: string | null
          departamento: string | null
          email: string | null
          empresa: string | null
          especialidade: string | null
          id: string
          id_externo: string | null
          nivel: string | null
          nome: string
          observacoes: string | null
          origem: Database["public"]["Enums"]["origem_especialista_enum"]
          status: Database["public"]["Enums"]["status_especialista_enum"]
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          cargo?: string | null
          codigo?: string | null
          created_at?: string | null
          departamento?: string | null
          email?: string | null
          empresa?: string | null
          especialidade?: string | null
          id?: string
          id_externo?: string | null
          nivel?: string | null
          nome: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_especialista_enum"]
          status?: Database["public"]["Enums"]["status_especialista_enum"]
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          cargo?: string | null
          codigo?: string | null
          created_at?: string | null
          departamento?: string | null
          email?: string | null
          empresa?: string | null
          especialidade?: string | null
          id?: string
          id_externo?: string | null
          nivel?: string | null
          nome?: string
          observacoes?: string | null
          origem?: Database["public"]["Enums"]["origem_especialista_enum"]
          status?: Database["public"]["Enums"]["status_especialista_enum"]
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      especialistas_coordenadores: {
        Row: {
          coordenador_id: string
          created_at: string
          created_by: string | null
          especialista_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coordenador_id: string
          created_at?: string
          created_by?: string | null
          especialista_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coordenador_id?: string
          created_at?: string
          created_by?: string | null
          especialista_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "especialistas_coordenadores_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "organizacao_estrutura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "especialistas_coordenadores_especialista_id_fkey"
            columns: ["especialista_id"]
            isOneToOne: true
            referencedRelation: "especialistas"
            referencedColumns: ["id"]
          },
        ]
      }
      grupo_emails: {
        Row: {
          created_at: string | null
          email: string
          grupo_id: string | null
          id: string
          nome: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          grupo_id?: string | null
          id?: string
          nome?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          grupo_id?: string | null
          id?: string
          nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupo_emails_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_aranda: {
        Row: {
          ativo: boolean
          classificacao: string
          created_at: string
          created_by: string | null
          grupo_aranda: string
          grupo_book: string
          id: string
          inativado_em: string | null
          inativado_por: string | null
          modulo_id: string | null
          produto_id: string | null
          solucao_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          classificacao: string
          created_at?: string
          created_by?: string | null
          grupo_aranda: string
          grupo_book: string
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          modulo_id?: string | null
          produto_id?: string | null
          solucao_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          classificacao?: string
          created_at?: string
          created_by?: string | null
          grupo_aranda?: string
          grupo_book?: string
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          modulo_id?: string | null
          produto_id?: string | null
          solucao_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupos_aranda_modulo_fk"
            columns: ["modulo_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produto_modulos"
            referencedColumns: ["id", "produto_id"]
          },
          {
            foreignKeyName: "grupos_aranda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupos_aranda_solucao_id_fkey"
            columns: ["solucao_id"]
            isOneToOne: false
            referencedRelation: "solucoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupos_aranda_solucao_produto_fk"
            columns: ["produto_id", "solucao_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id", "solucao_id"]
          },
        ]
      }
      grupos_aranda_vinculos: {
        Row: {
          created_at: string
          created_by: string | null
          grupo_id: string
          id: string
          modulo_id: string | null
          produto_id: string | null
          solucao_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grupo_id: string
          id?: string
          modulo_id?: string | null
          produto_id?: string | null
          solucao_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grupo_id?: string
          id?: string
          modulo_id?: string | null
          produto_id?: string | null
          solucao_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupos_aranda_vinculos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_aranda"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grupos_aranda_vinculos_modulo_fk"
            columns: ["modulo_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produto_modulos"
            referencedColumns: ["id", "produto_id"]
          },
          {
            foreignKeyName: "grupos_aranda_vinculos_produto_fk"
            columns: ["produto_id", "solucao_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id", "solucao_id"]
          },
          {
            foreignKeyName: "grupos_aranda_vinculos_solucao_id_fkey"
            columns: ["solucao_id"]
            isOneToOne: false
            referencedRelation: "solucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_responsaveis: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      historico_disparos: {
        Row: {
          anexo_id: string | null
          anexo_processado: boolean | null
          assunto: string | null
          cliente_id: string | null
          colaborador_id: string | null
          created_at: string | null
          data_agendamento: string | null
          data_disparo: string | null
          emails_cc: string[] | null
          empresa_id: string | null
          erro_detalhes: string | null
          id: string
          status: string
          template_id: string | null
        }
        Insert: {
          anexo_id?: string | null
          anexo_processado?: boolean | null
          assunto?: string | null
          cliente_id?: string | null
          colaborador_id?: string | null
          created_at?: string | null
          data_agendamento?: string | null
          data_disparo?: string | null
          emails_cc?: string[] | null
          empresa_id?: string | null
          erro_detalhes?: string | null
          id?: string
          status: string
          template_id?: string | null
        }
        Update: {
          anexo_id?: string | null
          anexo_processado?: boolean | null
          assunto?: string | null
          cliente_id?: string | null
          colaborador_id?: string | null
          created_at?: string | null
          data_agendamento?: string | null
          data_disparo?: string | null
          emails_cc?: string[] | null
          empresa_id?: string | null
          erro_detalhes?: string | null
          id?: string
          status?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_disparos_anexo_id_fkey"
            columns: ["anexo_id"]
            isOneToOne: false
            referencedRelation: "anexos_temporarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_disparos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_disparos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_inconsistencias_chamados: {
        Row: {
          analista: string | null
          ano_referencia: number
          created_at: string | null
          data_atividade: string | null
          data_envio: string
          data_sistema: string | null
          descricao_inconsistencia: string
          email_analista: string | null
          email_cc: string | null
          empresa: string | null
          enviado_por: string | null
          enviado_por_nome: string | null
          id: string
          inconsistencia_id: string | null
          mes_referencia: number
          nro_chamado: string
          origem: string
          tempo_gasto_horas: string | null
          tempo_gasto_minutos: number | null
          tipo_chamado: string | null
          tipo_inconsistencia: string
          updated_at: string | null
        }
        Insert: {
          analista?: string | null
          ano_referencia: number
          created_at?: string | null
          data_atividade?: string | null
          data_envio?: string
          data_sistema?: string | null
          descricao_inconsistencia: string
          email_analista?: string | null
          email_cc?: string | null
          empresa?: string | null
          enviado_por?: string | null
          enviado_por_nome?: string | null
          id?: string
          inconsistencia_id?: string | null
          mes_referencia: number
          nro_chamado: string
          origem: string
          tempo_gasto_horas?: string | null
          tempo_gasto_minutos?: number | null
          tipo_chamado?: string | null
          tipo_inconsistencia: string
          updated_at?: string | null
        }
        Update: {
          analista?: string | null
          ano_referencia?: number
          created_at?: string | null
          data_atividade?: string | null
          data_envio?: string
          data_sistema?: string | null
          descricao_inconsistencia?: string
          email_analista?: string | null
          email_cc?: string | null
          empresa?: string | null
          enviado_por?: string | null
          enviado_por_nome?: string | null
          id?: string
          inconsistencia_id?: string | null
          mes_referencia?: number
          nro_chamado?: string
          origem?: string
          tempo_gasto_horas?: string | null
          tempo_gasto_minutos?: number | null
          tipo_chamado?: string | null
          tipo_inconsistencia?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_inconsistencias_chamados_inconsistencia_id_fkey"
            columns: ["inconsistencia_id"]
            isOneToOne: false
            referencedRelation: "inconsistencias_chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      inconsistencias_chamados: {
        Row: {
          analista: string | null
          arquivado_manualmente: boolean
          chave_unica: string
          cod_resolucao: string | null
          cod_resolucao_anterior: string | null
          created_at: string
          data_abertura: string | null
          data_atividade: string | null
          data_deteccao: string
          data_resolucao: string | null
          data_sistema: string | null
          descricao_inconsistencia: string
          empresa: string | null
          id: string
          item_configuracao: string | null
          nro_chamado: string
          nro_tarefa: string | null
          origem: string
          status: string
          status_chamado: string | null
          tempo_gasto_horas: string | null
          tempo_gasto_minutos: number | null
          tipo_chamado: string | null
          tipo_inconsistencia: string
          updated_at: string
        }
        Insert: {
          analista?: string | null
          arquivado_manualmente?: boolean
          chave_unica: string
          cod_resolucao?: string | null
          cod_resolucao_anterior?: string | null
          created_at?: string
          data_abertura?: string | null
          data_atividade?: string | null
          data_deteccao?: string
          data_resolucao?: string | null
          data_sistema?: string | null
          descricao_inconsistencia: string
          empresa?: string | null
          id?: string
          item_configuracao?: string | null
          nro_chamado: string
          nro_tarefa?: string | null
          origem: string
          status?: string
          status_chamado?: string | null
          tempo_gasto_horas?: string | null
          tempo_gasto_minutos?: number | null
          tipo_chamado?: string | null
          tipo_inconsistencia: string
          updated_at?: string
        }
        Update: {
          analista?: string | null
          arquivado_manualmente?: boolean
          chave_unica?: string
          cod_resolucao?: string | null
          cod_resolucao_anterior?: string | null
          created_at?: string
          data_abertura?: string | null
          data_atividade?: string | null
          data_deteccao?: string
          data_resolucao?: string | null
          data_sistema?: string | null
          descricao_inconsistencia?: string
          empresa?: string | null
          id?: string
          item_configuracao?: string | null
          nro_chamado?: string
          nro_tarefa?: string | null
          origem?: string
          status?: string
          status_chamado?: string | null
          tempo_gasto_horas?: string | null
          tempo_gasto_minutos?: number | null
          tipo_chamado?: string | null
          tipo_inconsistencia?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_configurations: {
        Row: {
          created_at: string | null
          description: string | null
          id: number
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      jobs_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string | null
          id: string
          last_error: string | null
          max_attempts: number
          payload: Json
          result: Json | null
          scheduled_at: string
          started_at: string | null
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string | null
          id: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          result?: Json | null
          scheduled_at: string
          started_at?: string | null
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_error?: string | null
          max_attempts?: number
          payload?: Json
          result?: Json | null
          scheduled_at?: string
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      logs_sistema: {
        Row: {
          data_operacao: string | null
          detalhes: string | null
          id: string
          operacao: string
        }
        Insert: {
          data_operacao?: string | null
          detalhes?: string | null
          id?: string
          operacao: string
        }
        Update: {
          data_operacao?: string | null
          detalhes?: string | null
          id?: string
          operacao?: string
        }
        Relationships: []
      }
      menu_aparencia: {
        Row: {
          created_at: string
          created_by: string | null
          hover_fundo: string
          hover_texto: string
          item_fundo: string
          item_texto: string
          logo_path: string | null
          logo_recolhido_path: string | null
          menu_fundo: string
          menu_texto: string
          selecionado_fundo: string
          selecionado_texto: string
          subitem_fundo: string
          subitem_texto: string
          tema: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hover_fundo: string
          hover_texto: string
          item_fundo: string
          item_texto: string
          logo_path?: string | null
          logo_recolhido_path?: string | null
          menu_fundo: string
          menu_texto: string
          selecionado_fundo: string
          selecionado_texto: string
          subitem_fundo: string
          subitem_texto: string
          tema: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hover_fundo?: string
          hover_texto?: string
          item_fundo?: string
          item_texto?: string
          logo_path?: string | null
          logo_recolhido_path?: string | null
          menu_fundo?: string
          menu_texto?: string
          selecionado_fundo?: string
          selecionado_texto?: string
          subitem_fundo?: string
          subitem_texto?: string
          tema?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      menu_itens: {
        Row: {
          chave: string
          created_at: string
          created_by: string | null
          icone: string | null
          pai: string | null
          posicao: number
          rotulo_i18n: string
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          chave: string
          created_at?: string
          created_by?: string | null
          icone?: string | null
          pai?: string | null
          posicao: number
          rotulo_i18n: string
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          chave?: string
          created_at?: string
          created_by?: string | null
          icone?: string | null
          pai?: string | null
          posicao?: number
          rotulo_i18n?: string
          tipo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_itens_pai_fkey"
            columns: ["pai"]
            isOneToOne: false
            referencedRelation: "menu_itens"
            referencedColumns: ["chave"]
          },
        ]
      }
      modulos_requerimento_produto: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          modulo_id: string | null
          modulo_requerimento: string
          produto_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          modulo_id?: string | null
          modulo_requerimento: string
          produto_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          modulo_id?: string | null
          modulo_requerimento?: string
          produto_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modulos_requerimento_produto_modulo_fk"
            columns: ["modulo_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "produto_modulos"
            referencedColumns: ["id", "produto_id"]
          },
          {
            foreignKeyName: "modulos_requerimento_produto_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          chave: string
          created_at: string
          empresa_id: string | null
          id: string
          link: string | null
          mensagem: string
          referencia: Json
          resolvida_em: string | null
          resolvida_motivo: string | null
          screen_key: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          chave: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          link?: string | null
          mensagem: string
          referencia?: Json
          resolvida_em?: string | null
          resolvida_motivo?: string | null
          screen_key: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          chave?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          link?: string | null
          mensagem?: string
          referencia?: Json
          resolvida_em?: string | null
          resolvida_motivo?: string | null
          screen_key?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_screen_key_fkey"
            columns: ["screen_key"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["key"]
          },
        ]
      }
      notificacoes_leituras: {
        Row: {
          lida_em: string
          notificacao_id: string
          user_id: string
        }
        Insert: {
          lida_em?: string
          notificacao_id: string
          user_id: string
        }
        Update: {
          lida_em?: string
          notificacao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_leituras_notificacao_id_fkey"
            columns: ["notificacao_id"]
            isOneToOne: false
            referencedRelation: "notificacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacao_estrutura: {
        Row: {
          cargo: string
          created_at: string
          departamento: string
          email: string
          foto_url: string | null
          id: string
          nome: string
          ordem_exibicao: number | null
          superior_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cargo: string
          created_at?: string
          departamento: string
          email: string
          foto_url?: string | null
          id?: string
          nome: string
          ordem_exibicao?: number | null
          superior_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string
          created_at?: string
          departamento?: string
          email?: string
          foto_url?: string | null
          id?: string
          nome?: string
          ordem_exibicao?: number | null
          superior_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizacao_estrutura_superior_id_fkey"
            columns: ["superior_id"]
            isOneToOne: false
            referencedRelation: "organizacao_estrutura"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacao_multiplos_superiores: {
        Row: {
          created_at: string
          id: string
          pessoa_id: string
          produto: string
          superior_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pessoa_id: string
          produto: string
          superior_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pessoa_id?: string
          produto?: string
          superior_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizacao_multiplos_superiores_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "organizacao_estrutura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizacao_multiplos_superiores_superior_id_fkey"
            columns: ["superior_id"]
            isOneToOne: false
            referencedRelation: "organizacao_estrutura"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacao_produto: {
        Row: {
          created_at: string
          id: string
          pessoa_id: string
          produto: string
          superior_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pessoa_id: string
          produto: string
          superior_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pessoa_id?: string
          produto?: string
          superior_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizacao_produto_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "organizacao_estrutura"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizacao_produto_superior_id_fkey"
            columns: ["superior_id"]
            isOneToOne: false
            referencedRelation: "organizacao_estrutura"
            referencedColumns: ["id"]
          },
        ]
      }
      percentual_repasse_historico: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          empresa_id: string
          id: string
          motivo: string | null
          observacao: string | null
          percentual: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          empresa_id: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          percentual: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          empresa_id?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          percentual?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "percentual_repasse_historico_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "percentual_repasse_historico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "percentual_repasse_historico_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_audit_logs: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      pesquisa_especialistas: {
        Row: {
          created_at: string | null
          especialista_id: string
          id: string
          pesquisa_id: string
        }
        Insert: {
          created_at?: string | null
          especialista_id: string
          id?: string
          pesquisa_id: string
        }
        Update: {
          created_at?: string | null
          especialista_id?: string
          id?: string
          pesquisa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesquisa_especialistas_especialista_id_fkey"
            columns: ["especialista_id"]
            isOneToOne: false
            referencedRelation: "especialistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisa_especialistas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas_satisfacao"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisa_mensal_ams: {
        Row: {
          ano_referencia: number | null
          cliente: string | null
          cliente_foco: boolean | null
          comentario: string | null
          created_at: string
          created_by: string | null
          email_respondente: string | null
          id: string
          identificador_questionario: string
          incompleto: boolean | null
          inicio_real_questionario: string | null
          inicio_resposta: string | null
          mes_referencia: number
          nome_questionario: string
          nome_respondente: string | null
          nota: number | null
          situacao_resposta: string | null
          termino_resposta: string | null
          unidade_negocio: string | null
          updated_at: string
          vertical: string | null
        }
        Insert: {
          ano_referencia?: number | null
          cliente?: string | null
          cliente_foco?: boolean | null
          comentario?: string | null
          created_at?: string
          created_by?: string | null
          email_respondente?: string | null
          id?: string
          identificador_questionario: string
          incompleto?: boolean | null
          inicio_real_questionario?: string | null
          inicio_resposta?: string | null
          mes_referencia: number
          nome_questionario: string
          nome_respondente?: string | null
          nota?: number | null
          situacao_resposta?: string | null
          termino_resposta?: string | null
          unidade_negocio?: string | null
          updated_at?: string
          vertical?: string | null
        }
        Update: {
          ano_referencia?: number | null
          cliente?: string | null
          cliente_foco?: boolean | null
          comentario?: string | null
          created_at?: string
          created_by?: string | null
          email_respondente?: string | null
          id?: string
          identificador_questionario?: string
          incompleto?: boolean | null
          inicio_real_questionario?: string | null
          inicio_resposta?: string | null
          mes_referencia?: number
          nome_questionario?: string
          nome_respondente?: string | null
          nota?: number | null
          situacao_resposta?: string | null
          termino_resposta?: string | null
          unidade_negocio?: string | null
          updated_at?: string
          vertical?: string | null
        }
        Relationships: []
      }
      pesquisas_satisfacao: {
        Row: {
          ano_abertura: number | null
          autor_id: string | null
          autor_nome: string | null
          autor_notificacao: string | null
          categoria: string | null
          chave_unica: string | null
          cliente: string
          cliente_id: string | null
          comentario_pesquisa: string | null
          coordenador_id: string | null
          created_at: string | null
          data_encaminhamento: string | null
          data_envio: string | null
          data_fechamento: string | null
          data_resposta: string | null
          data_ultima_modificacao: string | null
          descricao: string | null
          email_cliente: string | null
          empresa: string
          empresa_id: string | null
          estado: string | null
          grupo: string | null
          hash_origem: string | null
          id: string
          id_externo: string | null
          log: string | null
          mes_abertura: number | null
          nome_pesquisa: string | null
          nro_caso: string | null
          observacao: string | null
          origem: Database["public"]["Enums"]["origem_pesquisa_enum"]
          pergunta: string | null
          pesquisa_recebida: string | null
          prestador: string | null
          resposta: string | null
          sequencia_pergunta: string | null
          servico: string | null
          solicitante: string | null
          source_updated_at: string | null
          status: Database["public"]["Enums"]["status_pesquisa_enum"]
          synced_at: string | null
          tem_plano_acao: boolean | null
          tipo_caso: string | null
          updated_at: string | null
        }
        Insert: {
          ano_abertura?: number | null
          autor_id?: string | null
          autor_nome?: string | null
          autor_notificacao?: string | null
          categoria?: string | null
          chave_unica?: string | null
          cliente: string
          cliente_id?: string | null
          comentario_pesquisa?: string | null
          coordenador_id?: string | null
          created_at?: string | null
          data_encaminhamento?: string | null
          data_envio?: string | null
          data_fechamento?: string | null
          data_resposta?: string | null
          data_ultima_modificacao?: string | null
          descricao?: string | null
          email_cliente?: string | null
          empresa: string
          empresa_id?: string | null
          estado?: string | null
          grupo?: string | null
          hash_origem?: string | null
          id?: string
          id_externo?: string | null
          log?: string | null
          mes_abertura?: number | null
          nome_pesquisa?: string | null
          nro_caso?: string | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["origem_pesquisa_enum"]
          pergunta?: string | null
          pesquisa_recebida?: string | null
          prestador?: string | null
          resposta?: string | null
          sequencia_pergunta?: string | null
          servico?: string | null
          solicitante?: string | null
          source_updated_at?: string | null
          status?: Database["public"]["Enums"]["status_pesquisa_enum"]
          synced_at?: string | null
          tem_plano_acao?: boolean | null
          tipo_caso?: string | null
          updated_at?: string | null
        }
        Update: {
          ano_abertura?: number | null
          autor_id?: string | null
          autor_nome?: string | null
          autor_notificacao?: string | null
          categoria?: string | null
          chave_unica?: string | null
          cliente?: string
          cliente_id?: string | null
          comentario_pesquisa?: string | null
          coordenador_id?: string | null
          created_at?: string | null
          data_encaminhamento?: string | null
          data_envio?: string | null
          data_fechamento?: string | null
          data_resposta?: string | null
          data_ultima_modificacao?: string | null
          descricao?: string | null
          email_cliente?: string | null
          empresa?: string
          empresa_id?: string | null
          estado?: string | null
          grupo?: string | null
          hash_origem?: string | null
          id?: string
          id_externo?: string | null
          log?: string | null
          mes_abertura?: number | null
          nome_pesquisa?: string | null
          nro_caso?: string | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["origem_pesquisa_enum"]
          pergunta?: string | null
          pesquisa_recebida?: string | null
          prestador?: string | null
          resposta?: string | null
          sequencia_pergunta?: string | null
          servico?: string | null
          solicitante?: string | null
          source_updated_at?: string | null
          status?: Database["public"]["Enums"]["status_pesquisa_enum"]
          synced_at?: string | null
          tem_plano_acao?: boolean | null
          tipo_caso?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "elogios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "elogios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_satisfacao_coordenador_id_fkey"
            columns: ["coordenador_id"]
            isOneToOne: false
            referencedRelation: "organizacao_estrutura"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_acao_contatos: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          criado_por: string | null
          data_contato: string
          id: string
          meio_contato: string
          observacoes: string | null
          plano_acao_id: string
          resumo_comunicacao: string
          retorno_cliente: string | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_contato: string
          id?: string
          meio_contato: string
          observacoes?: string | null
          plano_acao_id: string
          resumo_comunicacao: string
          retorno_cliente?: string | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_contato?: string
          id?: string
          meio_contato?: string
          observacoes?: string | null
          plano_acao_id?: string
          resumo_comunicacao?: string
          retorno_cliente?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plano_acao_contatos_plano_acao_id_fkey"
            columns: ["plano_acao_id"]
            isOneToOne: false
            referencedRelation: "planos_acao"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_acao_historico: {
        Row: {
          criado_em: string | null
          data_atualizacao: string
          descricao_atualizacao: string
          id: string
          plano_acao_id: string
          tipo_atualizacao: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          criado_em?: string | null
          data_atualizacao?: string
          descricao_atualizacao: string
          id?: string
          plano_acao_id: string
          tipo_atualizacao?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          criado_em?: string | null
          data_atualizacao?: string
          descricao_atualizacao?: string
          id?: string
          plano_acao_id?: string
          tipo_atualizacao?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plano_acao_historico_plano_acao_id_fkey"
            columns: ["plano_acao_id"]
            isOneToOne: false
            referencedRelation: "planos_acao"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_acao: {
        Row: {
          acao_preventiva: string | null
          atualizado_em: string | null
          causa: string | null
          chamado: string | null
          comentario_cliente: string | null
          criado_em: string | null
          criado_por: string | null
          data_conclusao: string | null
          data_fechamento: string | null
          data_inicio: string
          data_primeiro_contato: string | null
          data_resposta: string | null
          descricao_acao_corretiva: string
          empresa_id: string | null
          id: string
          justificativa_cancelamento: string | null
          meio_contato: string | null
          pesquisa_id: string
          prioridade: string
          resumo_comunicacao: string | null
          retorno_cliente: string | null
          status_final: string | null
          status_plano: string
          tipo_acao: string | null
        }
        Insert: {
          acao_preventiva?: string | null
          atualizado_em?: string | null
          causa?: string | null
          chamado?: string | null
          comentario_cliente?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_conclusao?: string | null
          data_fechamento?: string | null
          data_inicio: string
          data_primeiro_contato?: string | null
          data_resposta?: string | null
          descricao_acao_corretiva: string
          empresa_id?: string | null
          id?: string
          justificativa_cancelamento?: string | null
          meio_contato?: string | null
          pesquisa_id: string
          prioridade: string
          resumo_comunicacao?: string | null
          retorno_cliente?: string | null
          status_final?: string | null
          status_plano?: string
          tipo_acao?: string | null
        }
        Update: {
          acao_preventiva?: string | null
          atualizado_em?: string | null
          causa?: string | null
          chamado?: string | null
          comentario_cliente?: string | null
          criado_em?: string | null
          criado_por?: string | null
          data_conclusao?: string | null
          data_fechamento?: string | null
          data_inicio?: string
          data_primeiro_contato?: string | null
          data_resposta?: string | null
          descricao_acao_corretiva?: string
          empresa_id?: string | null
          id?: string
          justificativa_cancelamento?: string | null
          meio_contato?: string | null
          pesquisa_id?: string
          prioridade?: string
          resumo_comunicacao?: string | null
          retorno_cliente?: string | null
          status_final?: string | null
          status_plano?: string
          tipo_acao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planos_acao_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: true
            referencedRelation: "pesquisas_satisfacao"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_modulos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          inativado_em: string | null
          inativado_por: string | null
          nome: string
          ordem: number
          produto_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          nome: string
          ordem: number
          produto_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          nome?: string
          ordem?: number
          produto_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_modulos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          a_classificar: boolean
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          inativado_em: string | null
          inativado_por: string | null
          nome: string
          ordem: number
          solucao_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          a_classificar?: boolean
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          nome: string
          ordem: number
          solucao_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          a_classificar?: boolean
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          nome?: string
          ordem?: number
          solucao_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_solucao_id_fkey"
            columns: ["solucao_id"]
            isOneToOne: false
            referencedRelation: "solucoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          language: string
          last_sign_in_at: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          language?: string
          last_sign_in_at?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          language?: string
          last_sign_in_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ramos_atividade: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          inativado_em: string | null
          inativado_por: string | null
          nome: string
          ordem: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          nome: string
          ordem: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          nome?: string
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      regras_contagem: {
        Row: {
          created_at: string
          created_by: string | null
          grupos_que_contam: string[]
          id: number
          ignorar_atividade_interna: boolean
          itens_excluidos: string[]
          so_tickets_fechados: boolean
          tipos_chamado: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grupos_que_contam: string[]
          id?: number
          ignorar_atividade_interna: boolean
          itens_excluidos?: string[]
          so_tickets_fechados: boolean
          tipos_chamado: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grupos_que_contam?: string[]
          id?: number
          ignorar_atividade_interna?: boolean
          itens_excluidos?: string[]
          so_tickets_fechados?: boolean
          tipos_chamado?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      requerimento_anexos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome_arquivo: string
          nome_original: string
          ordem: number
          requerimento_id: string
          storage_path: string
          tamanho_bytes: number
          tipo_mime: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome_arquivo: string
          nome_original: string
          ordem?: number
          requerimento_id: string
          storage_path: string
          tamanho_bytes: number
          tipo_mime: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome_arquivo?: string
          nome_original?: string
          ordem?: number
          requerimento_id?: string
          storage_path?: string
          tamanho_bytes?: number
          tipo_mime?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requerimento_anexos_requerimento_id_fkey"
            columns: ["requerimento_id"]
            isOneToOne: false
            referencedRelation: "requerimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      requerimentos: {
        Row: {
          autor_id: string | null
          autor_nome: string | null
          chamado: string
          cliente_id: string
          created_at: string | null
          data_aprovacao: string | null
          data_envio: string
          data_envio_faturamento: string | null
          data_faturamento: string | null
          descricao: string
          empresa_segmentacao_nome: string | null
          enviado_faturamento: boolean
          horas_funcional: number
          horas_gestor: number | null
          horas_tecnico: number
          horas_total: number | null
          id: string
          linguagem: string | null
          mes_cobranca: string | null
          modulo: string
          observacao: string | null
          quantidade_tickets: number | null
          status: string
          tipo_cobranca: string
          tipo_hora_extra: string | null
          updated_at: string | null
          valor_hora_funcional: number | null
          valor_hora_gestor: number | null
          valor_hora_tecnico: number | null
          valor_total_funcional: number | null
          valor_total_geral: number | null
          valor_total_gestor: number | null
          valor_total_tecnico: number | null
        }
        Insert: {
          autor_id?: string | null
          autor_nome?: string | null
          chamado: string
          cliente_id: string
          created_at?: string | null
          data_aprovacao?: string | null
          data_envio: string
          data_envio_faturamento?: string | null
          data_faturamento?: string | null
          descricao: string
          empresa_segmentacao_nome?: string | null
          enviado_faturamento?: boolean
          horas_funcional?: number
          horas_gestor?: number | null
          horas_tecnico?: number
          horas_total?: number | null
          id?: string
          linguagem?: string | null
          mes_cobranca?: string | null
          modulo: string
          observacao?: string | null
          quantidade_tickets?: number | null
          status?: string
          tipo_cobranca: string
          tipo_hora_extra?: string | null
          updated_at?: string | null
          valor_hora_funcional?: number | null
          valor_hora_gestor?: number | null
          valor_hora_tecnico?: number | null
          valor_total_funcional?: number | null
          valor_total_geral?: number | null
          valor_total_gestor?: number | null
          valor_total_tecnico?: number | null
        }
        Update: {
          autor_id?: string | null
          autor_nome?: string | null
          chamado?: string
          cliente_id?: string
          created_at?: string | null
          data_aprovacao?: string | null
          data_envio?: string
          data_envio_faturamento?: string | null
          data_faturamento?: string | null
          descricao?: string
          empresa_segmentacao_nome?: string | null
          enviado_faturamento?: boolean
          horas_funcional?: number
          horas_gestor?: number | null
          horas_tecnico?: number
          horas_total?: number | null
          id?: string
          linguagem?: string | null
          mes_cobranca?: string | null
          modulo?: string
          observacao?: string | null
          quantidade_tickets?: number | null
          status?: string
          tipo_cobranca?: string
          tipo_hora_extra?: string | null
          updated_at?: string | null
          valor_hora_funcional?: number | null
          valor_hora_gestor?: number | null
          valor_hora_tecnico?: number | null
          valor_total_funcional?: number | null
          valor_total_geral?: number | null
          valor_total_gestor?: number | null
          valor_total_tecnico?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "requerimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      requerimentos_bancos: {
        Row: {
          banco_id: string
          created_at: string
          created_by: string | null
          motivo: string
          requerimento_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          banco_id: string
          created_at?: string
          created_by?: string | null
          motivo: string
          requerimento_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          banco_id?: string
          created_at?: string
          created_by?: string | null
          motivo?: string
          requerimento_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requerimentos_bancos_banco_id_fkey"
            columns: ["banco_id"]
            isOneToOne: false
            referencedRelation: "bancos_horas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requerimentos_bancos_requerimento_id_fkey"
            columns: ["requerimento_id"]
            isOneToOne: true
            referencedRelation: "requerimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_permissions: {
        Row: {
          created_at: string | null
          created_by: string | null
          group_id: string | null
          id: string
          permission_level: string | null
          screen_key: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          group_id?: string | null
          id?: string
          permission_level?: string | null
          screen_key?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          group_id?: string | null
          id?: string
          permission_level?: string | null
          screen_key?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "screen_permissions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_permissions_screen_key_fkey"
            columns: ["screen_key"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["key"]
          },
        ]
      }
      screens: {
        Row: {
          category: string | null
          description: string | null
          key: string
          name: string
          route: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          key: string
          name: string
          route?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          key?: string
          name?: string
          route?: string | null
        }
        Relationships: []
      }
      sincronizacao_legado_falhas: {
        Row: {
          created_at: string
          erro: string
          id: number
          operacao: string
          registro_id: string
          resolvida_em: string | null
          resolvida_por: string | null
          sqlstate: string
          tabela_origem: string
        }
        Insert: {
          created_at?: string
          erro: string
          id?: never
          operacao: string
          registro_id: string
          resolvida_em?: string | null
          resolvida_por?: string | null
          sqlstate: string
          tabela_origem: string
        }
        Update: {
          created_at?: string
          erro?: string
          id?: never
          operacao?: string
          registro_id?: string
          resolvida_em?: string | null
          resolvida_por?: string | null
          sqlstate?: string
          tabela_origem?: string
        }
        Relationships: []
      }
      solucoes: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          id: string
          inativado_em: string | null
          inativado_por: string | null
          nome: string
          ordem: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          nome: string
          ordem: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          nome?: string
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sync_agendamentos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          dias_mes: number[]
          dias_semana: number[]
          empresa_ids: string[]
          frequencia: string
          hora_fim: string | null
          hora_inicio: string | null
          horarios: string[]
          id: string
          intervalo_horas: number | null
          modo_horario: string
          nome: string
          proxima_execucao: string | null
          tabelas: Json
          tipo: string
          ultima_execucao: string | null
          ultimo_dia_mes: boolean
          ultimo_status: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          dias_mes?: number[]
          dias_semana?: number[]
          empresa_ids?: string[]
          frequencia: string
          hora_fim?: string | null
          hora_inicio?: string | null
          horarios?: string[]
          id?: string
          intervalo_horas?: number | null
          modo_horario: string
          nome: string
          proxima_execucao?: string | null
          tabelas?: Json
          tipo?: string
          ultima_execucao?: string | null
          ultimo_dia_mes?: boolean
          ultimo_status?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          dias_mes?: number[]
          dias_semana?: number[]
          empresa_ids?: string[]
          frequencia?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          horarios?: string[]
          id?: string
          intervalo_horas?: number | null
          modo_horario?: string
          nome?: string
          proxima_execucao?: string | null
          tabelas?: Json
          tipo?: string
          ultima_execucao?: string | null
          ultimo_dia_mes?: boolean
          ultimo_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sync_control: {
        Row: {
          created_at: string | null
          id: string
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          records_failed: number | null
          records_inserted: number | null
          records_synced: number | null
          records_updated: number | null
          sync_duration_ms: number | null
          table_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          records_failed?: number | null
          records_inserted?: number | null
          records_synced?: number | null
          records_updated?: number | null
          sync_duration_ms?: number | null
          table_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          records_failed?: number | null
          records_inserted?: number | null
          records_synced?: number | null
          records_updated?: number | null
          sync_duration_ms?: number | null
          table_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sync_control_pesquisas: {
        Row: {
          atualizados: number | null
          created_at: string | null
          erros: number | null
          id: string
          last_sync_at: string
          mensagem: string | null
          novos: number | null
          status: string | null
          total_processados: number | null
        }
        Insert: {
          atualizados?: number | null
          created_at?: string | null
          erros?: number | null
          id?: string
          last_sync_at?: string
          mensagem?: string | null
          novos?: number | null
          status?: string | null
          total_processados?: number | null
        }
        Update: {
          atualizados?: number | null
          created_at?: string | null
          erros?: number | null
          id?: string
          last_sync_at?: string
          mensagem?: string | null
          novos?: number | null
          status?: string | null
          total_processados?: number | null
        }
        Relationships: []
      }
      sync_execucoes: {
        Row: {
          agendamento_id: string | null
          disparado_por: string | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          logs: Json
          origem: string
          resultado: Json | null
          status: string
          tabelas: Json
          tipo: string
        }
        Insert: {
          agendamento_id?: string | null
          disparado_por?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          logs?: Json
          origem: string
          resultado?: Json | null
          status?: string
          tabelas?: Json
          tipo?: string
        }
        Update: {
          agendamento_id?: string | null
          disparado_por?: string | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          logs?: Json
          origem?: string
          resultado?: Json | null
          status?: string
          tabelas?: Json
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_execucoes_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "sync_agendamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_metadata: {
        Row: {
          id: string
          registros_atualizados: number | null
          registros_erros: number | null
          registros_novos: number | null
          registros_processados: number | null
          resultado: string | null
          tabela: string
          ultima_execucao: string
          updated_at: string
        }
        Insert: {
          id?: string
          registros_atualizados?: number | null
          registros_erros?: number | null
          registros_novos?: number | null
          registros_processados?: number | null
          resultado?: string | null
          tabela: string
          ultima_execucao?: string
          updated_at?: string
        }
        Update: {
          id?: string
          registros_atualizados?: number | null
          registros_erros?: number | null
          registros_novos?: number | null
          registros_processados?: number | null
          resultado?: string | null
          tabela?: string
          ultima_execucao?: string
          updated_at?: string
        }
        Relationships: []
      }
      taxas_clientes: {
        Row: {
          atualizado_em: string | null
          cliente_id: string
          criado_em: string | null
          criado_por: string | null
          id: string
          personalizado: boolean | null
          prazo_pagamento: number | null
          ticket_excedente: number | null
          ticket_excedente_1: number | null
          ticket_excedente_2: number | null
          ticket_excedente_complexo: number | null
          ticket_excedente_simples: number | null
          tipo_calculo_adicional: string
          tipo_produto: string
          valor_ticket: number | null
          valor_ticket_excedente: number | null
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          atualizado_em?: string | null
          cliente_id: string
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          personalizado?: boolean | null
          prazo_pagamento?: number | null
          ticket_excedente?: number | null
          ticket_excedente_1?: number | null
          ticket_excedente_2?: number | null
          ticket_excedente_complexo?: number | null
          ticket_excedente_simples?: number | null
          tipo_calculo_adicional?: string
          tipo_produto: string
          valor_ticket?: number | null
          valor_ticket_excedente?: number | null
          vigencia_fim?: string | null
          vigencia_inicio: string
        }
        Update: {
          atualizado_em?: string | null
          cliente_id?: string
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          personalizado?: boolean | null
          prazo_pagamento?: number | null
          ticket_excedente?: number | null
          ticket_excedente_1?: number | null
          ticket_excedente_2?: number | null
          ticket_excedente_complexo?: number | null
          ticket_excedente_simples?: number | null
          tipo_calculo_adicional?: string
          tipo_produto?: string
          valor_ticket?: number | null
          valor_ticket_excedente?: number | null
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxas_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      taxas_padrao: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          criado_por: string | null
          id: string
          tipo_calculo_adicional: string
          tipo_produto: string
          valor_local_abap: number | null
          valor_local_dba: number
          valor_local_funcional: number
          valor_local_gestor: number
          valor_local_tecnico: number
          valor_remota_abap: number | null
          valor_remota_dba: number
          valor_remota_funcional: number
          valor_remota_gestor: number
          valor_remota_tecnico: number
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          tipo_calculo_adicional?: string
          tipo_produto: string
          valor_local_abap?: number | null
          valor_local_dba?: number
          valor_local_funcional?: number
          valor_local_gestor?: number
          valor_local_tecnico?: number
          valor_remota_abap?: number | null
          valor_remota_dba?: number
          valor_remota_funcional?: number
          valor_remota_gestor?: number
          valor_remota_tecnico?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          tipo_calculo_adicional?: string
          tipo_produto?: string
          valor_local_abap?: number | null
          valor_local_dba?: number
          valor_local_funcional?: number
          valor_local_gestor?: number
          valor_local_tecnico?: number
          valor_remota_abap?: number | null
          valor_remota_dba?: number
          valor_remota_funcional?: number
          valor_remota_gestor?: number
          valor_remota_tecnico?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: []
      }
      user_group_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          group_id: string | null
          id: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          group_id?: string | null
          id?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          group_id?: string | null
          id?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_group_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_groups: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default_admin: boolean | null
          name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default_admin?: boolean | null
          name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default_admin?: boolean | null
          name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      valores_taxas_funcoes: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          funcao: string
          id: string
          taxa_id: string
          tipo_hora: string
          valor_17h30_19h30: number | null
          valor_adicional: number | null
          valor_apos_19h30: number | null
          valor_base: number
          valor_fim_semana: number | null
          valor_standby: number | null
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          funcao: string
          id?: string
          taxa_id: string
          tipo_hora: string
          valor_17h30_19h30?: number | null
          valor_adicional?: number | null
          valor_apos_19h30?: number | null
          valor_base?: number
          valor_fim_semana?: number | null
          valor_standby?: number | null
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          funcao?: string
          id?: string
          taxa_id?: string
          tipo_hora?: string
          valor_17h30_19h30?: number | null
          valor_adicional?: number | null
          valor_apos_19h30?: number | null
          valor_base?: number
          valor_fim_semana?: number | null
          valor_standby?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "valores_taxas_funcoes_taxa_id_fkey"
            columns: ["taxa_id"]
            isOneToOne: false
            referencedRelation: "taxas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_config: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
    }
    Views: {
      book_generation_batch_summary: {
        Row: {
          ano: number | null
          batch_id: string | null
          batch_status: string | null
          cancelados: number | null
          concluidos: number | null
          created_at: string | null
          emails_enviados: number | null
          erros: number | null
          mes: number | null
          pendentes: number | null
          processando: number | null
          total: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      books_com_empresa: {
        Row: {
          ano: number | null
          created_at: string | null
          empresa_id: string | null
          empresa_nome: string | null
          empresa_nome_abreviado: string | null
          id: string | null
          mes: number | null
          pdf_gerado_em: string | null
          pdf_url: string | null
          status: string | null
          tem_dados: boolean | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_create_user: {
        Args: {
          p_email: string
          p_full_name: string
          p_group_id: string
          p_password: string
        }
        Returns: Json
      }
      admin_delete_user: { Args: { p_user_id: string }; Returns: Json }
      admin_reset_user_password: {
        Args: { p_new_password: string; p_user_id: string }
        Returns: Json
      }
      admin_update_user: {
        Args: {
          p_active?: boolean
          p_email?: string
          p_full_name?: string
          p_group_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      assign_user_to_group: {
        Args: {
          assigned_by_uuid: string
          group_uuid: string
          user_uuid: string
        }
        Returns: boolean
      }
      atualizar_uso_aranda: { Args: never; Returns: undefined }
      bancos_horas_consumo: {
        Args: {
          p_ano: number
          p_dia_fim?: number
          p_dia_inicio?: number
          p_empresa_id: string
          p_mes: number
        }
        Returns: {
          fonte: string
          grupo: string
          item_configuracao: string
          itens: number
          minutos: number
          tickets: number
        }[]
      }
      bancos_horas_consumo_itens: {
        Args: {
          p_ano: number
          p_dia_fim?: number
          p_dia_inicio?: number
          p_empresa_id: string
          p_mes: number
        }
        Returns: {
          fonte: string
          grupo: string
          item_configuracao: string
          item_id: string
          minutos: number
          tickets: number
        }[]
      }
      bancos_horas_criar: {
        Args: {
          p_banco: Json
          p_baseline: Json
          p_escopo: Json
          p_repasse: Json
        }
        Returns: string
      }
      bancos_horas_erro_comparacao: {
        Args: { p_empresa_id: string; p_erro: string }
        Returns: undefined
      }
      bancos_horas_gravar_comparacao: {
        Args: { p_comparacao: Json }
        Returns: undefined
      }
      bancos_horas_inativar: {
        Args: { p_banco_id: string; p_motivo: string }
        Returns: undefined
      }
      bancos_horas_janela: {
        Args: {
          p_ano: number
          p_dia_fim?: number
          p_dia_inicio?: number
          p_mes: number
        }
        Returns: {
          fim: string
          inicio: string
        }[]
      }
      bancos_horas_minutos_legado: {
        Args: { p_texto: string }
        Returns: number
      }
      bancos_horas_nova_vigencia: {
        Args: {
          p_banco_id: string
          p_desde: string
          p_motivo: string
          p_tipo: string
          p_valores: Json
        }
        Returns: string
      }
      bancos_horas_registrar_fechamento: {
        Args: { p_fechamento: Json }
        Returns: Json
      }
      bancos_horas_registrar_retroativo: {
        Args: { p_retroativo: Json }
        Returns: string
      }
      bancos_horas_requerimentos: {
        Args: { p_ano: number; p_empresa_id: string; p_mes: number }
        Returns: {
          banco_ajustado_id: string
          chamado: string
          horas: number
          modulo: string
          modulo_id: string
          produto_id: string
          requerimento_id: string
          tickets: number
        }[]
      }
      bancos_horas_requerimentos_controle: {
        Args: { p_ano: number; p_empresa_id: string; p_mes: number }
        Returns: {
          ajuste_em: string
          ajuste_motivo: string
          ajuste_por: string
          banco_ajustado_id: string
          chamado: string
          consome: boolean
          descricao: string
          horas: number
          modulo: string
          modulo_id: string
          produto_id: string
          requerimento_id: string
          tickets: number
        }[]
      }
      buscar_books_por_periodo: {
        Args: { p_ano: number; p_mes: number }
        Returns: {
          ano: number
          data_geracao: string
          empresa_id: string
          empresa_nome: string
          id: string
          mes: number
          pdf_url: string
          status: string
          tem_dados: boolean
        }[]
      }
      buscar_historico_com_anexos:
        | {
            Args: { item_id: string }
            Returns: {
              acao: string
              anexos: Json
              created_at: string
              detalhes: string
              id: string
              usuario_id: string
            }[]
          }
        | {
            Args: {
              p_empresa_id?: string
              p_limit?: number
              p_mes_referencia?: string
              p_offset?: number
            }
            Returns: {
              anexo_id: string
              anexo_nome_original: string
              anexo_processado: boolean
              anexo_status: string
              anexo_tamanho_bytes: number
              clientes_processados: number
              data_disparo: string
              detalhes_erro: string
              empresa_id: string
              empresa_nome: string
              id: string
              mes_referencia: string
              status: string
              total_clientes: number
            }[]
          }
      can_delete_group: { Args: { group_uuid: string }; Returns: boolean }
      can_edit_pesquisas: { Args: never; Returns: boolean }
      check_especialistas_view_access: {
        Args: never
        Returns: {
          accessible: boolean
          reason: string
          view_name: string
        }[]
      }
      cleanup_old_jobs: { Args: never; Returns: number }
      cleanup_realtime_old_data: { Args: never; Returns: undefined }
      codigos_resolucao_uso: {
        Args: { p_meses?: number }
        Returns: {
          apontamentos: number
          codigo: string
          conta_horas: boolean
          conta_tickets: boolean
          primeira_ocorrencia: string
          tem_regra: boolean
          tickets: number
        }[]
      }
      catalogo_excluir: {
        Args: { p_id: string; p_tipo: string }
        Returns: undefined
      }
      consumo_bancos_do_book: {
        Args: { p_book_id: string }
        Returns: {
          banco_id: string
          dados: Json
          empresa_id: string
          fechamento_id: string
          nome_banco: string
          nome_empresa: string
          ordem: number
        }[]
      }
      create_banco_horas_audit_log: {
        Args: {
          p_acao: string
          p_calculo_id: string
          p_dados_acao?: Json
          p_descricao: string
          p_empresa_id: string
        }
        Returns: string
      }
      create_user_group: {
        Args: {
          created_by_uuid: string
          group_description: string
          group_name: string
        }
        Returns: string
      }
      decidir_retroativo: {
        Args: {
          p_decisao: string
          p_justificativa: string
          p_retroativo_id: string
        }
        Returns: undefined
      }
      detectar_inconsistencias: { Args: never; Returns: Json }
      especialistas_ativos: {
        Args: never
        Returns: {
          cargo: string
          created_at: string
          departamento: string
          email: string
          empresa: string
          especialidade: string
          id: string
          nivel: string
          nome: string
          origem: Database["public"]["Enums"]["origem_especialista_enum"]
          telefone: string
          updated_at: string
        }[]
      }
      especialistas_sql_server: {
        Args: never
        Returns: {
          created_at: string
          email: string
          email_original: string
          id: string
          id_externo: string
          nome: string
          nome_original: string
          status: Database["public"]["Enums"]["status_especialista_enum"]
          updated_at: string
        }[]
      }
      espelhar_reajuste_legado: {
        Args: { p_excluido?: boolean; p_reajuste_id: string }
        Returns: string
      }
      estatisticas_anexos_periodo: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: {
          anexos_com_erro: number
          anexos_pendentes: number
          anexos_processados: number
          empresas_com_anexos: number
          tamanho_total_mb: number
          total_anexos: number
        }[]
      }
      exigir_motivo: { Args: { p_motivo: string }; Returns: string }
      gerar_caminho_anexo:
        | {
            Args: { empresa_id: string; nome_arquivo: string }
            Returns: string
          }
        | {
            Args: {
              p_empresa_id: string
              p_nome_arquivo: string
              p_temporario?: boolean
            }
            Returns: string
          }
      gerar_chave_unica_pesquisa: {
        Args: {
          p_data_resposta: string
          p_nome_cliente: string
          p_nome_especialista: string
          p_numero_chamado: string
        }
        Returns: string
      }
      gerar_hash_pesquisa: { Args: { dados: Json }; Returns: string }
      get_baseline_horas_vigente: {
        Args: { p_data?: string; p_empresa_id: string }
        Returns: number
      }
      get_baseline_tickets_vigente: {
        Args: { p_data?: string; p_empresa_id: string }
        Returns: number
      }
      get_baseline_vigente: {
        Args: { p_data?: string; p_empresa_id: string }
        Returns: {
          baseline_horas: number
          baseline_tickets: number
          data_fim: string
          data_inicio: string
          motivo: string
          tipo_banco: string
        }[]
      }
      get_especialistas_stats: {
        Args: never
        Returns: {
          ativos: number
          inativos: number
          sql_server: number
          total: number
        }[]
      }
      get_job_statistics: {
        Args: never
        Returns: {
          count: number
          status: string
        }[]
      }
      get_organizacao_por_produto: {
        Args: { p_produto: string }
        Returns: {
          cargo: string
          created_at: string
          departamento: string
          email: string
          foto_url: string
          id: string
          nome: string
          produto: string
          superior_id: string
          telefone: string
          updated_at: string
        }[]
      }
      get_percentual_repasse_valor: {
        Args: { p_data?: string; p_empresa_id: string }
        Returns: number
      }
      get_percentual_repasse_vigente: {
        Args: { p_data?: string; p_empresa_id: string }
        Returns: {
          data_fim: string
          data_inicio: string
          motivo: string
          percentual: number
        }[]
      }
      get_superiores_pessoa: {
        Args: { p_pessoa_id: string; p_produto: string }
        Returns: {
          superior_cargo: string
          superior_id: string
          superior_nome: string
        }[]
      }
      get_user_group: {
        Args: { user_uuid: string }
        Returns: {
          group_description: string
          group_id: string
          group_name: string
          is_admin: boolean
        }[]
      }
      get_user_permissions: {
        Args: { user_uuid: string }
        Returns: {
          permission_level: string
          screen_key: string
        }[]
      }
      gravar_consumo_bancos_do_book: {
        Args: { p_bancos: Json; p_book_id: string }
        Returns: number
      }
      grupos_aranda_desvincular: {
        Args: {
          p_grupos: string[]
          p_modulo: string
          p_produto: string
          p_solucao: string
        }
        Returns: undefined
      }
      grupos_aranda_nao_mapeados: {
        Args: { p_meses?: number }
        Returns: {
          apontamentos: number
          empresas: string[]
          grupo_aranda: string
          primeira_ocorrencia: string
          tickets: number
        }[]
      }
      grupos_aranda_uso: {
        Args: { p_meses?: number }
        Returns: {
          apontamentos: number
          empresas_multiplos: string[]
          grupo_aranda_id: string
          tickets: number
        }[]
      }
      grupos_aranda_vincular: {
        Args: {
          p_grupos: string[]
          p_modulo: string
          p_produto: string
          p_solucao: string
          p_substituir?: boolean
        }
        Returns: undefined
      }
      has_especialistas_permission: { Args: never; Returns: boolean }
      has_screen_permission:
        | {
            Args: { permission_level?: string; screen_key: string }
            Returns: boolean
          }
        | {
            Args: { required_level?: string; screen_key_param: string }
            Returns: boolean
          }
      has_sync_write_permission: { Args: never; Returns: boolean }
      inativar_empresas_vencidas: { Args: never; Returns: number }
      iniciar_retificacao_book: {
        Args: { p_book_id: string; p_motivo: string; p_usuario_id: string }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      is_user_admin: { Args: { user_id_param?: string }; Returns: boolean }
      lancamentos_para_legado: { Args: { p_empresa_id: string }; Returns: Json }
      liberar_empresa: {
        Args: { p_empresa_id: string; p_fechamento: Json }
        Returns: Json
      }
      limpar_anexos_expirados: { Args: never; Returns: number }
      list_all_users: {
        Args: never
        Returns: {
          group_ids: string[]
          group_name: string
          group_names: string[]
          user_active: boolean
          user_created_at: string
          user_email: string
          user_full_name: string
          user_id: string
          user_last_sign_in_at: string
        }[]
      }
      listar_especialistas_para_email: {
        Args: never
        Returns: {
          email: string
          email_coordenador: string
          nome: string
        }[]
      }
      listar_responsaveis_organograma: {
        Args: never
        Returns: {
          cargo: string
          email: string
          id: string
          nome: string
        }[]
      }
      marcar_pesquisa_encaminhada: {
        Args: { pesquisa_id: string }
        Returns: undefined
      }
      monitor_realtime_performance: {
        Args: never
        Returns: {
          metric_name: string
          metric_value: string
          recommendation: string
        }[]
      }
      notificacoes_abrir: {
        Args: {
          p_chave: string
          p_empresa_id: string
          p_link: string
          p_mensagem: string
          p_referencia?: Json
          p_screen_key: string
          p_tipo: string
          p_titulo: string
        }
        Returns: undefined
      }
      notificacoes_nome_empresa: {
        Args: { p_empresa_id: string }
        Returns: string
      }
      notificacoes_resolver: {
        Args: { p_chave: string; p_motivo: string }
        Returns: undefined
      }
      notificacoes_sync_book: {
        Args: { p_book_id: string }
        Returns: undefined
      }
      notificacoes_sync_geracao_books: {
        Args: { p_execucao_id: string }
        Returns: undefined
      }
      notificacoes_sync_replica: {
        Args: { p_mensagem: string; p_referencia?: Json }
        Returns: undefined
      }
      notificacoes_sync_retroativo: {
        Args: { p_ano: number; p_empresa_id: string; p_mes: number }
        Returns: undefined
      }
      notificacoes_sync_saldo_parcial: {
        Args: { p_execucao_id: string }
        Returns: undefined
      }
      notificar_grupos_nao_mapeados: { Args: never; Returns: undefined }
      observacoes_para_legado: {
        Args: { p_empresa_id: string }
        Returns: {
          ano: number
          ativo: boolean
          banco_id: string
          created_at: string
          created_by: string | null
          fechamento_id: string | null
          id: string
          inativado_em: string | null
          inativado_por: string | null
          mes: number
          origem: string
          reajuste_id: string | null
          texto: string
          updated_at: string
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "bancos_horas_observacoes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      obter_ultima_sincronizacao_pesquisas: {
        Args: { p_tipo_sincronizacao: string }
        Returns: string
      }
      perfis_resumo: {
        Args: { p_emails: string[]; p_ids: string[] }
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      pode_consultar_bancos_horas: { Args: never; Returns: boolean }
      pode_editar_bancos_horas: { Args: never; Returns: boolean }
      pode_ver_regras_contagem: { Args: { p_nivel: string }; Returns: boolean }
      reajustes_para_legado: {
        Args: { p_empresa_id: string }
        Returns: {
          ano: number
          anotacao_interna: string | null
          ativo: boolean
          banco_id: string
          created_at: string
          created_by: string | null
          id: string
          inativado_em: string | null
          inativado_por: string | null
          justificativa: string
          mes: number
          minutos: number
          motivo_inativacao: string | null
          origem: string
          reajuste_legado_id: string | null
          tickets: number
          tipo: string
          updated_at: string
          updated_by: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "bancos_horas_reajustes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      realtime_maintenance: { Args: never; Returns: string }
      registrar_aviso_retroativo: {
        Args: { p_item_ids: string[]; p_retroativo_id: string }
        Returns: undefined
      }
      registrar_envio_book: {
        Args: {
          p_book_id: string
          p_destinatarios: string[]
          p_usuario_id: string
        }
        Returns: string
      }
      registrar_envio_saldo_parcial_controle: {
        Args: {
          p_empresa_id: string
          p_erro?: string
          p_qtd_destinatarios: number
          p_sucesso: boolean
        }
        Returns: string
      }
      registrar_falha_sincronizacao: {
        Args: {
          p_erro: string
          p_operacao: string
          p_registro: string
          p_sqlstate: string
          p_tabela: string
        }
        Returns: undefined
      }
      registrar_sincronizacao_pesquisas: {
        Args: {
          p_detalhes?: Json
          p_registros_novos?: number
          p_registros_processados?: number
          p_tipo_sincronizacao: string
        }
        Returns: undefined
      }
      salvar_menu: {
        Args: { p_aparencia?: Json; p_itens: Json }
        Returns: undefined
      }
      salvar_regras_contagem: {
        Args: { p_codigos?: Json; p_motivo: string; p_regras?: Json }
        Returns: undefined
      }
      schedule_monthly_dispatch:
        | {
            Args: {
              dispatch_type: string
              target_month: number
              target_year: number
            }
            Returns: string
          }
        | {
            Args: {
              schedule_date?: string
              target_month: number
              target_year: number
            }
            Returns: string
          }
      set_user_groups: {
        Args: { p_group_ids: string[]; p_user_id: string }
        Returns: undefined
      }
      sinc_banco_espelho: { Args: { p_empresa_id: string }; Returns: undefined }
      sinc_empresa_do_legado: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      sinc_empresa_excluida: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      sinc_empresa_produtos: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      test_especialistas_security: {
        Args: never
        Returns: {
          component: string
          message: string
          status: string
        }[]
      }
      update_group_permissions:
        | {
            Args: { group_id: string; permissions_data: Json }
            Returns: undefined
          }
        | {
            Args: {
              group_uuid: string
              permission_level: string
              screen_key: string
            }
            Returns: boolean
          }
      update_last_sign_in: { Args: never; Returns: undefined }
      user_can_access_baseline_historico: { Args: never; Returns: boolean }
      user_can_access_percentual_repasse_historico: {
        Args: never
        Returns: boolean
      }
      user_can_manage_banco_horas: { Args: never; Returns: boolean }
      user_can_manage_permissions: { Args: never; Returns: boolean }
      user_has_banco_horas_permission: { Args: never; Returns: boolean }
      user_has_baseline_permission: { Args: never; Returns: boolean }
      user_has_books_permission: {
        Args: { required_level?: string }
        Returns: boolean
      }
      user_has_organograma_permission: {
        Args: { required_level?: string }
        Returns: boolean
      }
      user_has_permission: {
        Args: {
          permission_level: string
          screen_key: string
          user_uuid: string
        }
        Returns: boolean
      }
      user_has_requerimentos_permission: {
        Args: { required_level?: string }
        Returns: boolean
      }
      user_has_screen_permission: {
        Args: { required_level?: string; required_screen: string }
        Returns: boolean
      }
      user_is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { user_uuid: string }; Returns: boolean }
      validar_comparacao: {
        Args: { p_empresa_id: string; p_motivo: string; p_validar: boolean }
        Returns: undefined
      }
      validar_limite_anexos_empresa: {
        Args: { empresa_id: string; tamanho_anexo: number }
        Returns: boolean
      }
      validate_especialista_sql_server: {
        Args: { especialista_name: string }
        Returns: boolean
      }
      voltar_para_legado: {
        Args: { p_empresa_id: string; p_motivo: string }
        Returns: Json
      }
    }
    Enums: {
      origem_especialista_enum: "sql_server" | "manual"
      origem_pesquisa_enum: "sql_server" | "manual"
      status_especialista_enum: "ativo" | "inativo" | "manual"
      status_pesquisa_enum:
        | "pendente"
        | "enviado"
        | "enviado_plano_acao"
        | "enviado_elogios"
      tipo_book_enum: "nao_tem_book" | "qualidade" | "outros"
      tipo_cobranca_enum: "banco_horas" | "ticket" | "outros"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      origem_especialista_enum: ["sql_server", "manual"],
      origem_pesquisa_enum: ["sql_server", "manual"],
      status_especialista_enum: ["ativo", "inativo", "manual"],
      status_pesquisa_enum: [
        "pendente",
        "enviado",
        "enviado_plano_acao",
        "enviado_elogios",
      ],
      tipo_book_enum: ["nao_tem_book", "qualidade", "outros"],
      tipo_cobranca_enum: ["banco_horas", "ticket", "outros"],
    },
  },
} as const
