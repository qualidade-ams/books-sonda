import { supabase } from '@/integrations/supabase/client';
import type { EmailTemplate } from '@/types/approval';
import { 
  ClientBooksTemplateData,
  mapearVariaveisClientBooks,
  substituirVariaveisClientBooks,
  validarVariaveisClientBooks
} from '@/utils/clientBooksVariableMapping';
import { templateValidationService, type ValidationResult } from './templateValidationService';
import type { EmpresaClienteCompleta, ClienteCompleto } from '@/types/clientBooks';

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
    cliente: ClienteCompleto,
    dadosDisparo: { mes: number; ano: number; dataDisparo?: Date }
  ): Promise<ProcessedEmailTemplate> {
    try {
      // Preparar dados para o template
      const dadosTemplate: ClientBooksTemplateData = {
        empresa,
        cliente,
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
    cliente?: ClienteCompleto
  ): TemplateValidationResult {
    try {
      // Se temos dados reais, usar validação completa
      if (empresa && cliente) {
        const dadosTemplate: ClientBooksTemplateData = {
          empresa,
          cliente,
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
  async buscarTemplateBooks(templatePadrao: string): Promise<EmailTemplate | null> {
    try {
      console.log(`🔍 Buscando template de books para: "${templatePadrao}"`);
      console.log(`📝 Tipo do valor: ${typeof templatePadrao}`);
      console.log(`📏 Comprimento: ${templatePadrao.length}`);
      
      // Verificar se templatePadrao é um UUID (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templatePadrao);
      
      if (isUUID) {
        console.log(`🆔 Template padrão é um UUID, buscando diretamente por ID: ${templatePadrao}`);
        
        // Buscar template específico pelo ID
        const { data: templateEspecifico, error: templateError } = await supabase
          .from('email_templates')
          .select('*')
          .eq('id', templatePadrao)
          .eq('formulario', 'book')
          .eq('ativo', true)
          .single();

        if (!templateError && templateEspecifico) {
          console.log(`✅ Template encontrado por ID:`, {
            id: templateEspecifico.id,
            nome: templateEspecifico.nome,
            assunto: templateEspecifico.assunto?.substring(0, 100) + '...'
          });
          return templateEspecifico as EmailTemplate;
        } else {
          console.warn(`⚠️ Template com ID ${templatePadrao} não encontrado ou inativo`);
        }
      }
      
      // Buscar todos os templates de books ativos
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('formulario', 'book')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar template de books:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ Nenhum template de books encontrado');
        return null;
      }

      console.log(`📋 Templates encontrados (${data.length}):`, data.map(t => ({
        id: t.id,
        nome: t.nome,
        descricao: t.descricao,
        assunto: t.assunto?.substring(0, 50) + '...'
      })));

      // Se não é UUID, tentar encontrar por nome/descrição (fallback para compatibilidade)
      if (!isUUID) {
        const templateEspecifico = data.find(t => 
          t.nome?.toLowerCase().includes(templatePadrao.toLowerCase()) ||
          t.descricao?.toLowerCase().includes(templatePadrao.toLowerCase())
        );

        if (templateEspecifico) {
          console.log(`✅ Template específico encontrado para ${templatePadrao}:`, {
            id: templateEspecifico.id,
            nome: templateEspecifico.nome,
            assunto: templateEspecifico.assunto?.substring(0, 100) + '...'
          });
          return templateEspecifico as EmailTemplate;
        }
      }

      console.log(`⚠️ Template específico não encontrado para ${templatePadrao}, usando primeiro disponível:`, {
        id: data[0].id,
        nome: data[0].nome,
        assunto: data[0].assunto?.substring(0, 100) + '...'
      });

      // Retornar o primeiro template disponível
      return data[0] as EmailTemplate;
    } catch (error) {
      console.error('❌ Erro ao buscar template de books:', error);
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
   * Converte número do mês para nome em português
   */
  private obterNomeMes(numeroMes: number): string {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[numeroMes - 1] || 'Janeiro';
  }

  /**
   * Gera dados de exemplo para validação
   */
  private gerarDadosExemplo(): ClientBooksTemplateData {
    const dataAtual = new Date();
    
    return {
      empresa: {
        id: 'exemplo-empresa-id',
        nome_completo: 'EMPRESA EXEMPLO LTDA',
        nome_abreviado: 'EMPRESA EXEMPLO',
        link_sharepoint: 'https://sharepoint.exemplo.com/pasta-cliente',
        template_padrao: 'portugues',
        status: 'ativo',
        data_status: dataAtual.toISOString(),
        descricao_status: null,
        email_gestor: 'gestor@sonda.com',
        created_at: dataAtual.toISOString(),
        updated_at: dataAtual.toISOString(),
        produtos: [
          { 
            id: 'exemplo-produto-1',
            empresa_id: 'exemplo-empresa-id',
            produto: 'COMEX',
            created_at: dataAtual.toISOString()
          },
          { 
            id: 'exemplo-produto-2',
            empresa_id: 'exemplo-empresa-id',
            produto: 'FISCAL',
            created_at: dataAtual.toISOString()
          }
        ]
      } as EmpresaClienteCompleta,
      cliente: {
        id: 'exemplo-cliente-id',
        nome_completo: 'João Silva',
        email: 'joao.silva@exemplo.com',
        funcao: 'Gerente Fiscal',
        empresa_id: 'exemplo-empresa-id',
        status: 'ativo',
        data_status: dataAtual.toISOString(),
        descricao_status: null,
        principal_contato: true,
        created_at: dataAtual.toISOString(),
        updated_at: dataAtual.toISOString(),
        empresa: {
          id: 'exemplo-empresa-id',
          nome_completo: 'EMPRESA EXEMPLO LTDA',
          nome_abreviado: 'EMPRESA EXEMPLO',
          link_sharepoint: 'https://sharepoint.exemplo.com/pasta-cliente',
          template_padrao: 'portugues',
          status: 'ativo',
          data_status: dataAtual.toISOString(),
          descricao_status: null,
          email_gestor: 'gestor@exemplo.com',
          created_at: dataAtual.toISOString(),
          updated_at: dataAtual.toISOString()
        }
      } as ClienteCompleto,
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