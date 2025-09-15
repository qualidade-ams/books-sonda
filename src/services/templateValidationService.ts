import type { EmailTemplate } from '@/types/approval';
import { 
  ClientBooksVariaveis,
  validarVariaveisClientBooks,
  obterVariaveisClientBooksDisponiveis
} from '@/utils/clientBooksVariableMapping';
import { 
  VariaveisCalculadas,
  validarVariaveisTemplate,
  obterVariaveisDisponiveis
} from '@/utils/emailVariableMapping';

export interface TemplateValidationConfig {
  // Variáveis obrigatórias por tipo de template
  variaveisObrigatorias: {
    book: string[];
    comply_fiscal: string[];
    comply_edocs: string[];
  };
  
  // Fallbacks para variáveis não preenchidas
  fallbacks: {
    [variavel: string]: string;
  };
  
  // Configurações de validação
  falharSeVariavelObrigatoriaNaoEncontrada: boolean;
  usarFallbacksAutomaticos: boolean;
  logValidacoes: boolean;
}

export interface ValidationResult {
  valido: boolean;
  variaveisNaoEncontradas: string[];
  variaveisObrigatoriasAusentes: string[];
  fallbacksAplicados: { [variavel: string]: string };
  avisos: string[];
  erros: string[];
}

/**
 * Serviço para validação avançada de templates de e-mail
 */
export class TemplateValidationService {
  private config: TemplateValidationConfig;

  constructor(config?: Partial<TemplateValidationConfig>) {
    this.config = {
      variaveisObrigatorias: {
        book: [
          'empresa.nomeCompleto',
          'colaborador.nomeCompleto',
          'colaborador.email',
          'disparo.mesNome',
          'disparo.ano'
        ],
        comply_fiscal: [
          'razaoSocial',
          'responsavel',
          'email'
        ],
        comply_edocs: [
          'razaoSocial',
          'responsavel',
          'email'
        ]
      },
      fallbacks: {
        // Fallbacks para sistema de books
        'empresa.nomeCompleto': '[Nome da Empresa]',
        'empresa.nomeAbreviado': '[Empresa]',
        'empresa.emailGestor': '[gestor@empresa.com]',
        'colaborador.nomeCompleto': '[Nome do Colaborador]',
        'colaborador.email': '[colaborador@empresa.com]',
        'colaborador.funcao': '[Função]',
        'disparo.mesNome': '[Mês]',
        'disparo.ano': '[Ano]',
        'disparo.dataDisparo': '[Data]',
        
        // Fallbacks para sistema de formulários
        'razaoSocial': '[Razão Social]',
        'responsavel': '[Responsável]',
        'email': '[email@empresa.com]',
        'cnpj': '[XX.XXX.XXX/XXXX-XX]',
        'localizacao': '[Localização]',
        'segmento': '[Segmento]'
      },
      falharSeVariavelObrigatoriaNaoEncontrada: false,
      usarFallbacksAutomaticos: true,
      logValidacoes: true,
      ...config
    };
  }

  /**
   * Valida template de books com variáveis de client books
   */
  validarTemplateBooks(
    template: EmailTemplate,
    variaveis?: ClientBooksVariaveis
  ): ValidationResult {
    const tipoTemplate = 'book';
    const variaveisObrigatorias = this.config.variaveisObrigatorias[tipoTemplate];
    
    // Se não temos variáveis, usar validação básica
    if (!variaveis) {
      return this.validarTemplateBasico(template, tipoTemplate);
    }

    // Validar assunto
    const validacaoAssunto = validarVariaveisClientBooks(template.assunto || '', variaveis);
    
    // Validar corpo
    const validacaoCorpo = validarVariaveisClientBooks(template.corpo || '', variaveis);

    // Combinar resultados
    const todasVariaveisNaoEncontradas = [
      ...validacaoAssunto.variaveisNaoEncontradas,
      ...validacaoCorpo.variaveisNaoEncontradas
    ];

    const variaveisNaoEncontradas = [...new Set(todasVariaveisNaoEncontradas)];

    // Verificar variáveis obrigatórias
    const variaveisObrigatoriasAusentes = variaveisObrigatorias.filter(
      variavel => variaveisNaoEncontradas.includes(variavel)
    );

    // Aplicar fallbacks
    const fallbacksAplicados = this.aplicarFallbacks(variaveisNaoEncontradas);

    // Gerar avisos e erros
    const { avisos, erros } = this.gerarAvisosEErros(
      template,
      variaveisNaoEncontradas,
      variaveisObrigatoriasAusentes,
      fallbacksAplicados
    );

    const valido = validacaoAssunto.valido && 
                   validacaoCorpo.valido && 
                   (variaveisObrigatoriasAusentes.length === 0 || !this.config.falharSeVariavelObrigatoriaNaoEncontrada);

    return {
      valido,
      variaveisNaoEncontradas,
      variaveisObrigatoriasAusentes,
      fallbacksAplicados,
      avisos,
      erros
    };
  }

  /**
   * Valida template de formulários com variáveis calculadas
   */
  validarTemplateFormularios(
    template: EmailTemplate,
    variaveis?: VariaveisCalculadas
  ): ValidationResult {
    const tipoTemplate = template.formulario as 'comply_fiscal' | 'comply_edocs' || 'comply_fiscal';
    const variaveisObrigatorias = this.config.variaveisObrigatorias[tipoTemplate];
    
    // Se não temos variáveis, usar validação básica
    if (!variaveis) {
      return this.validarTemplateBasico(template, tipoTemplate);
    }

    // Validar assunto
    const validacaoAssunto = validarVariaveisTemplate(template.assunto || '', variaveis);
    
    // Validar corpo
    const validacaoCorpo = validarVariaveisTemplate(template.corpo || '', variaveis);

    // Combinar resultados
    const todasVariaveisNaoEncontradas = [
      ...validacaoAssunto.variaveisNaoEncontradas,
      ...validacaoCorpo.variaveisNaoEncontradas
    ];

    const variaveisNaoEncontradas = [...new Set(todasVariaveisNaoEncontradas)];

    // Verificar variáveis obrigatórias
    const variaveisObrigatoriasAusentes = variaveisObrigatorias.filter(
      variavel => variaveisNaoEncontradas.includes(variavel)
    );

    // Aplicar fallbacks
    const fallbacksAplicados = this.aplicarFallbacks(variaveisNaoEncontradas);

    // Gerar avisos e erros
    const { avisos, erros } = this.gerarAvisosEErros(
      template,
      variaveisNaoEncontradas,
      variaveisObrigatoriasAusentes,
      fallbacksAplicados
    );

    const valido = validacaoAssunto.valido && 
                   validacaoCorpo.valido && 
                   (variaveisObrigatoriasAusentes.length === 0 || !this.config.falharSeVariavelObrigatoriaNaoEncontrada);

    return {
      valido,
      variaveisNaoEncontradas,
      variaveisObrigatoriasAusentes,
      fallbacksAplicados,
      avisos,
      erros
    };
  }

  /**
   * Aplica fallbacks para variáveis não encontradas
   */
  private aplicarFallbacks(variaveisNaoEncontradas: string[]): { [variavel: string]: string } {
    const fallbacksAplicados: { [variavel: string]: string } = {};

    if (!this.config.usarFallbacksAutomaticos) {
      return fallbacksAplicados;
    }

    variaveisNaoEncontradas.forEach(variavel => {
      if (this.config.fallbacks[variavel]) {
        fallbacksAplicados[variavel] = this.config.fallbacks[variavel];
      }
    });

    return fallbacksAplicados;
  }

  /**
   * Validação básica quando não há variáveis disponíveis
   */
  private validarTemplateBasico(
    template: EmailTemplate,
    tipoTemplate: string
  ): ValidationResult {
    const avisos: string[] = [];
    const erros: string[] = [];

    // Verificar se template tem conteúdo
    if (!template.assunto || template.assunto.trim() === '') {
      avisos.push('Template não possui assunto definido');
    }

    if (!template.corpo || template.corpo.trim() === '') {
      avisos.push('Template não possui corpo definido');
    }

    // Extrair variáveis do template
    const variaveisUsadas = this.extrairVariaveisDoTemplate(template);
    const variaveisObrigatorias = this.config.variaveisObrigatorias[tipoTemplate as keyof typeof this.config.variaveisObrigatorias] || [];

    // Verificar se usa variáveis obrigatórias
    const variaveisObrigatoriasPresentes = variaveisObrigatorias.filter(
      variavel => variaveisUsadas.includes(variavel)
    );

    if (variaveisObrigatoriasPresentes.length === 0 && variaveisObrigatorias.length > 0) {
      avisos.push(`Template não utiliza nenhuma variável obrigatória para ${tipoTemplate}`);
    }

    return {
      valido: true,
      variaveisNaoEncontradas: [],
      variaveisObrigatoriasAusentes: [],
      fallbacksAplicados: {},
      avisos,
      erros
    };
  }

  /**
   * Gera avisos e erros baseados na validação
   */
  private gerarAvisosEErros(
    template: EmailTemplate,
    variaveisNaoEncontradas: string[],
    variaveisObrigatoriasAusentes: string[],
    fallbacksAplicados: { [variavel: string]: string }
  ): { avisos: string[]; erros: string[] } {
    const avisos: string[] = [];
    const erros: string[] = [];

    // Avisos sobre variáveis não encontradas
    if (variaveisNaoEncontradas.length > 0) {
      avisos.push(`${variaveisNaoEncontradas.length} variável(is) não encontrada(s): ${variaveisNaoEncontradas.join(', ')}`);
    }

    // Erros sobre variáveis obrigatórias
    if (variaveisObrigatoriasAusentes.length > 0) {
      const mensagem = `Variáveis obrigatórias ausentes: ${variaveisObrigatoriasAusentes.join(', ')}`;
      
      if (this.config.falharSeVariavelObrigatoriaNaoEncontrada) {
        erros.push(mensagem);
      } else {
        avisos.push(mensagem);
      }
    }

    // Avisos sobre fallbacks aplicados
    const fallbacksCount = Object.keys(fallbacksAplicados).length;
    if (fallbacksCount > 0) {
      avisos.push(`${fallbacksCount} fallback(s) serão aplicados automaticamente`);
    }

    // Verificações gerais do template
    if (!template.assunto || template.assunto.trim() === '') {
      avisos.push('Template não possui assunto definido');
    }

    if (!template.corpo || template.corpo.trim() === '') {
      avisos.push('Template não possui corpo definido');
    }

    return { avisos, erros };
  }

  /**
   * Extrai variáveis de um template
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
   * Aplica fallbacks em um template
   */
  aplicarFallbacksNoTemplate(
    template: string,
    fallbacks: { [variavel: string]: string }
  ): string {
    let templateProcessado = template;

    Object.entries(fallbacks).forEach(([variavel, valorFallback]) => {
      const regex = new RegExp(`{{${variavel}}}`, 'g');
      templateProcessado = templateProcessado.replace(regex, valorFallback);
    });

    return templateProcessado;
  }

  /**
   * Atualiza configuração do serviço
   */
  atualizarConfig(novaConfig: Partial<TemplateValidationConfig>): void {
    this.config = { ...this.config, ...novaConfig };
  }

  /**
   * Obtém configuração atual
   */
  obterConfig(): TemplateValidationConfig {
    return { ...this.config };
  }
}

// Instância singleton do serviço
export const templateValidationService = new TemplateValidationService();