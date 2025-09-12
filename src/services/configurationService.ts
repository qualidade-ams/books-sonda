import type {
    ConfigurationService,
    ColumnConfig,
    LegacyColumnConfig,
    ConfigurationRequest
} from '@/types/configuration';
import { ConfigurationError } from '@/types/configuration';
import { configurationRepository } from '@/services/configurationRepository';
import { cacheManager } from '@/services/cacheManager';
import { ConfigurationMapper } from '@/utils/configurationMapper';
import { ConfigurationValidator } from '@/utils/validation';
import { ConfigurationErrorHandler, ErrorSeverity, HealthMonitor } from '@/utils/errorHandler';
import { FallbackManager, FallbackReason } from '@/utils/fallbackManager';
import { CacheKeyGenerator } from '@/utils/cacheKeyGenerator';
import { configurationLogger, LogCategory } from '@/utils/configurationLogger';

/**
 * Serviço principal de configuração que integra cache, repositório e validação
 * Substitui os arrays hardcoded configColunas por configuração dinâmica do banco
 */
export class DynamicConfigurationService implements ConfigurationService {
    private readonly defaultCacheTtl = 300; // 5 minutos

    /**
     * Busca configuração de colunas do banco de dados com cache
     * @param params Parâmetros da requisição de configuração
     * @returns Array de ColumnConfig com dados do banco
     */
    async getColumnConfiguration(params: ConfigurationRequest): Promise<ColumnConfig[]> {
        const context = ConfigurationErrorHandler.createContext('getColumnConfiguration', params);
        const timerId = configurationLogger.startPerformanceTimer('getColumnConfiguration');

        // Sanitizar parâmetros fora do try para estar disponível no catch
        let sanitizedParams = params;

        try {
            configurationLogger.info(LogCategory.CONFIGURATION, 'Iniciando busca de configuração de colunas', { params });

            // Validar parâmetros de entrada
            const validationErrors = ConfigurationValidator.validateConfigurationRequest(params);
            if (validationErrors.length > 0) {
                throw ConfigurationErrorHandler.handleValidationError(validationErrors, context);
            }

            // Sanitizar parâmetros
            sanitizedParams = ConfigurationValidator.sanitizeConfigurationRequest(params);

            // Gerar chave do cache usando o novo gerador
            const cacheKey = CacheKeyGenerator.generateKey(sanitizedParams);

            // Tentar buscar do cache primeiro
            try {
                const cachedConfig = cacheManager.get<ColumnConfig[]>(cacheKey);
                if (cachedConfig) {
                    configurationLogger.logCacheOperation('hit', cacheKey, { recordCount: cachedConfig.length });
                    configurationLogger.endPerformanceTimer(timerId, true, { fromCache: true, recordCount: cachedConfig.length });
                    configurationLogger.logConfigurationLoad(params, true, cachedConfig.length, true);
                    return cachedConfig;
                } else {
                    configurationLogger.logCacheOperation('miss', cacheKey);
                }
            } catch (cacheError) {
                // Log do erro de cache mas continue com a operação
                const cacheErrorHandled = ConfigurationErrorHandler.handleCacheError(cacheError, {
                    ...context,
                    operation: 'cache-get'
                });
                configurationLogger.error(LogCategory.CACHE, 'Erro ao acessar cache, continuando com banco', { cacheKey }, cacheError as Error);
            }

            // Buscar do banco de dados com retry
            configurationLogger.info(LogCategory.DATABASE, 'Buscando configuração do banco de dados', { params: sanitizedParams });
            const dbStartTime = performance.now();

            const config = await ConfigurationErrorHandler.withRetry(
                () => this.fetchConfigurationFromDatabase(sanitizedParams),
                3, // máximo 3 tentativas
                1000 // delay inicial de 1 segundo
            );

            const dbDuration = performance.now() - dbStartTime;
            configurationLogger.logDatabaseOperation('SELECT', 'calibracao_colunas+calibracao_valores', true, dbDuration, config.length);

            // Validar configuração
            const validation = ConfigurationMapper.validateConfiguration(config);
            if (!validation.isValid) {
                configurationLogger.logValidationIssue('Configuração inválida', { errors: validation.errors }, 'error');
                throw ConfigurationErrorHandler.handleValidationError(validation.errors, context);
            }

            if (validation.warnings.length > 0) {
                validation.warnings.forEach(warning => {
                    configurationLogger.logValidationIssue(warning, { params: sanitizedParams }, 'warning');
                });
            }

            // Armazenar no cache (com tratamento de erro)
            try {
                cacheManager.set(cacheKey, validation.sanitizedConfig, this.defaultCacheTtl);
            } catch (cacheError) {
                const cacheErrorHandled = ConfigurationErrorHandler.handleCacheError(cacheError, {
                    ...context,
                    operation: 'cache-set'
                });
                console.warn('⚠️ Erro ao salvar no cache:', cacheErrorHandled.message);
                // Continuar mesmo com erro de cache
            }

            console.log(`✅ Configuração carregada com ${validation.sanitizedConfig.length} colunas`);
            return validation.sanitizedConfig;

        } catch (error) {
            // Registrar erro para monitoramento
            HealthMonitor.recordError('getColumnConfiguration', error);

            // Se é um erro já tratado, re-lançar
            if (error instanceof ConfigurationError) {
                throw error;
            }

            // Tratar erro de banco de dados
            const dbError = ConfigurationErrorHandler.handleDatabaseError(error, context);

            // Determinar motivo do fallback
            let fallbackReason = FallbackReason.DATABASE_ERROR;
            if (error.message?.includes('timeout')) {
                fallbackReason = FallbackReason.TIMEOUT;
            } else if (error.message?.includes('empty')) {
                fallbackReason = FallbackReason.EMPTY_RESULT;
            }

            // Criar contexto de fallback
            const fallbackContext = FallbackManager.createFallbackContext(
                fallbackReason,
                error,
                sanitizedParams,
                ['database', 'cache']
            );

            // Usar configuração de fallback
            return FallbackManager.getFallbackConfiguration(fallbackContext);
        }
    }

    /**
     * Busca configuração no formato legado (para compatibilidade com linha 721)
     * @param params Parâmetros da requisição de configuração
     * @returns Array de LegacyColumnConfig (nome/percentual)
     */
    async getLegacyColumnConfiguration(params: ConfigurationRequest): Promise<LegacyColumnConfig[]> {
        const context = ConfigurationErrorHandler.createContext('getLegacyColumnConfiguration', params);

        try {
            console.log('🔍 Buscando configuração legada:', params);

            // Validar parâmetros
            const validationErrors = ConfigurationValidator.validateConfigurationRequest(params);
            if (validationErrors.length > 0) {
                throw ConfigurationErrorHandler.handleValidationError(validationErrors, context);
            }

            // Sanitizar parâmetros
            const sanitizedParams = ConfigurationValidator.sanitizeConfigurationRequest(params);

            // Gerar chave do cache específica para formato legado
            const cacheKey = CacheKeyGenerator.generateLegacyKey(sanitizedParams);

            // Tentar buscar do cache primeiro
            try {
                const cachedConfig = cacheManager.get<LegacyColumnConfig[]>(cacheKey);
                if (cachedConfig) {
                    console.log('✅ Configuração legada encontrada no cache');
                    return cachedConfig;
                }
            } catch (cacheError) {
                const cacheErrorHandled = ConfigurationErrorHandler.handleCacheError(cacheError, {
                    ...context,
                    operation: 'cache-get-legacy'
                });
                console.warn('⚠️ Erro no cache legado:', cacheErrorHandled.message);
            }

            // Buscar configuração padrão e converter para formato legado
            const standardConfig = await this.getColumnConfiguration(sanitizedParams);

            // Converter da configuração padrão para legada
            const convertedConfig: LegacyColumnConfig[] = standardConfig.map(config => ({
                nome: config.nome_coluna,
                percentual: config.porcentagem
            }));

            // Armazenar no cache
            try {
                cacheManager.set(cacheKey, convertedConfig, this.defaultCacheTtl);
            } catch (cacheError) {
                const cacheErrorHandled = ConfigurationErrorHandler.handleCacheError(cacheError, {
                    ...context,
                    operation: 'cache-set-legacy'
                });
                console.warn('⚠️ Erro ao salvar configuração legada no cache:', cacheErrorHandled.message);
            }

            console.log(`✅ Configuração legada carregada com ${convertedConfig.length} colunas`);
            return convertedConfig;

        } catch (error) {
            // Registrar erro para monitoramento
            HealthMonitor.recordError('getLegacyColumnConfiguration', error);

            // Determinar motivo do fallback
            let fallbackReason = FallbackReason.UNKNOWN;
            if (error instanceof ConfigurationError) {
                if (error.message.includes('validação')) {
                    fallbackReason = FallbackReason.VALIDATION_ERROR;
                } else if (error.message.includes('banco de dados')) {
                    fallbackReason = FallbackReason.DATABASE_ERROR;
                }
            } else {
                fallbackReason = FallbackReason.DATABASE_ERROR;
            }

            // Criar contexto de fallback
            const fallbackContext = FallbackManager.createFallbackContext(
                fallbackReason,
                error,
                params, // Usar params original em vez de sanitizedParams que não existe neste escopo
                ['database', 'cache', 'standard-config']
            );

            // Usar configuração legada de fallback
            return FallbackManager.getLegacyFallbackConfiguration(fallbackContext);
        }
    }

    /**
     * Busca configuração diretamente do banco de dados
     * @param params Parâmetros da requisição
     * @returns Array de ColumnConfig processado
     */
    private async fetchConfigurationFromDatabase(params: ConfigurationRequest): Promise<ColumnConfig[]> {
        const context = ConfigurationErrorHandler.createContext('fetchConfigurationFromDatabase', params);

        try {
            // Definir tipo padrão como 'percentual' se não especificado
            const requestParams = {
                ...params,
                tipo: params.tipo || 'percentual'
            };

            // Buscar colunas da tabela calibracao_colunas
            const columns = await configurationRepository.fetchColumns(requestParams);

            if (columns.length === 0) {
                console.warn('⚠️ Nenhuma coluna encontrada para os parâmetros:', requestParams);
                return [];
            }

            // Extrair IDs das colunas para buscar valores
            const columnIds = columns.map(col => col.id);

            // Buscar valores da tabela calibracao_valores
            const values = await configurationRepository.fetchValues(columnIds, params.segmento);

            if (values.length === 0) {
                console.warn('⚠️ Nenhum valor encontrado para as colunas:', columnIds);
                return [];
            }

            // Mapear dados do banco para formato de configuração
            const configuration = ConfigurationMapper.mapToColumnConfig(columns, values);

            console.log(`📊 Configuração mapeada: ${configuration.length} colunas processadas`);
            return configuration;

        } catch (error) {
            // Registrar erro para monitoramento
            HealthMonitor.recordError('fetchConfigurationFromDatabase', error);

            console.error('❌ Erro ao buscar dados do banco:', error);
            throw ConfigurationErrorHandler.handleDatabaseError(error, context);
        }
    }

    /**
     * Limpa o cache de configuração
     * @param params Parâmetros específicos para limpar (opcional)
     */
    clearCache(params?: ConfigurationRequest): void {
        try {
            if (params) {
                const cacheKey = CacheKeyGenerator.generateKey(params);
                const legacyCacheKey = CacheKeyGenerator.generateLegacyKey(params);

                cacheManager.clear(cacheKey);
                cacheManager.clear(legacyCacheKey);

                console.log('🧹 Cache limpo para parâmetros específicos:', params);
            } else {
                cacheManager.clear();
                console.log('🧹 Todo o cache de configuração foi limpo');
            }
        } catch (error) {
            console.error('❌ Erro ao limpar cache:', error);
        }
    }

    /**
     * Força atualização da configuração (limpa cache e recarrega)
     * @param params Parâmetros da configuração a ser atualizada
     */
    async refreshConfiguration(params: ConfigurationRequest): Promise<void> {
        try {
            console.log('🔄 Atualizando configuração:', params);

            // Limpar cache específico
            this.clearCache(params);

            // Recarregar configuração do banco
            await this.getColumnConfiguration(params);

            console.log('✅ Configuração atualizada com sucesso');
        } catch (error) {
            console.error('❌ Erro ao atualizar configuração:', error);
            throw error;
        }
    }

    /**
     * Obtém estatísticas do serviço de configuração
     */
    getServiceStats() {
        try {
            const cacheStats = cacheManager.getStats();
            const healthStats = HealthMonitor.getHealthStats();
            const fallbackStats = FallbackManager.getFallbackStats();

            return {
                cache: cacheStats,
                health: healthStats,
                fallback: fallbackStats,
                timestamp: new Date().toISOString(),
                service: 'DynamicConfigurationService'
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            return {
                error: error instanceof Error ? error.message : 'Erro desconhecido',
                timestamp: new Date().toISOString(),
                service: 'DynamicConfigurationService'
            };
        }
    }

    /**
     * Força o uso de configuração de fallback para testes
     * @param params Parâmetros da configuração
     * @param reason Motivo do fallback
     * @returns Configuração de fallback
     */
    async getForcedFallbackConfiguration(
        params: ConfigurationRequest,
        reason: FallbackReason = FallbackReason.UNKNOWN
    ): Promise<ColumnConfig[]> {
        console.info('🔧 Forçando uso de configuração de fallback para testes:', { params, reason });

        const fallbackContext = FallbackManager.createFallbackContext(
            reason,
            new Error('Fallback forçado para testes'),
            params,
            ['forced-test']
        );

        return FallbackManager.getFallbackConfiguration(fallbackContext);
    }

    /**
     * Força o uso de configuração legada de fallback para testes
     * @param params Parâmetros da configuração
     * @param reason Motivo do fallback
     * @returns Configuração legada de fallback
     */
    async getForcedLegacyFallbackConfiguration(
        params: ConfigurationRequest,
        reason: FallbackReason = FallbackReason.UNKNOWN
    ): Promise<LegacyColumnConfig[]> {
        console.info('🔧 Forçando uso de configuração legada de fallback para testes:', { params, reason });

        const fallbackContext = FallbackManager.createFallbackContext(
            reason,
            new Error('Fallback legado forçado para testes'),
            params,
            ['forced-test-legacy']
        );

        return FallbackManager.getLegacyFallbackConfiguration(fallbackContext);
    }

    /**
     * Valida se o sistema de fallback está funcionando corretamente
     * @returns Resultado da validação
     */
    async validateFallbackSystem(): Promise<{
        isValid: boolean;
        errors: string[];
        availableConfigurations: string[];
    }> {
        const errors: string[] = [];

        try {
            // Testar configurações padrão
            const standardFallback = await this.getForcedFallbackConfiguration({}, FallbackReason.DATABASE_ERROR);
            if (!standardFallback || standardFallback.length === 0) {
                errors.push('Configuração padrão de fallback está vazia');
            }

            // Testar configuração legada
            const legacyFallback = await this.getForcedLegacyFallbackConfiguration({}, FallbackReason.DATABASE_ERROR);
            if (!legacyFallback || legacyFallback.length === 0) {
                errors.push('Configuração legada de fallback está vazia');
            }

            // Testar configurações específicas
            const contextualFallback = await this.getForcedFallbackConfiguration(
                { aba: 'base-manutencao' },
                FallbackReason.EMPTY_RESULT
            );
            if (!contextualFallback || contextualFallback.length === 0) {
                errors.push('Configuração contextual de fallback está vazia');
            }

            console.info('✅ Validação do sistema de fallback concluída', {
                errorsFound: errors.length,
                standardConfigCount: standardFallback?.length || 0,
                legacyConfigCount: legacyFallback?.length || 0,
                contextualConfigCount: contextualFallback?.length || 0
            });

        } catch (error) {
            errors.push(`Erro durante validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            availableConfigurations: FallbackManager.getAvailableFallbackConfigurations()
        };
    }

    /**
     * Limpa estatísticas de fallback
     */
    clearFallbackStats(): void {
        FallbackManager.clearFallbackStats();
        console.info('🧹 Estatísticas de fallback foram limpas');
    }

    /**
     * Pré-aquece o cache com configurações comuns
     * @param ttlSeconds TTL opcional para as entradas pré-aquecidas
     */
    async warmupCache(ttlSeconds?: number): Promise<{
        success: number;
        failed: number;
        totalTime: number;
    }> {
        const startTime = Date.now();
        let success = 0;
        let failed = 0;

        console.info('🔥 Iniciando pré-aquecimento do cache...');

        // Configurações comuns para pré-aquecer
        const commonConfigurations = [
            { tipo: 'percentual' },
            { tipo: 'percentual', aba: 'base-manutencao' },
            { tipo: 'percentual', aba: 'licenca-uso' },
            { tipo: 'percentual', segmento: 'industrial' },
            { tipo: 'percentual', segmento: 'comercial' },
            { tipo: 'percentual', aba: 'base-manutencao', segmento: 'industrial' },
            { tipo: 'percentual', aba: 'licenca-uso', segmento: 'comercial' }
        ];

        // Pré-aquecer configurações padrão
        for (const params of commonConfigurations) {
            try {
                await this.getColumnConfiguration(params);
                success++;
            } catch (error) {
                console.warn(`⚠️ Falha ao pré-aquecer configuração:`, params, error);
                failed++;
            }
        }

        // Pré-aquecer configurações legadas
        for (const params of commonConfigurations) {
            try {
                await this.getLegacyColumnConfiguration(params);
                success++;
            } catch (error) {
                console.warn(`⚠️ Falha ao pré-aquecer configuração legada:`, params, error);
                failed++;
            }
        }

        const totalTime = Date.now() - startTime;

        console.info(`✅ Pré-aquecimento concluído: ${success} sucessos, ${failed} falhas em ${totalTime}ms`);

        return { success, failed, totalTime };
    }

    /**
     * Invalida cache baseado em padrão
     * @param params Parâmetros parciais para criar padrão de invalidação
     * @returns Número de entradas invalidadas
     */
    invalidateCachePattern(params: Partial<ConfigurationRequest>): number {
        const pattern = CacheKeyGenerator.generateInvalidationPattern(params);
        const invalidated = cacheManager.invalidatePattern(pattern);

        console.info(`🗑️ Cache invalidado por padrão: ${invalidated} entradas removidas`, params);

        return invalidated;
    }

    /**
     * Obtém informações detalhadas sobre cache de uma configuração específica
     * @param params Parâmetros da configuração
     * @returns Informações do cache
     */
    getCacheInfo(params: ConfigurationRequest): {
        standard: any;
        legacy: any;
    } {
        const standardKey = CacheKeyGenerator.generateKey(params);
        const legacyKey = CacheKeyGenerator.generateLegacyKey(params);

        return {
            standard: cacheManager.inspect(standardKey),
            legacy: cacheManager.inspect(legacyKey)
        };
    }

    /**
     * Força refresh de uma configuração específica
     * @param params Parâmetros da configuração
     * @returns Configuração atualizada
     */
    async forceRefresh(params: ConfigurationRequest): Promise<{
        standard: ColumnConfig[];
        legacy: LegacyColumnConfig[];
    }> {
        console.info('🔄 Forçando refresh de configuração:', params);

        // Invalidar cache existente
        this.invalidateCachePattern(params);

        // Recarregar configurações
        const [standard, legacy] = await Promise.all([
            this.getColumnConfiguration(params),
            this.getLegacyColumnConfiguration(params)
        ]);

        console.info('✅ Refresh concluído para configuração:', params);

        return { standard, legacy };
    }

    /**
     * Obtém estatísticas avançadas do cache
     * @returns Estatísticas detalhadas do cache
     */
    getAdvancedCacheStats(): {
        cache: any;
        keyAnalysis: any;
        performance: {
            hitRate: number;
            averageResponseTime: number;
            cacheEfficiency: number;
        };
    } {
        const cacheStats = cacheManager.getStats();

        // Analisar chaves existentes
        const keys = Array.from((cacheManager as any).cache.keys()) as string[];
        const keyAnalysis = CacheKeyGenerator.analyzeKeys(keys);

        // Calcular métricas de performance
        const hitRate = cacheStats.hitRate || 0;
        const averageResponseTime = cacheStats.averageAgeMs || 0;
        const cacheEfficiency = cacheStats.validEntries / Math.max(1, cacheStats.totalEntries) * 100;

        return {
            cache: cacheStats,
            keyAnalysis,
            performance: {
                hitRate,
                averageResponseTime,
                cacheEfficiency: Number(cacheEfficiency.toFixed(2))
            }
        };
    }

    /**
     * Executa manutenção do cache
     * @returns Resultado da manutenção
     */
    performCacheMaintenance(): {
        cleanedEntries: number;
        beforeStats: any;
        afterStats: any;
    } {
        console.info('🔧 Iniciando manutenção do cache...');

        const beforeStats = cacheManager.getStats();

        // Limpar entradas expiradas
        cacheManager.cleanup();

        const afterStats = cacheManager.getStats();
        const cleanedEntries = beforeStats.totalEntries - afterStats.totalEntries;

        console.info(`✅ Manutenção concluída: ${cleanedEntries} entradas limpas`);

        return {
            cleanedEntries,
            beforeStats,
            afterStats
        };
    }

    /**
     * Configura TTL padrão do cache
     * @param ttlSeconds Novo TTL em segundos
     */
    setCacheDefaultTTL(ttlSeconds: number): void {
        (cacheManager as any).defaultTtlSeconds = ttlSeconds;
        console.info(`⚙️ TTL padrão do cache alterado para: ${ttlSeconds}s`);
    }

    /**
     * Obtém configurações múltiplas de uma vez (batch)
     * @param paramsList Array de parâmetros de configuração
     * @returns Mapa com resultados
     */
    async getBatchConfigurations(paramsList: ConfigurationRequest[]): Promise<Map<string, ColumnConfig[]>> {
        const results = new Map<string, ColumnConfig[]>();

        console.info(`📦 Processando batch de ${paramsList.length} configurações...`);

        // Processar em paralelo
        const promises = paramsList.map(async (params) => {
            try {
                const config = await this.getColumnConfiguration(params);
                const key = CacheKeyGenerator.generateKey(params);
                return { key, config };
            } catch (error) {
                console.warn('⚠️ Erro no batch para params:', params, error);
                return null;
            }
        });

        const settled = await Promise.allSettled(promises);

        settled.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
                results.set(result.value.key, result.value.config);
            }
        });

        console.info(`✅ Batch concluído: ${results.size}/${paramsList.length} sucessos`);

        return results;
    }

    /**
     * Testa conectividade com o banco de dados
     */
    async testDatabaseConnection(): Promise<boolean> {
        const context = ConfigurationErrorHandler.createContext('testDatabaseConnection');

        try {
            console.log('🔍 Testando conexão com banco de dados...');

            const isConnected = await ConfigurationErrorHandler.withRetry(
                () => configurationRepository.testConnection(),
                2, // máximo 2 tentativas para teste
                500 // delay menor para teste
            );

            if (isConnected) {
                console.log('✅ Conexão com banco de dados OK');
            } else {
                console.error('❌ Falha na conexão com banco de dados');
                HealthMonitor.recordError('testDatabaseConnection', new Error('Connection test failed'));
            }

            return isConnected;
        } catch (error) {
            HealthMonitor.recordError('testDatabaseConnection', error);
            const handledError = ConfigurationErrorHandler.handleDatabaseError(error, context);
            console.error('❌ Erro ao testar conexão:', handledError.message);
            return false;
        }
    }
}

// Exportar instância singleton
export const configurationService = new DynamicConfigurationService();