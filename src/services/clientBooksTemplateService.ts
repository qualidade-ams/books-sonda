import { supabase } from '@/integrations/supabase/client';
import type { EmailTemplate } from '@/types/approval';
import { 
  ClientBooksTemplateData,
  mapearVariaveisClientBooks,
  substituirVariaveisClientBooks,
  validarVariaveisClientBooks
} from '@/utils/clientBooksVariableMapping';
import { templateValidationService, type ValidationResult } from './templateValidationService';
import type { EmpresaClienteCompleta, ColaboradorCompleto } from '@/types/clientBooks';

export interface ProcessedEmailTemplate {
  assunto: string;
  corpo: string;
  templateOriginal: EmailTemplate;
  variaveisUsadas: string[];
  dadosUtilizados: ClientBooksTemplateData;
}

export interface TemplateValidationResult extends ValidationResult {
  // Herda todas as propriedades de ValidationResult
}

/**
 * Serviço para processamento de templates de e-mail do sistema de books
 */
export class ClientBooksTemplateService {
  
  /**
   * Processa um template de e-mail substituindo variáveis pelos dados reais
   */
  async processarTemplate(
    template: EmailTemplate,
    empresa: EmpresaClienteCompleta,
    colaborador: ColaboradorCompleto,
    dadosDisparo: { mes: number; ano: number; dataDisparo?: Date }
  ): Promise<ProcessedEmailTemplate> {
    try {
      // Preparar dados para o template
      const dadosTemplate: ClientBooksTemplateData = {
        empresa,
        colaborador,
        disparo: {
          mes: dadosDisparo.mes,
          ano: dadosDisparo.ano,
          dataDisparo: dadosDisparo.dataDisparo || new Date()
        }
      };

      // Mapear variáveis
      const variaveis = mapearVariaveisClientBooks(dadosTemplate);

      // Validar template e obter fallbacks se necessário
      const validacao = templateValidationService.validarTemplateBooks(template, variaveis);

      // Processar assunto e corpo
      let assuntoProcessado = substituirVariaveisClientBooks(template.assunto || '', variaveis);
      let corpoProcessado = substituirVariaveisClientBooks(template.corpo || '', variaveis);

      // Aplicar fallbacks se necessário
      if (Object.keys(validacao.fallbacksAplicados).length > 0) {
        console.warn('Aplicando fallbacks para variáveis não encontradas:', validacao.fallbacksAplicados);
        
        assuntoProcessado = templateValidationService.aplicarFallbacksNoTemplate(
          assuntoProcessado, 
          validacao.fallbacksAplicados
        );
        
        corpoProcessado = templateValidationService.aplicarFallbacksNoTemplate(
          corpoProcessado, 
          validacao.fallbacksAplicados
        );
      }

      // Identificar variáveis usadas
      const variaveisUsadas = this.extrairVariaveisDoTemplate(template);

      return {
        assunto: assuntoProcessado,
        corpo: corpoProcessado,
        templateOriginal: template,
        variaveisUsadas,
        dadosUtilizados: dadosTemplate
      };
    } catch (error) {
      console.error('Erro ao processar template:', error);
      throw new Error(`Falha ao processar template: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Valida um template verificando se todas as variáveis necessárias estão disponíveis
   */
  validarTemplate(
    template: EmailTemplate,
    empresa?: EmpresaClienteCompleta,
    colaborador?: ColaboradorCompleto
  ): TemplateValidationResult {
    try {
      // Se temos dados reais, usar validação completa
      if (empresa && colaborador) {
        const dadosTemplate: ClientBooksTemplateData = {
          empresa,
          colaborador,
          disparo: {
            mes: new Date().getMonth() + 1,
            ano: new Date().getFullYear(),
            dataDisparo: new Date()
          }
        };

        const variaveis = mapearVariaveisClientBooks(dadosTemplate);
        return templateValidationService.validarTemplateBooks(template, variaveis);
      }

      // Usar validação básica sem dados
      return templateValidationService.validarTemplateBooks(template);
    } catch (error) {
      console.error('Erro ao validar template:', error);
      return {
        valido: false,
        variaveisNaoEncontradas: [],
        variaveisObrigatoriasAusentes: [],
        fallbacksAplicados: {},
        avisos: [],
        erros: [`Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
      };
    }
  }

  /**
   * Busca template apropriado para books (formulário 'book')
   */
  async buscarTemplateBooks(
    templatePadrao: 'portugues' | 'ingles' = 'portugues'
  ): Promise<EmailTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('formulario', 'book')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar template de books:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.warn('Nenhum template de books encontrado');
        return null;
      }

      // Tentar encontrar template específico para o idioma
      const templateEspecifico = data.find(t => 
        t.nome?.toLowerCase().includes(templatePadrao) ||
        t.descricao?.toLowerCase().includes(templatePadrao)
      );

      if (templateEspecifico) {
        return templateEspecifico as EmailTemplate;
      }

      // Retornar o primeiro template disponível
      return data[0] as EmailTemplate;
    } catch (error) {
      console.error('Erro ao buscar template de books:', error);
      return null;
    }
  }

  /**
   * Extrai todas as variáveis usadas em um template
   */
  private extrairVariaveisDoTemplate(template: EmailTemplate): string[] {
    const regex = /{{([^}]+)}}/g;
    const variaveis = new Set<string>();

    // Extrair do assunto
    if (template.assunto) {
      let match;
      while ((match = regex.exec(template.assunto)) !== null) {
        variaveis.add(match[1]);
      }
    }

    // Extrair do corpo
    if (template.corpo) {
      regex.lastIndex = 0; // Reset regex
      let match;
      while ((match = regex.exec(template.corpo)) !== null) {
        variaveis.add(match[1]);
      }
    }

    return Array.from(variaveis);
  }



  /**
   * Gera dados de exemplo para validação
   */
  private gerarDadosExemplo(): ClientBooksTemplateData {
    const dataAtual = new Date();
    
    return {
      empresa: {
        id: 'exemplo-empresa-id',
        nome_completo: 'Empresa Exemplo Ltda',
        nome_abreviado: 'Empresa Exemplo',
        link_sharepoint: 'https://sharepoint.exemplo.com/pasta-cliente',
        template_padrao: 'portugues',
        status: 'ativo',
        data_status: dataAtual,
        email_gestor: 'gestor@exemplo.com',
        created_at: dataAtual,
        updated_at: dataAtual,
        produtos: [
          { produto: 'CE_PLUS' },
          { produto: 'FISCAL' }
        ]
      } as EmpresaClienteCompleta,
      colaborador: {
        id: 'exemplo-colaborador-id',
        nome_completo: 'João Silva',
        email: 'joao.silva@exemplo.com',
        funcao: 'Gerente Fiscal',
        empresa_id: 'exemplo-empresa-id',
        status: 'ativo',
        data_status: dataAtual,
        principal_contato: true,
        created_at: dataAtual,
        updated_at: dataAtual,
        empresa: {
          id: 'exemplo-empresa-id',
          nome_completo: 'Empresa Exemplo Ltda',
          nome_abreviado: 'Empresa Exemplo',
          template_padrao: 'portugues',
          status: 'ativo',
          data_status: dataAtual,
          created_at: dataAtual,
          updated_at: dataAtual
        }
      } as ColaboradorCompleto,
      disparo: {
        mes: dataAtual.getMonth() + 1,
        ano: dataAtual.getFullYear(),
        dataDisparo: dataAtual
      }
    };
  }
}

// Instância singleton do serviço
export const clientBooksTemplateService = new ClientBooksTemplateService();