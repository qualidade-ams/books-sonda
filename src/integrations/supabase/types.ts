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
      pesquisas_satisfacao: {
        Row: {
          ano_abertura: number | null
          autor_id: string | null
          autor_nome: string | null
          categoria: string | null
          cliente: string
          cliente_id: string | null
          comentario_pesquisa: string | null
          created_at: string
          data_envio: string | null
          data_resposta: string | null
          email_cliente: string | null
          empresa: string
          empresa_id: string | null
          grupo: string | null
          id: string
          id_externo: string | null
          mes_abertura: number | null
          nro_caso: string | null
          observacao: string | null
          origem: Database["public"]["Enums"]["origem_pesquisa_enum"]
          prestador: string | null
          resposta: string | null
          status: Database["public"]["Enums"]["status_pesquisa_enum"]
          tipo_caso: string | null
          updated_at: string
        }
        Insert: {
          ano_abertura?: number | null
          autor_id?: string | null
          autor_nome?: string | null
          categoria?: string | null
          cliente: string
          cliente_id?: string | null
          comentario_pesquisa?: string | null
          created_at?: string
          data_envio?: string | null
          data_resposta?: string | null
          email_cliente?: string | null
          empresa: string
          empresa_id?: string | null
          grupo?: string | null
          id?: string
          id_externo?: string | null
          mes_abertura?: number | null
          nro_caso?: string | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["origem_pesquisa_enum"]
          prestador?: string | null
          resposta?: string | null
          status?: Database["public"]["Enums"]["status_pesquisa_enum"]
          tipo_caso?: string | null
          updated_at?: string
        }
        Update: {
          ano_abertura?: number | null
          autor_id?: string | null
          autor_nome?: string | null
          categoria?: string | null
          cliente?: string
          cliente_id?: string | null
          comentario_pesquisa?: string | null
          created_at?: string
          data_envio?: string | null
          data_resposta?: string | null
          email_cliente?: string | null
          empresa?: string
          empresa_id?: string | null
          grupo?: string | null
          id?: string
          id_externo?: string | null
          mes_abertura?: number | null
          nro_caso?: string | null
          observacao?: string | null
          origem?: Database["public"]["Enums"]["origem_pesquisa_enum"]
          prestador?: string | null
          resposta?: string | null
          status?: Database["public"]["Enums"]["status_pesquisa_enum"]
          tipo_caso?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesquisas_satisfacao_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_satisfacao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pesquisas_satisfacao_empresa_id_fkey"
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
      empresas_clientes: {
        Row: {
          anexo: boolean | null
          book_personalizado: boolean | null
          created_at: string | null
          data_status: string | null
          descricao_status: string | null
          email_gestor: string | null
          id: string
          link_sharepoint: string | null
          nome_abreviado: string
          nome_completo: string
          observacao: string | null
          status: string | null
          tem_ams: boolean | null
          template_padrao: string | null
          tipo_book: Database["public"]["Enums"]["tipo_book_enum"] | null
          tipo_cobranca: Database["public"]["Enums"]["tipo_cobranca_enum"] | null
          updated_at: string | null
          vigencia_final: string | null
          vigencia_inicial: string | null
        }
        Insert: {
          anexo?: boolean | null
          book_personalizado?: boolean | null
          created_at?: string | null
          data_status?: string | null
          descricao_status?: string | null
          email_gestor?: string | null
          id?: string
          link_sharepoint?: string | null
          nome_abreviado: string
          nome_completo: string
          observacao?: string | null
          status?: string | null
          tem_ams?: boolean | null
          template_padrao?: string | null
          tipo_book?: Database["public"]["Enums"]["tipo_book_enum"] | null
          tipo_cobranca?: Database["public"]["Enums"]["tipo_cobranca_enum"] | null
          updated_at?: string | null
          vigencia_final?: string | null
          vigencia_inicial?: string | null
        }
        Update: {
          anexo?: boolean | null
          book_personalizado?: boolean | null
          created_at?: string | null
          data_status?: string | null
          descricao_status?: string | null
          email_gestor?: string | null
          id?: string
          link_sharepoint?: string | null
          nome_abreviado?: string
          nome_completo?: string
          observacao?: string | null
          status?: string | null
          tem_ams?: boolean | null
          template_padrao?: string | null
          tipo_book?: Database["public"]["Enums"]["tipo_book_enum"] | null
          tipo_cobranca?: Database["public"]["Enums"]["tipo_cobranca_enum"] | null
          updated_at?: string | null
          vigencia_final?: string | null
          vigencia_inicial?: string | null
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
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
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
      requerimentos: {
        Row: {
          id: string
          chamado: string
          cliente_id: string
          modulo: string
          descricao: string
          data_envio: string
          data_aprovacao: string | null
          horas_funcional: number
          horas_tecnico: number
          horas_total: number
          linguagem: string
          tipo_cobranca: string
          mes_cobranca: string
          observacao: string | null
          valor_hora_funcional: number | null
          valor_hora_tecnico: number | null
          valor_total_funcional: number | null
          valor_total_tecnico: number | null
          valor_total_geral: number | null
          status: string
          enviado_faturamento: boolean
          data_envio_faturamento: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          chamado: string
          cliente_id: string
          modulo: string
          descricao: string
          data_envio: string
          data_aprovacao?: string | null
          horas_funcional: number
          horas_tecnico: number
          linguagem: string
          tipo_cobranca: string
          mes_cobranca: string
          observacao?: string | null
          valor_hora_funcional?: number | null
          valor_hora_tecnico?: number | null
          status?: string
          enviado_faturamento?: boolean
          data_envio_faturamento?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          chamado?: string
          cliente_id?: string
          modulo?: string
          descricao?: string
          data_envio?: string
          data_aprovacao?: string | null
          horas_funcional?: number
          horas_tecnico?: number
          linguagem?: string
          tipo_cobranca?: string
          mes_cobranca?: number
          observacao?: string | null
          valor_hora_funcional?: number | null
          valor_hora_tecnico?: number | null
          status?: string
          enviado_faturamento?: boolean
          data_envio_faturamento?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requerimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "empresas_clientes"
            referencedColumns: ["id"]
          }
        ]
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
      buscar_historico_com_anexos: {
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
      can_delete_group: {
        Args: { group_uuid: string }
        Returns: boolean
      }
      cleanup_old_jobs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      create_user_group: {
        Args: {
          created_by_uuid: string
          group_description: string
          group_name: string
        }
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
      gerar_caminho_anexo: {
        Args: {
          p_empresa_id: string
          p_nome_arquivo: string
          p_temporario?: boolean
        }
        Returns: string
      }
      get_job_statistics: {
        Args: Record<PropertyKey, never>
        Returns: {
          cancelled_jobs: number
          completed_jobs: number
          failed_jobs: number
          pending_jobs: number
          recent_failures: number
          running_jobs: number
          total_jobs: number
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
          group_name: string
          permission_level: string
          screen_key: string
        }[]
      }
      has_screen_permission: {
        Args: { required_level?: string; screen_key_param: string }
        Returns: boolean
      }
      inativar_empresas_vencidas: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      limpar_anexos_expirados: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      schedule_monthly_dispatch: {
        Args: {
          schedule_date?: string
          target_month: number
          target_year: number
        }
        Returns: string
      }
      update_group_permissions: {
        Args: { group_uuid: string; permissions_json: Json }
        Returns: boolean
      }
      user_has_permission: {
        Args: {
          required_level: string
          screen_key_param: string
          user_uuid: string
        }
        Returns: boolean
      }
      user_is_admin: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      validar_limite_anexos_empresa: {
        Args: { p_empresa_id: string; p_tamanho_novo: number }
        Returns: boolean
      }
    }
    Enums: {
      origem_pesquisa_enum: "sql_server" | "manual"
      status_pesquisa_enum: "pendente" | "enviado"
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
      origem_pesquisa_enum: ["sql_server", "manual"],
      status_pesquisa_enum: ["pendente", "enviado"],
      tipo_book_enum: ["nao_tem_book", "qualidade", "outros"],
      tipo_cobranca_enum: ["banco_horas", "ticket", "outros"],
    },
  },
} as const
