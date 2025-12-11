/**
 * Serviço para processamento de templates de elogios
 * Substitui o layout hardcoded por sistema dinâmico de templates
 */

import { supabase } from '@/integrations/supabase/client';
import type { ElogioCompleto } from '@/types/elogios';

export interface ElogiosTemplateVariables {
  // Variáveis de sistema
  'sistema.mesNomeAtual': string;
  'sistema.anoAtual': string;
  'sistema.dataAtual': string;
  
  // Variáveis de cabeçalho
  'TITULO_PRINCIPAL': string;
  'SUBTITULO': string;
  'MES_REFERENCIA': string;
  'HEADER_IMAGE_URL': string;
  'FOOTER_IMAGE_URL': string;
  
  // Variáveis de conteúdo (serão processadas em loop)
  'ELOGIOS_LOOP': string;
  'ELOGIOS_LINHA': string;
  'PRESTADOR_NOME': string;
  'RESPOSTA_SATISFACAO': string;
  'COMENTARIO_CLIENTE': string;
  'CLIENTE_NOME': string;
  'EMPRESA_NOME': string;
}

export interface ProcessedElogiosTemplate {
  html: string;
  variables: Partial<ElogiosTemplateVariables>;
  elogiosProcessados: number;
  linhasGeradas: number;
}

/**
 * Serviço principal para processamento de templates de elogios
 */
export class ElogiosTemplateService {
  private static readonly TEMPLATE_NAME = 'Template Elogios';
  private static readonly TEMPLATE_TYPE = 'elogios';
  
  /**
   * Busca o template de elogios na base de dados
   */
  async buscarTemplateElogios(): Promise<string | null> {
    try {
      // Primeiro, tentar buscar template específico por nome e tipo
      let { data, error } = await supabase
        .from('email_templates')
        .select('corpo')
        .eq('nome', ElogiosTemplateService.TEMPLATE_NAME)
        .eq('tipo', ElogiosTemplateService.TEMPLATE_TYPE)
        .eq('ativo', true)
        .single();

      // Se não encontrar template específico, buscar qualquer template ativo do tipo 'elogios'
      if (error || !data) {
        console.log('Template específico não encontrado, buscando qualquer template de elogios...');
        const { data: templatesElogios, error: errorElogios } = await supabase
          .from('email_templates')
          .select('corpo')
          .eq('tipo', ElogiosTemplateService.TEMPLATE_TYPE)
          .eq('ativo', true)
          .limit(1);

        if (errorElogios || !templatesElogios || templatesElogios.length === 0) {
          console.error('Erro ao buscar template de elogios:', errorElogios || 'Nenhum template encontrado');
          return null;
        }

        return templatesElogios[0]?.corpo || null;
      }

      return data?.corpo || null;
    } catch (error) {
      console.error('Erro inesperado ao buscar template:', error);
      return null;
    }
  }

  /**
   * Cria o template padrão de elogios se não existir
   */
  async criarTemplatePadrao(): Promise<boolean> {
    try {
      // Verificar se já existe e se tem CSS adequado
      const templateExistente = await this.buscarTemplateElogios();
      if (templateExistente) {
        // Verificar se tem CSS adequado
        const temCSS = templateExistente.includes('<style>');
        const temFontWeight = templateExistente.includes('font-weight: bold');
        
        if (temCSS && temFontWeight) {
          console.log('✅ Template padrão já existe com CSS adequado');
          return true; // Já existe e está correto
        } else {
          console.log('⚠️ Template padrão existe mas sem CSS adequado, atualizando...');
          // Continuar para atualizar o template
        }
      }

      const templateHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6; }
        .email-container { max-width: 1200px; margin: 0 auto; background-color: #ffffff; width: 100%; }
        .header-image { width: 100%; display: block; }
        .title-section { text-align: center; padding: 24px 48px; }
        .title-main { font-size: 16px; font-weight: bold; margin: 0 0 8px 0; color: #000000; line-height: 1.3; }
        .title-sub { font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: #000000; }
        .title-month { font-size: 18px; font-weight: bold; margin: 0; color: #000000; letter-spacing: 1px; }
        .main-content { max-width: 1200px; margin: 0 auto; padding: 40px 48px; }
        .elogios-row { display: table; width: 100%; margin-bottom: 40px; }
        .elogio-cell { display: table-cell; width: 25%; padding: 10px; vertical-align: top; }
        .elogio-card { padding: 16px; border-radius: 8px; height: 100%; }
        .elogio-name { color: #0066FF; font-weight: bold; font-size: 14px; margin-bottom: 16px; text-transform: uppercase; }
        .elogio-response { font-weight: bold; margin-bottom: 8px; }
        .elogio-comment { margin-bottom: 16px; font-size: 12px; line-height: 1.5; }
        .elogio-info { font-size: 12px; color: #000000; font-weight: bold; }
        .divider-row { display: table; width: 100%; margin: 48px auto; }
        .divider-line { height: 2px; background-color: #000000; }
        .quote-cell { width: 60px; text-align: center; vertical-align: middle; }
        .quote-text { font-size: 40px; line-height: 1; font-weight: bold; }
        .quote-blue { color: #0066FF; }
        .quote-pink { color: #FF0066; }
        .footer-image { width: 100%; height: auto; display: block; }
        @media only screen and (max-width: 600px) {
            .title-section { padding: 16px; }
            .main-content { padding: 20px 16px; }
            .elogio-cell { display: block; width: 100% !important; margin-bottom: 24px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <img src="http://books-sonda.vercel.app/images/header-elogios.png" alt="Header" class="header-image">
        <img src="http://books-sonda.vercel.app/images/header-elogios-2.png" alt="Header" class="header-image">
        
        <!-- Título -->
        <div class="title-section">
            <h1 class="title-main">{{TITULO_PRINCIPAL}}</h1>
            <h2 class="title-sub">{{SUBTITULO}}</h2>
            <h3 class="title-month">{{sistema.mesNomeAtual}}</h3>
        </div>
        
        <!-- Container de Elogios -->
        <div class="main-content">
            {{ELOGIOS_LOOP}}
        </div>
        
        <!-- Footer -->
        <img src="http://books-sonda.vercel.app/images/rodape-elogios.png" alt="Footer" class="footer-image">
    </div>
</body>
</html>`;

      // Tentar inserir ou atualizar template
      const { data: templateExistenteCompleto, error: errorBusca } = await supabase
        .from('email_templates')
        .select('id')
        .eq('nome', ElogiosTemplateService.TEMPLATE_NAME)
        .eq('tipo', ElogiosTemplateService.TEMPLATE_TYPE)
        .single();

      let error;
      
      if (errorBusca || !templateExistenteCompleto) {
        // Inserir novo template
        console.log('📧 Criando novo template padrão...');
        const result = await supabase
          .from('email_templates')
          .insert({
            nome: ElogiosTemplateService.TEMPLATE_NAME,
            tipo: ElogiosTemplateService.TEMPLATE_TYPE,
            assunto: '[ELOGIOS] - Colaboradores de Soluções de Negócios ({{sistema.mesNomeAtual}})',
            corpo: templateHtml,
            descricao: 'Template padrão para relatórios de elogios mensais',
            ativo: true,
            vinculado_formulario: false
          });
        error = result.error;
      } else {
        // Atualizar template existente
        console.log('📧 Atualizando template padrão existente...');
        const result = await supabase
          .from('email_templates')
          .update({
            corpo: templateHtml,
            assunto: '[ELOGIOS] - Colaboradores de Soluções de Negócios ({{sistema.mesNomeAtual}})',
            descricao: 'Template padrão para relatórios de elogios mensais',
            ativo: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', templateExistenteCompleto.id);
        error = result.error;
      }

      if (error) {
        console.error('Erro ao criar/atualizar template padrão:', error);
        return false;
      }

      console.log('✅ Template padrão de elogios criado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro inesperado ao criar template padrão:', error);
      return false;
    }
  }

  /**
   * Processa o template com os dados dos elogios
   */
  async processarTemplate(
    elogiosSelecionados: ElogioCompleto[],
    mesSelecionado: number,
    anoSelecionado: number,
    templateId?: string
  ): Promise<ProcessedElogiosTemplate> {
    // Buscar template específico ou usar padrão
    let templateHtml: string | null = null;
    
    if (templateId === 'template_elogios_padrao') {
      // Usar template padrão hardcoded diretamente
      console.log('📧 Usando template padrão hardcoded');
      return this.processarTemplateFallback(elogiosSelecionados, mesSelecionado, anoSelecionado);
    } else if (templateId) {
      // Buscar template específico por ID
      try {
        const { data, error } = await supabase
          .from('email_templates')
          .select('corpo')
          .eq('id', templateId)
          .eq('tipo', ElogiosTemplateService.TEMPLATE_TYPE)
          .eq('ativo', true)
          .single();

        if (!error && data) {
          templateHtml = data.corpo;
          console.log('✅ Template específico encontrado:', templateId);
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar template específico, usando padrão:', error);
      }
    }
    
    // Se não encontrou template específico, buscar template padrão no banco
    if (!templateHtml) {
      templateHtml = await this.buscarTemplateElogios();
    }
    
    // Se não encontrar, criar template padrão
    if (!templateHtml) {
      console.warn('Template de elogios não encontrado, criando template padrão...');
      const criado = await this.criarTemplatePadrao();
      if (criado) {
        templateHtml = await this.buscarTemplateElogios();
      }
    }

    // Se ainda não tiver template, usar fallback hardcoded
    if (!templateHtml) {
      console.error('Não foi possível obter template de elogios, usando fallback');
      return this.processarTemplateFallback(elogiosSelecionados, mesSelecionado, anoSelecionado);
    }

    // Preparar variáveis do sistema
    const nomesMeses = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    const variables: Partial<ElogiosTemplateVariables> = {
      'sistema.mesNomeAtual': nomesMeses[mesSelecionado - 1],
      'sistema.anoAtual': anoSelecionado.toString(),
      'sistema.dataAtual': new Date().toLocaleDateString('pt-BR'),
      'TITULO_PRINCIPAL': 'ELOGIOS AOS COLABORADORES',
      'SUBTITULO': 'DE SOLUÇÕES DE NEGÓCIOS',
      'MES_REFERENCIA': nomesMeses[mesSelecionado - 1],
      'HEADER_IMAGE_URL': 'http://books-sonda.vercel.app/images/header-elogios.png',
      'FOOTER_IMAGE_URL': 'http://books-sonda.vercel.app/images/rodape-elogios.png'
    };

    // Processar loop de elogios
    const elogiosHtml = this.gerarHtmlElogios(elogiosSelecionados);
    
    // Substituir variáveis no template
    let htmlProcessado = templateHtml;
    
    // Substituir variáveis simples
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      htmlProcessado = htmlProcessado.replace(regex, value || '');
    });

    // Substituir loop de elogios
    htmlProcessado = htmlProcessado.replace('{{ELOGIOS_LOOP}}', elogiosHtml);

    return {
      html: htmlProcessado,
      variables,
      elogiosProcessados: elogiosSelecionados.length,
      linhasGeradas: Math.ceil(elogiosSelecionados.length / 4)
    };
  }

  /**
   * Gera HTML dos elogios organizados em linhas de 4
   */
  private gerarHtmlElogios(elogios: ElogioCompleto[]): string {
    // Dividir elogios em grupos de 3 para criar linhas
    const elogiosPorLinha: typeof elogios[] = [];
    for (let i = 0; i < elogios.length; i += 3) {
      elogiosPorLinha.push(elogios.slice(i, i + 3));
    }

    let html = '';

    elogiosPorLinha.forEach((linha, linhaIndex) => {
      // Linha de elogios
      html += '<div class="elogios-row">';
      
      linha.forEach((elogio) => {
        const nomeColaborador = elogio.pesquisa?.prestador || 'Colaborador';
        const comentario = elogio.pesquisa?.comentario_pesquisa || '';
        const resposta = elogio.pesquisa?.resposta || '';
        const cliente = elogio.pesquisa?.cliente || 'N/A';
        const empresa = elogio.pesquisa?.empresa || 'N/A';
        
        html += `
        <div class="elogio-cell">
          <div class="elogio-card">
            <h4 class="elogio-name">${nomeColaborador}</h4>`;
        
        if (resposta) {
          html += `<p class="elogio-response">${resposta}</p>`;
        }
        if (comentario) {
          html += `<p class="elogio-comment">${comentario}</p>`;
        }
        
        html += `
            <div class="elogio-info">
              <p><strong>Cliente:</strong> ${cliente}</p>
              <p><strong>Empresa:</strong> ${empresa}</p>
            </div>
          </div>
        </div>`;
      });
      
      html += '</div>';
      
      // Adicionar divisor entre linhas (exceto após a última linha)
      if (linhaIndex < elogiosPorLinha.length - 1) {
        const isEven = linhaIndex % 2 === 0;
        const quoteColor = isEven ? 'quote-blue' : 'quote-pink';
        
        if (isEven) {
          // Aspas à direita (azul)
          html += `
          <div class="divider-row">
            <div style="display: table-cell;"><div class="divider-line"></div></div>
            <div class="quote-cell"><span class="quote-text ${quoteColor}">"</span></div>
          </div>`;
        } else {
          // Aspas à esquerda (rosa)
          html += `
          <div class="divider-row">
            <div class="quote-cell"><span class="quote-text ${quoteColor}">"</span></div>
            <div style="display: table-cell;"><div class="divider-line"></div></div>
          </div>`;
        }
      }
    });

    return html;
  }

  /**
   * Template fallback caso não consiga acessar o banco
   */
  private processarTemplateFallback(
    elogiosSelecionados: ElogioCompleto[],
    mesSelecionado: number,
    anoSelecionado: number
  ): ProcessedElogiosTemplate {
    const nomesMeses = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    const variables: Partial<ElogiosTemplateVariables> = {
      'sistema.mesNomeAtual': nomesMeses[mesSelecionado - 1],
      'TITULO_PRINCIPAL': 'ELOGIOS AOS COLABORADORES',
      'SUBTITULO': 'DE SOLUÇÕES DE NEGÓCIOS',
      'HEADER_IMAGE_URL': 'http://books-sonda.vercel.app/images/header-elogios.png',
      'FOOTER_IMAGE_URL': 'http://books-sonda.vercel.app/images/rodape-elogios.png'
    };

    // Template hardcoded como fallback com CSS completo
    const templateFallback = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6; }
        .email-container { max-width: 1200px; margin: 0 auto; background-color: #ffffff; width: 100%; }
        .header-image { width: 100%; display: block; }
        .title-section { text-align: center; padding: 24px 48px; }
        .title-main { font-size: 16px; font-weight: bold; margin: 0 0 8px 0; color: #000000; line-height: 1.3; }
        .title-sub { font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: #000000; }
        .title-month { font-size: 18px; font-weight: bold; margin: 0; color: #000000; letter-spacing: 1px; }
        .main-content { max-width: 1200px; margin: 0 auto; padding: 40px 48px; }
        .elogios-row { display: table; width: 100%; margin-bottom: 40px; }
        .elogio-cell { display: table-cell; width: 25%; padding: 10px; vertical-align: top; }
        .elogio-card { padding: 16px; border-radius: 8px; height: 100%; }
        .elogio-name { color: #0066FF; font-weight: bold; font-size: 14px; margin-bottom: 16px; text-transform: uppercase; }
        .elogio-response { font-weight: bold; margin-bottom: 8px; }
        .elogio-comment { margin-bottom: 16px; font-size: 12px; line-height: 1.5; }
        .elogio-info { font-size: 12px; color: #000000; font-weight: bold; }
        .divider-row { display: table; width: 100%; margin: 48px auto; }
        .divider-line { height: 2px; background-color: #000000; }
        .quote-cell { width: 60px; text-align: center; vertical-align: middle; }
        .quote-text { font-size: 40px; line-height: 1; font-weight: bold; }
        .quote-blue { color: #0066FF; }
        .quote-pink { color: #FF0066; }
        .footer-image { width: 100%; height: auto; display: block; }
        @media only screen and (max-width: 600px) {
            .title-section { padding: 16px; }
            .main-content { padding: 20px 16px; }
            .elogio-cell { display: block; width: 100% !important; margin-bottom: 24px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <img src="${variables['HEADER_IMAGE_URL']}" alt="Header" class="header-image">
        
        <!-- Título -->
        <div class="title-section">
            <h1 class="title-main">${variables['TITULO_PRINCIPAL']}</h1>
            <h2 class="title-sub">${variables['SUBTITULO']}</h2>
            <h3 class="title-month">${variables['sistema.mesNomeAtual']}</h3>
        </div>
        
        <!-- Container de Elogios -->
        <div class="main-content">
            ${this.gerarHtmlElogios(elogiosSelecionados)}
        </div>
        
        <!-- Footer -->
        <img src="${variables['FOOTER_IMAGE_URL']}" alt="Footer" class="footer-image">
    </div>
</body>
</html>`;

    return {
      html: templateFallback,
      variables,
      elogiosProcessados: elogiosSelecionados.length,
      linhasGeradas: Math.ceil(elogiosSelecionados.length / 3)
    };
  }

  /**
   * Obtém lista de variáveis disponíveis para templates
   */
  static getVariaveisDisponiveis(): Array<{
    variavel: string;
    descricao: string;
    exemplo: string;
    categoria: string;
  }> {
    return [
      // Variáveis de Sistema
      {
        variavel: '{{sistema.mesNomeAtual}}',
        descricao: 'Nome do mês atual em maiúsculas',
        exemplo: 'DEZEMBRO',
        categoria: 'Sistema'
      },
      {
        variavel: '{{sistema.anoAtual}}',
        descricao: 'Ano atual',
        exemplo: '2024',
        categoria: 'Sistema'
      },
      {
        variavel: '{{sistema.dataAtual}}',
        descricao: 'Data atual formatada',
        exemplo: '11/12/2024',
        categoria: 'Sistema'
      },
      
      // Variáveis de Cabeçalho
      {
        variavel: '{{TITULO_PRINCIPAL}}',
        descricao: 'Título principal do relatório',
        exemplo: 'ELOGIOS AOS COLABORADORES',
        categoria: 'Cabeçalho'
      },
      {
        variavel: '{{SUBTITULO}}',
        descricao: 'Subtítulo do relatório',
        exemplo: 'DE SOLUÇÕES DE NEGÓCIOS',
        categoria: 'Cabeçalho'
      },
      {
        variavel: '{{HEADER_IMAGE_URL}}',
        descricao: 'URL da imagem do cabeçalho',
        exemplo: 'http://books-sonda.vercel.app/images/header-elogios.png',
        categoria: 'Cabeçalho'
      },
      {
        variavel: '{{FOOTER_IMAGE_URL}}',
        descricao: 'URL da imagem do rodapé',
        exemplo: 'http://books-sonda.vercel.app/images/rodape-elogios.png',
        categoria: 'Cabeçalho'
      },
      
      // Variáveis de Conteúdo
      {
        variavel: '{{ELOGIOS_LOOP}}',
        descricao: 'Loop principal dos elogios (substituído automaticamente)',
        exemplo: '[HTML dos elogios gerado automaticamente]',
        categoria: 'Conteúdo'
      }
    ];
  }
}

// Instância singleton do serviço
export const elogiosTemplateService = new ElogiosTemplateService();