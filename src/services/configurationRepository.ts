import { supabase } from '@/integrations/supabase/client';
import type {
    ConfigurationRepository,
    DatabaseColumn,
    DatabaseValue,
    ConfigurationRequest
} from '@/types/configuration';
import { ConfigurationError } from '@/types/configuration';
import { DatabaseValidator } from '@/utils/validation';
import { ConfigurationErrorHandler, ErrorSeverity } from '@/utils/errorHandler';

/**
 * Repository for accessing configuration data from database
 * Handles queries to calibracao_colunas and calibracao_valores tables
 */
export class SupabaseConfigurationRepository implements ConfigurationRepository {

    /**
     * Fetch columns from calibracao_colunas table based on parameters
     * @param params Configuration request parameters
     * @returns Array of database columns
     */
    async fetchColumns(params: ConfigurationRequest): Promise<DatabaseColumn[]> {
        const context = ConfigurationErrorHandler.createContext('fetchColumns', params);

        try {
            console.log('🔍 Fetching columns with params:', params);

            // Para contornar o problema de tipos do Supabase, vamos usar uma abordagem mais genérica
            // Assumindo que as tabelas existem mas não estão tipadas corretamente
            const query = (supabase as any)
                .from('calibracao_colunas')
                .select('id, regra_id, nome, tipo, aba, created_at, updated_at');

            // Apply filters based on parameters
            let finalQuery = query;

            if (params.regraId) {
                finalQuery = finalQuery.eq('regra_id', params.regraId);
            }

            if (params.tipo) {
                finalQuery = finalQuery.eq('tipo', params.tipo);
            } else {
                // Default to 'percentual' type as per requirements
                finalQuery = finalQuery.eq('tipo', 'percentual');
            }

            if (params.aba) {
                finalQuery = finalQuery.eq('aba', params.aba);
            }

            // Order by nome for consistent results
            finalQuery = finalQuery.order('nome', { ascending: true });

            const { data, error } = await finalQuery;

            if (error) {
                console.error('❌ Database error fetching columns:', error);
                throw ConfigurationErrorHandler.handleDatabaseError(
                    new Error(`Failed to fetch columns: ${error.message}`),
                    context
                );
            }

            // Validar resposta do banco
            const expectedFields = ['id', 'regra_id', 'nome', 'tipo', 'aba'];
            if (!DatabaseValidator.isValidDatabaseResponse(data, expectedFields)) {
                throw new Error('Resposta inválida do banco de dados para colunas');
            }

            if (!data || data.length === 0) {
                console.log('⚠️ No columns found for parameters:', params);
                return [];
            }

            console.log(`✅ Found ${data.length} columns`);
            return data.map((row: any) => ({
                id: row.id,
                regra_id: row.regra_id,
                nome: row.nome,
                tipo: row.tipo,
                aba: row.aba,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));

        } catch (error) {
            console.error('❌ Error in fetchColumns:', error);

            if (error instanceof ConfigurationError) {
                throw error;
            }

            throw ConfigurationErrorHandler.handleDatabaseError(error, context);
        }
    }

    /**
     * Fetch values from calibracao_valores table for given column IDs
     * @param columnIds Array of column IDs to fetch values for
     * @param segmento Optional business segment filter
     * @returns Array of database values
     */
    async fetchValues(columnIds: string[], segmento?: string): Promise<DatabaseValue[]> {
        const context = ConfigurationErrorHandler.createContext('fetchValues', { columnIds, segmento });

        try {
            if (columnIds.length === 0) {
                console.log('⚠️ No column IDs provided for fetchValues');
                return [];
            }

            console.log('🔍 Fetching values for column IDs:', columnIds, 'segmento:', segmento);

            // Usar abordagem genérica para contornar problemas de tipos
            let query = (supabase as any)
                .from('calibracao_valores')
                .select('id, coluna_id, segmento, valor, created_at, updated_at')
                .in('coluna_id', columnIds);

            // Apply segmento filter if provided
            if (segmento) {
                query = query.eq('segmento', segmento);
            }

            // Order by coluna_id for consistent results
            query = query.order('coluna_id', { ascending: true });

            const { data, error } = await query;

            if (error) {
                console.error('❌ Database error fetching values:', error);
                throw ConfigurationErrorHandler.handleDatabaseError(
                    new Error(`Failed to fetch values: ${error.message}`),
                    context
                );
            }

            // Validar resposta do banco
            const expectedFields = ['id', 'coluna_id', 'segmento', 'valor'];
            if (!DatabaseValidator.isValidDatabaseResponse(data, expectedFields)) {
                throw new Error('Resposta inválida do banco de dados para valores');
            }

            if (!data || data.length === 0) {
                console.log('⚠️ No values found for column IDs:', columnIds);
                return [];
            }

            console.log(`✅ Found ${data.length} values`);
            return data.map((row: any) => ({
                id: row.id,
                coluna_id: row.coluna_id,
                segmento: row.segmento,
                valor: row.valor,
                created_at: row.created_at,
                updated_at: row.updated_at
            }));

        } catch (error) {
            console.error('❌ Error in fetchValues:', error);

            if (error instanceof ConfigurationError) {
                throw error;
            }

            throw ConfigurationErrorHandler.handleDatabaseError(error, context);
        }
    }

    /**
     * Test database connection
     * @returns Promise<boolean> indicating if connection is successful
     */
    async testConnection(): Promise<boolean> {
        const context = ConfigurationErrorHandler.createContext('testConnection');

        try {
            // Usar abordagem genérica para teste de conexão
            const { data, error } = await (supabase as any)
                .from('calibracao_colunas')
                .select('id')
                .limit(1);

            if (error) {
                console.error('❌ Database connection test failed:', error);
                const dbError = ConfigurationErrorHandler.handleDatabaseError(error, context);
                console.error('❌ Handled database error:', dbError.message);
                return false;
            }

            console.log('✅ Database connection test successful');
            return true;
        } catch (error) {
            console.error('❌ Database connection test error:', error);
            const dbError = ConfigurationErrorHandler.handleDatabaseError(error, context);
            console.error('❌ Handled connection error:', dbError.message);
            return false;
        }
    }

    /**
     * Get table statistics for monitoring
     */
    async getTableStats() {
        try {
            const [columnsResult, valuesResult] = await Promise.all([
                (supabase as any)
                    .from('calibracao_colunas')
                    .select('id', { count: 'exact', head: true }),
                (supabase as any)
                    .from('calibracao_valores')
                    .select('id', { count: 'exact', head: true })
            ]);

            return {
                columnsCount: columnsResult.count || 0,
                valuesCount: valuesResult.count || 0,
                columnsError: columnsResult.error?.message,
                valuesError: valuesResult.error?.message
            };
        } catch (error) {
            console.error('❌ Error getting table stats:', error);
            return {
                columnsCount: 0,
                valuesCount: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}

// Export singleton instance
export const configurationRepository = new SupabaseConfigurationRepository();