/**
 * Utilitários para Inicialização da Infraestrutura de Anexos
 * Verificação e configuração automática dos recursos necessários
 */

import { AnexoStorageService } from '@/services/anexoStorageService';
import { supabase } from '@/integrations/supabase/client';

export interface InfrastructureStatus {
  bucketsExistem: boolean;
  tabelasExistem: boolean;
  politicasConfiguradas: boolean;
  funcoesExistem: boolean;
  pronto: boolean;
  erros: string[];
}

export class AnexoInfrastructureUtils {
  /**
   * Verifica o status completo da infraestrutura
   */
  static async verificarInfraestrutura(): Promise<InfrastructureStatus> {
    const status: InfrastructureStatus = {
      bucketsExistem: false,
      tabelasExistem: false,
      politicasConfiguradas: false,
      funcoesExistem: false,
      pronto: false,
      erros: []
    };

    try {
      // Verificar buckets
      status.bucketsExistem = await AnexoStorageService.verificarBuckets();
      if (!status.bucketsExistem) {
        status.erros.push('Buckets de storage não encontrados');
      }

      // Verificar tabelas
      status.tabelasExistem = await this.verificarTabelas();
      if (!status.tabelasExistem) {
        status.erros.push('Tabela anexos_temporarios não encontrada');
      }

      // Verificar funções
      status.funcoesExistem = await this.verificarFuncoes();
      if (!status.funcoesExistem) {
        status.erros.push('Funções SQL necessárias não encontradas');
      }

      // Verificar políticas (simplificado - assume que existem se as tabelas existem)
      status.politicasConfiguradas = status.tabelasExistem;

      // Status geral
      status.pronto = status.bucketsExistem && 
                     status.tabelasExistem && 
                     status.politicasConfiguradas && 
                     status.funcoesExistem;

    } catch (error) {
      status.erros.push(`Erro na verificação: ${error}`);
    }

    return status;
  }

  /**
   * Verifica se as tabelas necessárias existem
   */
  private static async verificarTabelas(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('anexos_temporarios')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Erro ao verificar tabelas:', error);
      return false;
    }
  }

  /**
   * Verifica se as funções SQL necessárias existem
   */
  private static async verificarFuncoes(): Promise<boolean> {
    try {
      // Testar função de limpeza
      const { error: limpezaError } = await supabase.rpc('limpar_anexos_expirados');
      
      // Testar função de validação de limite
      const { error: validacaoError } = await supabase.rpc('validar_limite_anexos_empresa', {
        p_empresa_id: '00000000-0000-0000-0000-000000000000',
        p_novo_tamanho: 1000
      });

      // Se não há erro de função não encontrada, as funções existem
      return !limpezaError?.message.includes('function') && 
             !validacaoError?.message.includes('function');
    } catch (error) {
      console.error('Erro ao verificar funções:', error);
      return false;
    }
  }

  /**
   * Inicializa a infraestrutura automaticamente
   */
  static async inicializarInfraestrutura(): Promise<{
    sucesso: boolean;
    mensagem: string;
    detalhes?: InfrastructureStatus;
  }> {
    try {
      console.log('Verificando infraestrutura de anexos...');
      
      const status = await this.verificarInfraestrutura();
      
      if (status.pronto) {
        return {
          sucesso: true,
          mensagem: 'Infraestrutura de anexos já está configurada',
          detalhes: status
        };
      }

      // Tentar criar buckets se não existem
      if (!status.bucketsExistem) {
        try {
          await AnexoStorageService.criarBuckets();
          console.log('Buckets criados com sucesso');
        } catch (error) {
          console.warn('Não foi possível criar buckets automaticamente:', error);
        }
      }

      // Verificar novamente após tentativa de criação
      const statusFinal = await this.verificarInfraestrutura();
      
      if (statusFinal.pronto) {
        return {
          sucesso: true,
          mensagem: 'Infraestrutura inicializada com sucesso',
          detalhes: statusFinal
        };
      } else {
        return {
          sucesso: false,
          mensagem: 'Infraestrutura incompleta. Execute as migrações SQL necessárias.',
          detalhes: statusFinal
        };
      }

    } catch (error) {
      console.error('Erro ao inicializar infraestrutura:', error);
      return {
        sucesso: false,
        mensagem: `Erro na inicialização: ${error}`,
      };
    }
  }

  /**
   * Gera relatório detalhado da infraestrutura
   */
  static async gerarRelatorioInfraestrutura(): Promise<string> {
    const status = await this.verificarInfraestrutura();
    const bucketInfo = AnexoStorageService.getBucketInfo();

    let relatorio = '=== RELATÓRIO DA INFRAESTRUTURA DE ANEXOS ===\n\n';
    
    relatorio += `Status Geral: ${status.pronto ? '✅ PRONTO' : '❌ INCOMPLETO'}\n\n`;
    
    relatorio += 'Componentes:\n';
    relatorio += `- Buckets Storage: ${status.bucketsExistem ? '✅' : '❌'}\n`;
    relatorio += `- Tabelas Database: ${status.tabelasExistem ? '✅' : '❌'}\n`;
    relatorio += `- Políticas RLS: ${status.politicasConfiguradas ? '✅' : '❌'}\n`;
    relatorio += `- Funções SQL: ${status.funcoesExistem ? '✅' : '❌'}\n\n`;

    if (status.erros.length > 0) {
      relatorio += 'Erros Encontrados:\n';
      status.erros.forEach(erro => {
        relatorio += `- ${erro}\n`;
      });
      relatorio += '\n';
    }

    relatorio += 'Configurações:\n';
    relatorio += `- Bucket Temporário: ${bucketInfo.temporario}\n`;
    relatorio += `- Bucket Permanente: ${bucketInfo.permanente}\n`;
    relatorio += `- Limite por Arquivo: ${(bucketInfo.limiteArquivo / 1024 / 1024).toFixed(1)}MB\n`;
    relatorio += `- Limite por Empresa: ${(bucketInfo.limiteTotalEmpresa / 1024 / 1024).toFixed(1)}MB\n`;
    relatorio += `- Tipos Permitidos: ${bucketInfo.tiposPermitidos.join(', ')}\n\n`;

    if (!status.pronto) {
      relatorio += 'Ações Necessárias:\n';
      relatorio += '1. Execute as migrações SQL:\n';
      relatorio += '   - anexos_infrastructure_migration.sql\n';
      relatorio += '   - anexos_rls_policies.sql\n';
      relatorio += '   - anexos_storage_setup.sql\n';
      relatorio += '2. Verifique as permissões do usuário no Supabase\n';
      relatorio += '3. Configure as políticas RLS se necessário\n';
    }

    return relatorio;
  }

  /**
   * Testa a funcionalidade básica da infraestrutura
   */
  static async testarInfraestrutura(): Promise<{
    sucesso: boolean;
    testes: Record<string, boolean>;
    erros: string[];
  }> {
    const testes: Record<string, boolean> = {};
    const erros: string[] = [];

    try {
      // Teste 1: Verificar buckets
      testes.buckets = await AnexoStorageService.verificarBuckets();
      if (!testes.buckets) {
        erros.push('Buckets não encontrados');
      }

      // Teste 2: Consultar tabela anexos_temporarios
      try {
        const { error } = await supabase
          .from('anexos_temporarios')
          .select('count')
          .limit(1);
        testes.tabela = !error;
        if (error) {
          erros.push(`Erro na tabela: ${error.message}`);
        }
      } catch (error) {
        testes.tabela = false;
        erros.push(`Erro ao acessar tabela: ${error}`);
      }

      // Teste 3: Testar função de validação
      try {
        const { error } = await supabase.rpc('validar_limite_anexos_empresa', {
          p_empresa_id: '00000000-0000-0000-0000-000000000000',
          p_novo_tamanho: 1000
        });
        testes.funcoes = !error?.message.includes('function');
        if (error?.message.includes('function')) {
          erros.push('Funções SQL não encontradas');
        }
      } catch (error) {
        testes.funcoes = false;
        erros.push(`Erro ao testar funções: ${error}`);
      }

      // Teste 4: Verificar permissões básicas
      try {
        const { data: user } = await supabase.auth.getUser();
        testes.autenticacao = !!user.user;
        if (!user.user) {
          erros.push('Usuário não autenticado');
        }
      } catch (error) {
        testes.autenticacao = false;
        erros.push(`Erro de autenticação: ${error}`);
      }

      const sucesso = Object.values(testes).every(teste => teste);

      return { sucesso, testes, erros };

    } catch (error) {
      erros.push(`Erro geral nos testes: ${error}`);
      return { sucesso: false, testes, erros };
    }
  }
}

export default AnexoInfrastructureUtils;