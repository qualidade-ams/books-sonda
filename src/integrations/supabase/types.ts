export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      aplicativos: {
        Row: {
          ativo: boolean
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      approval_notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          quote_id: string
          read: boolean
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          quote_id: string
          read?: boolean
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          quote_id?: string
          read?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_notifications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "pending_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_settings: {
        Row: {
          approver_email: string
          auto_approval_domains: string[]
          created_at: string | null
          email_notifications: boolean
          id: string
          updated_at: string | null
        }
        Insert: {
          approver_email?: string
          auto_approval_domains?: string[]
          created_at?: string | null
          email_notifications?: boolean
          id?: string
          updated_at?: string | null
        }
        Update: {
          approver_email?: string
          auto_approval_domains?: string[]
          created_at?: string | null
          email_notifications?: boolean
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      config_prefeituras: {
        Row: {
          calibracao: number | null
          created_at: string | null
          id: string
          quantidade_municipios: number
          regra_id: string
          sob_consulta: boolean | null
        }
        Insert: {
          calibracao?: number | null
          created_at?: string | null
          id?: string
          quantidade_municipios: number
          regra_id: string
          sob_consulta?: boolean | null
        }
        Update: {
          calibracao?: number | null
          created_at?: string | null
          id?: string
          quantidade_municipios?: number
          regra_id?: string
          sob_consulta?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "config_prefeituras_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "regras_precificacao"
            referencedColumns: ["id"]
          },
        ]
      }
      config_saas: {
        Row: {
          created_at: string | null
          devops: number
          hosting: number
          id: string
          nome_plano: string
          plano: string
          regra_id: string
          setup: number
          volumetria_max: number | null
          volumetria_min: number
        }
        Insert: {
          created_at?: string | null
          devops: number
          hosting: number
          id?: string
          nome_plano: string
          plano: string
          regra_id: string
          setup: number
          volumetria_max?: number | null
          volumetria_min: number
        }
        Update: {
          created_at?: string | null
          devops?: number
          hosting?: number
          id?: string
          nome_plano?: string
          plano?: string
          regra_id?: string
          setup?: number
          volumetria_max?: number | null
          volumetria_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "config_saas_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "regras_precificacao"
            referencedColumns: ["id"]
          },
        ]
      }
      config_suporte: {
        Row: {
          ano: number
          created_at: string | null
          id: string
          preco_unitario: number
          quantidade_horas: number
          regra_id: string
          tipo_suporte: string
          total: number
        }
        Insert: {
          ano: number
          created_at?: string | null
          id?: string
          preco_unitario: number
          quantidade_horas: number
          regra_id: string
          tipo_suporte: string
          total: number
        }
        Update: {
          ano?: number
          created_at?: string | null
          id?: string
          preco_unitario?: number
          quantidade_horas?: number
          regra_id?: string
          tipo_suporte?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "config_suporte_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "regras_precificacao"
            referencedColumns: ["id"]
          },
        ]
      }
      config_va: {
        Row: {
          agregado: number
          calibracao: number
          created_at: string | null
          fator: number
          id: string
          regra_id: string
          va: number
        }
        Insert: {
          agregado: number
          calibracao: number
          created_at?: string | null
          fator: number
          id?: string
          regra_id: string
          va: number
        }
        Update: {
          agregado?: number
          calibracao?: number
          created_at?: string | null
          fator?: number
          id?: string
          regra_id?: string
          va?: number
        }
        Relationships: [
          {
            foreignKeyName: "config_va_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "regras_precificacao"
            referencedColumns: ["id"]
          },
        ]
      }
      email_config: {
        Row: {
          created_at: string | null
          id: string
          porta: number
          senha: string
          servidor: string
          ssl: boolean | null
          updated_at: string | null
          usuario: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          porta: number
          senha: string
          servidor: string
          ssl?: boolean | null
          updated_at?: string | null
          usuario: string
        }
        Update: {
          created_at?: string | null
          id?: string
          porta?: number
          senha?: string
          servidor?: string
          ssl?: boolean | null
          updated_at?: string | null
          usuario?: string
        }
        Relationships: []
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
      config_busca_ativa: {
        Row: {
          id: string
          regra_id: string
          categoria: string
          volumetria_mensal: number
          custo: number
          calibracao: number
          volumetria_anual: number | null
          preco: number
          valor_anual: number | null
          valor_mensal: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          regra_id: string
          categoria: string
          volumetria_mensal: number
          custo: number
          calibracao: number
          preco: number
          created_at?: string | null
        }
        Update: {
          id?: string
          regra_id?: string
          categoria?: string
          volumetria_mensal?: number
          custo?: number
          calibracao?: number
          preco?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "config_busca_ativa_regra_id_fkey",
            columns: ["regra_id"],
            isOneToOne: false,
            referencedRelation: "regras_precificacao",
            referencedColumns: ["id"],
          },
        ]
      }
      pending_quotes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          form_data: Json
          id: string
          product_type: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          form_data: Json
          id?: string
          product_type: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          form_data?: Json
          id?: string
          product_type?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      regras_precificacao: {
        Row: {
          ano: number
          aplicativo_id: string
          bloco_k_lu: number
          bloco_k_ma: number
          calibracao_lu: number
          created_at: string | null
          custo_base: number | null
          custo_medio: number | null
          custo_mensal: number
          custo_percent: number | null
          id: string
          lu_ma_minima: number
          lu_meses: number
          margem_venda: number
          qtd_clientes: number
          receita_custo_percent: number | null
          receita_mensal: number
          reinf_lu: number
          reinf_ma: number
          updated_at: string | null
        }
        Insert: {
          ano: number
          aplicativo_id: string
          bloco_k_lu: number
          bloco_k_ma: number
          calibracao_lu: number
          created_at?: string | null
          custo_base?: number | null
          custo_medio?: number | null
          custo_mensal: number
          custo_percent?: number | null
          id?: string
          lu_ma_minima: number
          lu_meses: number
          margem_venda: number
          qtd_clientes: number
          receita_custo_percent?: number | null
          receita_mensal: number
          reinf_lu: number
          reinf_ma: number
          updated_at?: string | null
        }
        Update: {
          ano?: number
          aplicativo_id?: string
          bloco_k_lu?: number
          bloco_k_ma?: number
          calibracao_lu?: number
          created_at?: string | null
          custo_base?: number | null
          custo_medio?: number | null
          custo_mensal?: number
          custo_percent?: number | null
          id?: string
          lu_ma_minima?: number
          lu_meses?: number
          margem_venda?: number
          qtd_clientes?: number
          receita_custo_percent?: number | null
          receita_mensal?: number
          reinf_lu?: number
          reinf_ma?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regras_precificacao_aplicativo_id_fkey"
            columns: ["aplicativo_id"]
            isOneToOne: false
            referencedRelation: "aplicativos"
            referencedColumns: ["id"]
          },
        ]
      }
      valores_personalizados: {
        Row: {
          campo: string
          created_at: string | null
          id: string
          quote_id: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          campo: string
          created_at?: string | null
          id?: string
          quote_id: string
          updated_at?: string | null
          valor?: number
        }
        Update: {
          campo?: string
          created_at?: string | null
          id?: string
          quote_id?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "valores_personalizados_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "pending_quotes"
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
      quotes: {
        Row: {
          id: string
          razao_social: string
          cnpj: string
          municipio: string
          uf: string
          responsavel: string
          email: string
          crm: string | null
          product_type: 'book'
          segmento: string
          modalidade: 'mensal'
          volumetria_notas: string
          prazo_contratacao: number
          escopo_inbound: string[] | null
          escopo_outbound: string[] | null
          escopo_fiscal: string[] | null
          modelos_notas: string[] | null
          cenarios_negocio: string[] | null
          quantidade_empresas: number
          quantidade_ufs: number
          quantidade_prefeituras: number | null
          quantidade_concessionarias: number | null
          quantidade_faturas: number | null
          valor_licenca_uso: number | null
          valor_suporte: number | null
          valor_licenca_uso_edocs: number | null
          valor_manutencao: number | null
          valor_manutencao_edocs: number | null
          valor_ss_mensal: number | null
          valor_total_mensal_saas: number | null
          valor_saas: number | null
          hosting: number | null
          devops: number | null
          setup: number | null
          hosting_ed: number | null
          devops_ed: number | null
          setup_ed: number | null
          valor_saas_ed: number | null
          valor_ss_ed_mensal: number | null
          valor_lu_mensal: number | null
          valor_sp_mensal: number | null
          valor_ma_ed_mensal: number | null
          valor_ma_mensal: number | null
          valor_total_mensal: number | null
          valor_total_ed_mensal: number | null
          valor_total: number
          form_data: Json
          status: 'generated' | 'sent' | 'approved' | 'rejected'
          requires_approval: boolean
          approval_quote_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          razao_social: string
          cnpj: string
          municipio: string
          uf: string
          responsavel: string
          email: string
          crm?: string | null
          product_type: 'book'
          segmento: string
          modalidade: 'mensal'
          volumetria_notas: string
          prazo_contratacao: number
          escopo_inbound?: string[] | null
          escopo_outbound?: string[] | null
          escopo_fiscal?: string[] | null
          modelos_notas?: string[] | null
          cenarios_negocio?: string[] | null
          quantidade_empresas: number
          quantidade_ufs: number
          quantidade_prefeituras?: number | null
          quantidade_concessionarias?: number | null
          quantidade_faturas?: number | null
          valor_licenca_uso?: number | null
          valor_suporte?: number | null
          valor_licenca_uso_edocs?: number | null
          valor_manutencao?: number | null
          valor_manutencao_edocs?: number | null
          valor_ss_mensal?: number | null
          valor_total_mensal_saas?: number | null
          valor_saas?: number | null
          hosting?: number | null
          devops?: number | null
          setup?: number | null
          hosting_ed?: number | null
          devops_ed?: number | null
          setup_ed?: number | null
          valor_saas_ed?: number | null
          valor_ss_ed_mensal?: number | null
          valor_lu_mensal?: number | null
          valor_sp_mensal?: number | null
          valor_ma_ed_mensal?: number | null
          valor_ma_mensal?: number | null
          valor_total_mensal?: number | null
          valor_total_ed_mensal?: number | null
          valor_total: number
          form_data: Json
          status?: 'generated' | 'sent' | 'approved' | 'rejected'
          requires_approval?: boolean
          approval_quote_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          razao_social?: string
          cnpj?: string
          municipio?: string
          uf?: string
          responsavel?: string
          email?: string
          crm?: string | null
          product_type?: 'comply_edocs' | 'comply_fiscal'
          segmento?: string
          modalidade?: 'on-premise' | 'saas'
          volumetria_notas?: string
          prazo_contratacao?: number
          escopo_inbound?: string[] | null
          escopo_outbound?: string[] | null
          escopo_fiscal?: string[] | null
          modelos_notas?: string[] | null
          cenarios_negocio?: string[] | null
          quantidade_empresas?: number
          quantidade_ufs?: number
          quantidade_prefeituras?: number | null
          quantidade_concessionarias?: number | null
          quantidade_faturas?: number | null
          valor_licenca_uso?: number | null
          valor_suporte?: number | null
          valor_licenca_uso_edocs?: number | null
          valor_manutencao?: number | null
          valor_manutencao_edocs?: number | null
          valor_ss_mensal?: number | null
          valor_total_mensal_saas?: number | null
          valor_saas?: number | null
          hosting?: number | null
          devops?: number | null
          setup?: number | null
          hosting_ed?: number | null
          devops_ed?: number | null
          setup_ed?: number | null
          valor_saas_ed?: number | null
          valor_ss_ed_mensal?: number | null
          valor_lu_mensal?: number | null
          valor_sp_mensal?: number | null
          valor_ma_ed_mensal?: number | null
          valor_ma_mensal?: number | null
          valor_total_mensal?: number | null
          valor_total_ed_mensal?: number | null
          valor_total?: number
          form_data?: Json
          status?: 'generated' | 'sent' | 'approved' | 'rejected'
          requires_approval?: boolean
          approval_quote_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_approval_quote_id_fkey"
            columns: ["approval_quote_id"]
            isOneToOne: false
            referencedRelation: "pending_quotes"
            referencedColumns: ["id"]
          }
        ]
      }
      user_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          is_default_admin: boolean | null
          created_at: string | null
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_default_admin?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_default_admin?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_groups_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_group_assignments: {
        Row: {
          id: string
          user_id: string
          group_id: string
          assigned_at: string | null
          assigned_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          group_id: string
          assigned_at?: string | null
          assigned_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          group_id?: string
          assigned_at?: string | null
          assigned_by?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_group_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "user_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      screens: {
        Row: {
          key: string
          name: string
          description: string | null
          category: string | null
          route: string | null
        }
        Insert: {
          key: string
          name: string
          description?: string | null
          category?: string | null
          route?: string | null
        }
        Update: {
          key?: string
          name?: string
          description?: string | null
          category?: string | null
          route?: string | null
        }
        Relationships: []
      }
      screen_permissions: {
        Row: {
          id: string
          group_id: string
          screen_key: string
          permission_level: 'none' | 'view' | 'edit'
          created_at: string | null
          updated_at: string | null
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          group_id: string
          screen_key: string
          permission_level: 'none' | 'view' | 'edit'
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          group_id?: string
          screen_key?: string
          permission_level?: 'none' | 'view' | 'edit'
          created_at?: string | null
          updated_at?: string | null
          created_by?: string | null
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
          {
            foreignKeyName: "screen_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screen_permissions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      permission_audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: "INSERT" | "UPDATE" | "DELETE"
          old_values: Json | null
          new_values: Json | null
          changed_by: string
          changed_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: "INSERT" | "UPDATE" | "DELETE"
          old_values?: Json | null
          new_values?: Json | null
          changed_by: string
          changed_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: "INSERT" | "UPDATE" | "DELETE"
          old_values?: Json | null
          new_values?: Json | null
          changed_by?: string
          changed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      empresas_clientes: {
        Row: {
          id: string
          nome_completo: string
          nome_abreviado: string
          link_sharepoint: string | null
          template_padrao: string
          status: string
          data_status: string
          descricao_status: string | null
          email_gestor: string | null
          tem_ams: boolean
          tipo_book: 'nao_tem_book' | 'outros' | 'qualidade'
          book_personalizado: boolean
          anexo: boolean
          vigencia_inicial: string | null
          vigencia_final: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome_completo: string
          nome_abreviado: string
          link_sharepoint?: string | null
          template_padrao?: string
          status?: string
          data_status?: string
          descricao_status?: string | null
          email_gestor?: string | null
          tem_ams?: boolean
          tipo_book?: 'nao_tem_book' | 'outros' | 'qualidade'
          book_personalizado?: boolean
          anexo?: boolean
          vigencia_inicial?: string | null
          vigencia_final?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome_completo?: string
          nome_abreviado?: string
          link_sharepoint?: string | null
          template_padrao?: string
          status?: string
          data_status?: string
          descricao_status?: string | null
          email_gestor?: string | null
          tem_ams?: boolean
          tipo_book?: 'nao_tem_book' | 'outros' | 'qualidade'
          book_personalizado?: boolean
          anexo?: boolean
          vigencia_inicial?: string | null
          vigencia_final?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      empresa_produtos: {
        Row: {
          id: string
          empresa_id: string
          produto: string
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          produto: string
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          produto?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          }
        ]
      }
      grupos_responsaveis: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      grupo_emails: {
        Row: {
          id: string
          grupo_id: string
          email: string
          nome: string | null
          created_at: string
        }
        Insert: {
          id?: string
          grupo_id: string
          email: string
          nome?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          grupo_id?: string
          email?: string
          nome?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grupo_emails_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_responsaveis"
            referencedColumns: ["id"]
          }
        ]
      }
      empresa_grupos: {
        Row: {
          id: string
          empresa_id: string
          grupo_id: string
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id: string
          grupo_id: string
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          grupo_id?: string
          created_at?: string
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
          }
        ]
      }
      clientes: {
        Row: {
          id: string
          nome_completo: string
          email: string
          funcao: string | null
          empresa_id: string
          status: string
          data_status: string
          descricao_status: string | null
          principal_contato: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome_completo: string
          email: string
          funcao?: string | null
          empresa_id: string
          status?: string
          data_status?: string
          descricao_status?: string | null
          principal_contato?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome_completo?: string
          email?: string
          funcao?: string | null
          empresa_id?: string
          status?: string
          data_status?: string
          descricao_status?: string | null
          principal_contato?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          }
        ]
      }
      historico_disparos: {
        Row: {
          id: string
          empresa_id: string | null
          cliente_id: string | null
          template_id: string | null
          status: string
          data_disparo: string | null
          data_agendamento: string | null
          erro_detalhes: string | null
          assunto: string | null
          emails_cc: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          empresa_id?: string | null
          cliente_id?: string | null
          template_id?: string | null
          status: string
          data_disparo?: string | null
          data_agendamento?: string | null
          erro_detalhes?: string | null
          assunto?: string | null
          emails_cc?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          empresa_id?: string | null
          cliente_id?: string | null
          template_id?: string | null
          status?: string
          data_disparo?: string | null
          data_agendamento?: string | null
          erro_detalhes?: string | null
          assunto?: string | null
          emails_cc?: string[] | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_disparos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_disparos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          }
        ]
      }
      controle_mensal: {
        Row: {
          id: string
          mes: number
          ano: number
          empresa_id: string | null
          status: string
          data_processamento: string | null
          observacoes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          mes: number
          ano: number
          empresa_id?: string | null
          status?: string
          data_processamento?: string | null
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          mes?: number
          ano?: number
          empresa_id?: string | null
          status?: string
          data_processamento?: string | null
          observacoes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "controle_mensal_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
