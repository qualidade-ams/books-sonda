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
          baseline_horas: unknown
          baseline_tickets: number | null
          consumo_horas: unknown
          consumo_tickets: number | null
          consumo_total_horas: unknown
          consumo_total_tickets: number | null
          created_at: string | null
          created_by: string | null
          empresa_id: string
          excedentes_horas: unknown
          excedentes_tickets: number | null
          id: string
          is_fim_periodo: boolean | null
          mes: number
          observacao_publica: string | null
          reajustes_horas: unknown
          reajustes_tickets: number | null
          repasse_horas: unknown
          repasse_tickets: number | null
          repasses_mes_anterior_horas: unknown
          repasses_mes_anterior_tickets: number | null
          requerimentos_horas: unknown
          requerimentos_tickets: number | null
          saldo_a_utilizar_horas: unknown
          saldo_a_utilizar_tickets: number | null
          saldo_horas: unknown
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
          baseline_horas?: unknown
          baseline_tickets?: number | null
          consumo_horas?: unknown
          consumo_tickets?: number | null
          consumo_total_horas?: unknown
          consumo_total_tickets?: number | null
          created_at?: string | null
          created_by?: string | null
          empresa_id: string
          excedentes_horas?: unknown
          excedentes_tickets?: number | null
          id?: string
          is_fim_periodo?: boolean | null
          mes: number
          observacao_publica?: string | null
          reajustes_horas?: unknown
          reajustes_tickets?: number | null
          repasse_horas?: unknown
          repasse_tickets?: number | null
          repasses_mes_anterior_horas?: unknown
          repasses_mes_anterior_tickets?: number | null
          requerimentos_horas?: unknown
          requerimentos_tickets?: number | null
          saldo_a_utilizar_horas?: unknown
          saldo_a_utilizar_tickets?: number | null
          saldo_horas?: unknown
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
          baseline_horas?: unknown
          baseline_tickets?: number | null
          consumo_horas?: unknown
          consumo_tickets?: number | null
          consumo_total_horas?: unknown
          consumo_total_tickets?: number | null
          created_at?: string | null
          created_by?: string | null
          empresa_id?: string
          excedentes_horas?: unknown
          excedentes_tickets?: number | null
          id?: string
          is_fim_periodo?: boolean | null
          mes?: number
          observacao_publica?: string | null
          reajustes_horas?: unknown
          reajustes_tickets?: number | null
          repasse_horas?: unknown
          repasse_tickets?: number | null
          repasses_mes_anterior_horas?: unknown
          repasses_mes_anterior_tickets?: number | null
          requerimentos_horas?: unknown
          requerimentos_tickets?: number | null
          saldo_a_utilizar_horas?: unknown
          saldo_a_utilizar_tickets?: number | null
          saldo_horas?: unknown
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
          baseline_horas: unknown
          baseline_tickets: number | null
          calculo_id: string
          consumo_horas: unknown
          consumo_tickets: number | null
          consumo_total_horas: unknown
          consumo_total_tickets: number | null
          created_at: string | null
          id: string
          reajustes_horas: unknown
          reajustes_tickets: number | null
          repasse_horas: unknown
          repasse_tickets: number | null
          repasses_mes_anterior_horas: unknown
          repasses_mes_anterior_tickets: number | null
          requerimentos_horas: unknown
          requerimentos_tickets: number | null
          saldo_a_utilizar_horas: unknown
          saldo_a_utilizar_tickets: number | null
          saldo_horas: unknown
          saldo_tickets: number | null
        }
        Insert: {
          alocacao_id: string
          baseline_horas?: unknown
          baseline_tickets?: number | null
          calculo_id: string
          consumo_horas?: unknown
          consumo_tickets?: number | null
          consumo_total_horas?: unknown
          consumo_total_tickets?: number | null
          created_at?: string | null
          id?: string
          reajustes_horas?: unknown
          reajustes_tickets?: number | null
          repasse_horas?: unknown
          repasse_tickets?: number | null
          repasses_mes_anterior_horas?: unknown
          repasses_mes_anterior_tickets?: number | null
          requerimentos_horas?: unknown
          requerimentos_tickets?: number | null
          saldo_a_utilizar_horas?: unknown
          saldo_a_utilizar_tickets?: number | null
          saldo_horas?: unknown
          saldo_tickets?: number | null
        }
        Update: {
          alocacao_id?: string
          baseline_horas?: unknown
          baseline_tickets?: number | null
          calculo_id?: string
          consumo_horas?: unknown
          consumo_tickets?: number | null
          consumo_total_horas?: unknown
          consumo_total_tickets?: number | null
          created_at?: string | null
          id?: string
          reajustes_horas?: unknown
          reajustes_tickets?: number | null
          repasse_horas?: unknown
          repasse_tickets?: number | null
          repasses_mes_anterior_horas?: unknown
          repasses_mes_anterior_tickets?: number | null
          requerimentos_horas?: unknown
          requerimentos_tickets?: number | null
          saldo_a_utilizar_horas?: unknown
          saldo_a_utilizar_tickets?: number | null
          saldo_horas?: unknown
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
      clientes: {
        Row: {
          created_at: string | null
          data_status: string | null
          descricao_status: string | null
          email: string
          empresa_id: string | null
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
          categoria: string
          criado_em: string | null
          criado_por: string | null
          grupo: string
          id: string
          status: string
        }
        Insert: {
          atualizado_em?: string | null
          categoria: string
          criado_em?: string | null
          criado_por?: string | null
          grupo: string
          id?: string
          status?: string
        }
        Update: {
          atualizado_em?: string | null
          categoria?: string
          criado_em?: string | null
          criado_por?: string | null
          grupo?: string
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
          created_at: string | null
          created_by: string | null
          dados: Json
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dados: Json
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dados?: Json
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
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
      empresas_clientes: {
        Row: {
          anexo: boolean | null
          baseline_horas_mensal: unknown
          baseline_segmentado: boolean | null
          baseline_tickets_mensal: number | null
          book_personalizado: boolean | null
          ciclo_atual: number | null
          ciclos_para_zerar: number | null
          created_at: string | null
          data_status: string | null
          descricao_status: string | null
          em_projeto: boolean | null
          email_gestor: string | null
          id: string
          inicio_vigencia: string | null
          link_sharepoint: string | null
          meta_sla_percentual: number | null
          nome_abreviado: string
          nome_completo: string
          observacao: string | null
          percentual_repasse_especial: number | null
          percentual_repasse_mensal: number | null
          periodo_apuracao: number | null
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
          updated_at: string | null
          vigencia_final: string | null
          vigencia_inicial: string | null
        }
        Insert: {
          anexo?: boolean | null
          baseline_horas_mensal?: unknown
          baseline_segmentado?: boolean | null
          baseline_tickets_mensal?: number | null
          book_personalizado?: boolean | null
          ciclo_atual?: number | null
          ciclos_para_zerar?: number | null
          created_at?: string | null
          data_status?: string | null
          descricao_status?: string | null
          em_projeto?: boolean | null
          email_gestor?: string | null
          id?: string
          inicio_vigencia?: string | null
          link_sharepoint?: string | null
          meta_sla_percentual?: number | null
          nome_abreviado: string
          nome_completo: string
          observacao?: string | null
          percentual_repasse_especial?: number | null
          percentual_repasse_mensal?: number | null
          periodo_apuracao?: number | null
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
          updated_at?: string | null
          vigencia_final?: string | null
          vigencia_inicial?: string | null
        }
        Update: {
          anexo?: boolean | null
          baseline_horas_mensal?: unknown
          baseline_segmentado?: boolean | null
          baseline_tickets_mensal?: number | null
          book_personalizado?: boolean | null
          ciclo_atual?: number | null
          ciclos_para_zerar?: number | null
          created_at?: string | null
          data_status?: string | null
          descricao_status?: string | null
          em_projeto?: boolean | null
          email_gestor?: string | null
          id?: string
          inicio_vigencia?: string | null
          link_sharepoint?: string | null
          meta_sla_percentual?: number | null
          nome_abreviado?: string
          nome_completo?: string
          observacao?: string | null
          percentual_repasse_especial?: number | null
          percentual_repasse_mensal?: number | null
          periodo_apuracao?: number | null
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
          updated_at?: string | null
          vigencia_final?: string | null
          vigencia_inicial?: string | null
        }
        Relationships: []
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
            foreignKeyName: "historico_disparos_colaborador_id_fkey"
            columns: ["colaborador_id"]
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
          data_atividade: string
          data_envio: string
          data_sistema: string
          descricao_inconsistencia: string
          email_analista: string | null
          empresa: string | null
          enviado_por: string | null
          enviado_por_nome: string | null
          id: string
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
          data_atividade: string
          data_envio?: string
          data_sistema: string
          descricao_inconsistencia: string
          email_analista?: string | null
          empresa?: string | null
          enviado_por?: string | null
          enviado_por_nome?: string | null
          id?: string
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
          data_atividade?: string
          data_envio?: string
          data_sistema?: string
          descricao_inconsistencia?: string
          email_analista?: string | null
          empresa?: string | null
          enviado_por?: string | null
          enviado_por_nome?: string | null
          id?: string
          mes_referencia?: number
          nro_chamado?: string
          origem?: string
          tempo_gasto_horas?: string | null
          tempo_gasto_minutos?: number | null
          tipo_chamado?: string | null
          tipo_inconsistencia?: string
          updated_at?: string | null
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
      pesquisas_satisfacao: {
        Row: {
          ano_abertura: number | null
          autor_id: string | null
          autor_nome: string | null
          categoria: string | null
          chave_unica: string | null
          cliente: string
          cliente_id: string | null
          comentario_pesquisa: string | null
          created_at: string | null
          data_encaminhamento: string | null
          data_envio: string | null
          data_resposta: string | null
          email_cliente: string | null
          empresa: string
          empresa_id: string | null
          grupo: string | null
          hash_origem: string | null
          id: string
          id_externo: string | null
          mes_abertura: number | null
          nro_caso: string | null
          observacao: string | null
          origem: Database["public"]["Enums"]["origem_pesquisa_enum"]
          prestador: string | null
          resposta: string | null
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
          categoria?: string | null
          chave_unica?: string | null
          cliente: string
          cliente_id?: string | null
          comentario_pesquisa?: string | null
          created_at?: string | null
          data_encaminhamento?: string | null
          data_envio?: string | null
          data_resposta?: string | null
          email_cliente?: string | null
          empresa: string
          empresa_id?: string | null
          grupo?: string | null
          hash_origem?: string | null
          id?: string
          id_externo?: string | null
          mes_abertura?: number | null
          nro_caso?: string | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["origem_pesquisa_enum"]
          prestador?: string | null
          resposta?: string | null
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
          categoria?: string | null
          chave_unica?: string | null
          cliente?: string
          cliente_id?: string | null
          comentario_pesquisa?: string | null
          created_at?: string | null
          data_encaminhamento?: string | null
          data_envio?: string | null
          data_resposta?: string | null
          email_cliente?: string | null
          empresa?: string
          empresa_id?: string | null
          grupo?: string | null
          hash_origem?: string | null
          id?: string
          id_externo?: string | null
          mes_abertura?: number | null
          nro_caso?: string | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["origem_pesquisa_enum"]
          prestador?: string | null
          resposta?: string | null
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
        }
        Insert: {
          acao_preventiva?: string | null
          atualizado_em?: string | null
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
        }
        Update: {
          acao_preventiva?: string | null
          atualizado_em?: string | null
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
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
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
          enviado_faturamento: boolean
          horas_funcional: number
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
          valor_hora_tecnico: number | null
          valor_total_funcional: number | null
          valor_total_geral: number | null
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
          enviado_faturamento?: boolean
          horas_funcional?: number
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
          valor_hora_tecnico?: number | null
          valor_total_funcional?: number | null
          valor_total_geral?: number | null
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
          enviado_faturamento?: boolean
          horas_funcional?: number
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
          valor_hora_tecnico?: number | null
          valor_total_funcional?: number | null
          valor_total_geral?: number | null
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
      taxas_clientes: {
        Row: {
          atualizado_em: string | null
          cliente_id: string
          criado_em: string | null
          criado_por: string | null
          id: string
          personalizado: boolean | null
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
      [_ in never]: never
    }
    Functions: {
      assign_user_to_group: {
        Args: {
          assigned_by_uuid: string
          group_uuid: string
          user_uuid: string
        }
        Returns: boolean
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
      check_requerimentos_permission:
        | {
            Args: { required_level?: string; screen_key_param: string }
            Returns: boolean
          }
        | { Args: { user_id: string }; Returns: boolean }
      cleanup_old_jobs: { Args: never; Returns: number }
      cleanup_realtime_old_data: { Args: never; Returns: undefined }
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
      inativar_empresas_vencidas: { Args: never; Returns: number }
      limpar_anexos_expirados: { Args: never; Returns: number }
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
      obter_estatisticas_valores_requerimentos: {
        Args: { p_mes_cobranca?: number; p_tipo_cobranca?: string }
        Returns: {
          quantidade_requerimentos: number
          tipo_cobranca: string
          total_horas_funcional: number
          total_horas_geral: number
          total_horas_tecnico: number
          valor_medio_hora_funcional: number
          valor_medio_hora_tecnico: number
          valor_total_funcional: number
          valor_total_geral: number
          valor_total_tecnico: number
        }[]
      }
      obter_ultima_sincronizacao_pesquisas: {
        Args: { p_tipo_sincronizacao: string }
        Returns: string
      }
      realtime_maintenance: { Args: never; Returns: string }
      registrar_sincronizacao_pesquisas: {
        Args: {
          p_detalhes?: Json
          p_registros_novos?: number
          p_registros_processados?: number
          p_tipo_sincronizacao: string
        }
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
      test_especialistas_security: {
        Args: never
        Returns: {
          component: string
          message: string
          status: string
        }[]
      }
      test_requerimentos_data_operations: {
        Args: never
        Returns: {
          message: string
          operation: string
          status: string
        }[]
      }
      test_sistema_requerimentos_infrastructure: {
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
      user_has_banco_horas_permission: { Args: never; Returns: boolean }
      user_has_books_permission: {
        Args: { required_level?: string; required_screen: string }
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
        Args: { required_level?: string; required_screen: string }
        Returns: boolean
      }
      user_has_screen_permission: {
        Args: { required_level?: string; required_screen: string }
        Returns: boolean
      }
      user_is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { user_uuid: string }; Returns: boolean }
      validar_limite_anexos_empresa: {
        Args: { empresa_id: string; tamanho_anexo: number }
        Returns: boolean
      }
      validate_especialista_sql_server: {
        Args: { especialista_name: string }
        Returns: boolean
      }
    }
    Enums: {
      origem_especialista_enum: "sql_server" | "manual"
      origem_pesquisa_enum: "sql_server" | "manual"
      status_especialista_enum: "ativo" | "inativo"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      status_especialista_enum: ["ativo", "inativo"],
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
