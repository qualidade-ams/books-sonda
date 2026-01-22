/**
 * Type definitions for Banco de Horas (Hours Bank) management system
 * 
 * This module contains all TypeScript interfaces for the contract-based hours bank
 * management system, including calculations, allocations, adjustments, and audit logs.
 * 
 * @module types/bancoHoras
 */

/**
 * Contract parameters for a client company
 * 
 * Defines the configuration and rules for how the hours bank operates for a specific
 * client contract, including baseline values, billing cycles, and rollover rules.
 */
export interface ParametrosContrato {
  /** Type of contract: hours-based, tickets-based, or both */
  tipo_contrato: 'horas' | 'tickets' | 'ambos';
  
  /** Assessment period in months (1-12) - defines when balances are closed */
  periodo_apuracao: number;
  
  /** Contract start date - when the hours bank begins tracking */
  inicio_vigencia: Date;
  
  /** Monthly baseline hours in HH:MM format (optional, required if tipo_contrato includes 'horas') */
  baseline_horas_mensal?: string;
  
  /** Monthly baseline tickets as decimal (optional, required if tipo_contrato includes 'tickets') */
  baseline_tickets_mensal?: number;
  
  /** Whether contract has special rollover rules (true = balance carries over multiple cycles) */
  possui_repasse_especial: boolean;
  
  /** Number of cycles before positive balance is zeroed (only applies if possui_repasse_especial = true) */
  ciclos_para_zerar: number;
  
  /** Monthly rollover percentage (0-100) - percentage of positive balance to carry forward */
  percentual_repasse_mensal: number;
  
  /** Current cycle number (1 to ciclos_para_zerar) */
  ciclo_atual: number;
}

/**
 * Internal allocation of baseline hours/tickets
 * 
 * Allows segmenting a company's baseline into multiple allocations (e.g., by department,
 * project, or cost center). The sum of all allocation percentages must equal 100%.
 */
export interface Alocacao {
  /** Unique identifier */
  id: string;
  
  /** Reference to parent company */
  empresa_id: string;
  
  /** Descriptive name for this allocation (e.g., "IT Department", "Project Alpha") */
  nome_alocacao: string;
  
  /** Percentage of baseline allocated to this segment (1-100) */
  percentual_baseline: number;
  
  /** Whether this allocation is currently active */
  ativo: boolean;
  
  /** Timestamp when allocation was created */
  created_at: Date;
  
  /** Timestamp when allocation was last updated */
  updated_at: Date;
  
  /** User who created this allocation */
  created_by?: string;
  
  /** User who last updated this allocation */
  updated_by?: string;
}

/**
 * Monthly consolidated calculation for hours bank
 * 
 * Represents the complete calculation for a specific company and month, including all
 * formulas: baseline, consumption, rollovers, adjustments, balance, and overages.
 * This is the "consolidated view" that aggregates all values.
 * 
 * IMPORTANTE: Apenas 1 registro por empresa/mês/ano. Versionamento é feito na tabela banco_horas_versoes.
 */
export interface BancoHorasCalculo {
  /** Unique identifier */
  id: string;
  
  /** Reference to company */
  empresa_id: string;
  
  /** Month (1-12) */
  mes: number;
  
  /** Year (e.g., 2024) */
  ano: number;
  
  // ===== Calculated Values - Hours =====
  
  /** Monthly baseline hours in HH:MM format */
  baseline_horas?: string;
  
  /** Hours rolled over from previous month in HH:MM format */
  repasses_mes_anterior_horas?: string;
  
  /** Available balance to use (baseline + rollover) in HH:MM format */
  saldo_a_utilizar_horas?: string;
  
  /** Consumed hours from Aranda timesheets in HH:MM format */
  consumo_horas?: string;
  
  /** Hours from billed/posted requirements in HH:MM format */
  requerimentos_horas?: string;
  
  /** Manual adjustments (positive or negative) in HH:MM format */
  reajustes_horas?: string;
  
  /** Total consumption (consumo + requerimentos - reajustes) in HH:MM format */
  consumo_total_horas?: string;
  
  /** Monthly balance (saldo_a_utilizar - consumo_total) in HH:MM format */
  saldo_horas?: string;
  
  /** Amount to roll over to next month in HH:MM format */
  repasse_horas?: string;
  
  /** Overage hours (if saldo negative at period end) in HH:MM format */
  excedentes_horas?: string;
  
  /** Monetary value of overage hours */
  valor_excedentes_horas?: number;
  
  // ===== Calculated Values - Tickets =====
  
  /** Monthly baseline tickets */
  baseline_tickets?: number;
  
  /** Tickets rolled over from previous month */
  repasses_mes_anterior_tickets?: number;
  
  /** Available tickets to use (baseline + rollover) */
  saldo_a_utilizar_tickets?: number;
  
  /** Consumed tickets */
  consumo_tickets?: number;
  
  /** Tickets from billed/posted requirements */
  requerimentos_tickets?: number;
  
  /** Manual ticket adjustments (positive or negative) */
  reajustes_tickets?: number;
  
  /** Total ticket consumption (consumo + requerimentos - reajustes) */
  consumo_total_tickets?: number;
  
  /** Monthly ticket balance (saldo_a_utilizar - consumo_total) */
  saldo_tickets?: number;
  
  /** Tickets to roll over to next month */
  repasse_tickets?: number;
  
  /** Overage tickets (if saldo negative at period end) */
  excedentes_tickets?: number;
  
  /** Monetary value of overage tickets */
  valor_excedentes_tickets?: number;
  
  // ===== Metadata =====
  
  /** Total amount to bill (sum of all overages) */
  valor_a_faturar?: number;
  
  /** Public observation visible to client */
  observacao_publica?: string;
  
  /** Whether this is the end of an assessment period */
  is_fim_periodo: boolean;
  
  /** Hourly rate used for overage calculation */
  taxa_hora_utilizada?: number;
  
  /** Ticket rate used for overage calculation */
  taxa_ticket_utilizada?: number;
  
  /** Timestamp when calculation was created */
  created_at: Date;
  
  /** Timestamp when calculation was last updated */
  updated_at: Date;
  
  /** User who created this calculation */
  created_by?: string;
  
  /** User who last updated this calculation */
  updated_by?: string;
}

/**
 * Segmented calculation by allocation
 * 
 * Represents proportional values for a specific allocation within a monthly calculation.
 * These values are derived from the consolidated calculation by applying the allocation's
 * percentage. This is the "segmented view" that shows how values are distributed.
 */
export interface BancoHorasCalculoSegmentado {
  /** Unique identifier */
  id: string;
  
  /** Reference to parent consolidated calculation */
  calculo_id: string;
  
  /** Reference to allocation */
  alocacao_id: string;
  
  /** Allocation details (populated via join) */
  alocacao?: Alocacao;
  
  // ===== Proportional Values - Hours =====
  
  /** Proportional baseline hours in HH:MM format */
  baseline_horas?: string;
  
  /** Proportional rollover hours in HH:MM format */
  repasses_mes_anterior_horas?: string;
  
  /** Proportional available balance in HH:MM format */
  saldo_a_utilizar_horas?: string;
  
  /** Proportional consumed hours in HH:MM format */
  consumo_horas?: string;
  
  /** Proportional requirement hours in HH:MM format */
  requerimentos_horas?: string;
  
  /** Proportional adjustment hours in HH:MM format */
  reajustes_horas?: string;
  
  /** Proportional total consumption in HH:MM format */
  consumo_total_horas?: string;
  
  /** Proportional balance in HH:MM format */
  saldo_horas?: string;
  
  /** Proportional rollover to next month in HH:MM format */
  repasse_horas?: string;
  
  // ===== Proportional Values - Tickets =====
  
  /** Proportional baseline tickets */
  baseline_tickets?: number;
  
  /** Proportional rollover tickets */
  repasses_mes_anterior_tickets?: number;
  
  /** Proportional available tickets */
  saldo_a_utilizar_tickets?: number;
  
  /** Proportional consumed tickets */
  consumo_tickets?: number;
  
  /** Proportional requirement tickets */
  requerimentos_tickets?: number;
  
  /** Proportional adjustment tickets */
  reajustes_tickets?: number;
  
  /** Proportional total ticket consumption */
  consumo_total_tickets?: number;
  
  /** Proportional ticket balance */
  saldo_tickets?: number;
  
  /** Proportional ticket rollover to next month */
  repasse_tickets?: number;
  
  /** Timestamp when segmented calculation was created */
  created_at: Date;
}

/**
 * Manual adjustment (reajuste) to monthly calculation
 * 
 * Represents a manual adjustment made by an administrator to correct or modify
 * the calculated values. Each adjustment requires a detailed observation explaining
 * the reason for the change. Adjustments are versioned and immutable.
 */
export interface BancoHorasReajuste {
  /** Unique identifier */
  id: string;
  
  /** Reference to calculation being adjusted (optional) */
  calculo_id?: string;
  
  /** Reference to company */
  empresa_id: string;
  
  /** Month of adjustment (1-12) */
  mes: number;
  
  /** Year of adjustment */
  ano: number;
  
  /** Adjustment value for hours in HH:MM format (can be positive or negative) */
  valor_reajuste_horas?: string;
  
  /** Adjustment value for tickets (can be positive or negative) */
  valor_reajuste_tickets?: number;
  
  /** Type of adjustment: entrada (adds hours/tickets) or saida (removes hours/tickets) */
  tipo_reajuste: 'entrada' | 'saida' | 'positivo' | 'negativo';
  
  /** Mandatory observation explaining the adjustment (minimum 10 characters) */
  observacao: string;
  
  /** Timestamp when adjustment was created */
  created_at: Date;
  
  /** User who created this adjustment (optional, can be null for system) */
  created_by?: string;
  
  /** Whether this adjustment is currently active (soft delete) */
  ativo: boolean;
}

/**
 * Version history for calculations
 * 
 * Tracks all changes to calculations over time, storing complete snapshots of data
 * before and after each change. This enables full audit trails and the ability to
 * compare different versions.
 */
export interface BancoHorasVersao {
  /** Unique identifier */
  id: string;
  
  /** Reference to calculation */
  calculo_id: string;
  
  /** Previous version number */
  versao_anterior: number;
  
  /** New version number */
  versao_nova: number;
  
  /** Complete snapshot of data before change */
  dados_anteriores: Record<string, any>;
  
  /** Complete snapshot of data after change */
  dados_novos: Record<string, any>;
  
  /** Explanation of why the change was made */
  motivo: string;
  
  /** Category of change */
  tipo_mudanca: 'reajuste' | 'recalculo' | 'correcao';
  
  /** Timestamp when version was created */
  created_at: Date;
  
  /** User who created this version */
  created_by: string;
}

/**
 * Audit log entry
 * 
 * Records all actions performed in the system for compliance and troubleshooting.
 * Captures who did what, when, and from where, along with relevant data about the action.
 */
export interface BancoHorasAuditLog {
  /** Unique identifier */
  id: string;
  
  /** Reference to company (optional, not all actions are company-specific) */
  empresa_id?: string;
  
  /** Reference to calculation (optional, not all actions are calculation-specific) */
  calculo_id?: string;
  
  /** Action performed (e.g., 'calculo_criado', 'reajuste_aplicado', 'recalculo_executado') */
  acao: string;
  
  /** Human-readable description of the action */
  descricao?: string;
  
  /** Additional structured data about the action */
  dados_acao?: Record<string, any>;
  
  /** Timestamp when action was performed */
  created_at: Date;
  
  /** User who performed the action */
  created_by?: string;
  
  /** IP address of the user */
  ip_address?: string;
  
  /** Browser user agent string */
  user_agent?: string;
}

/**
 * Differences between two versions
 * 
 * Helper type for comparing versions and displaying changes to users.
 */
export interface DiferencasVersao {
  /** Fields that were added in the new version */
  campos_adicionados: string[];
  
  /** Fields that were removed in the new version */
  campos_removidos: string[];
  
  /** Fields that changed values between versions */
  campos_modificados: Array<{
    campo: string;
    valor_anterior: any;
    valor_novo: any;
  }>;
}

/**
 * Validation result for integrated data
 * 
 * Used to check if all required external data is available before performing calculations.
 */
export interface ValidacaoDadosIntegrados {
  /** Whether all required data is valid and available */
  valido: boolean;
  
  /** List of validation errors or missing data */
  erros: string[];
  
  /** Warnings that don't prevent calculation but should be noted */
  avisos?: string[];
}

/**
 * Result of overage calculation
 * 
 * Contains the calculated overage amount and the rate used for the calculation.
 */
export interface ResultadoExcedente {
  /** Calculated overage value in currency */
  valor: number;
  
  /** Hourly or ticket rate used for calculation (null if no rate found) */
  taxa: number | null;
  
  /** Overage amount in hours (HH:MM) or tickets */
  quantidade: string | number;
  
  /** Type of overage */
  tipo: 'horas' | 'tickets';
}

/**
 * Billing description for overages
 * 
 * Formatted description to be used in invoices or billing systems.
 */
export interface DescricaoFaturamento {
  /** Company name */
  empresa_nome: string;
  
  /** Formatted description text */
  descricao: string;
  
  /** Month and year of the overage */
  periodo: string;
  
  /** Total amount to bill */
  valor_total: number;
  
  /** Breakdown by type (hours and/or tickets) */
  detalhes: Array<{
    tipo: 'horas' | 'tickets';
    quantidade: string | number;
    taxa: number;
    valor: number;
  }>;
}
