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
  'elogio.loop': string;
  'ELOGIOS_LINHA': string;
  'PRESTADOR_NOME': string;
  'RESPOSTA_SATISFACAO': string;
  'COMENTARIO_CLIENTE': string;
  'CLIENTE_NOME': string;
  'EMPRESA_NOME': string;

  // Variáveis de card individual de elogio (usadas no template de blocos)
  'elogio.nome': string;
  'elogio.mensagem': string;
  'elogio.cliente': string;
  'elogio.empresa': string;

  // Variáveis de ranking de elogios
  'elogio.mesNomeAno': string;
  'elogio.primeiro': string;
  'elogio.qtd1': string;
  'elogio.segundo': string;
  'elogio.qtd2': string;
  'elogio.terceiro': string;
  'elogio.qtd3': string;
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
  
  // Cache para empresas (evita múltiplas consultas)
  private static empresasCache: Array<{ nome_completo: string; nome_abreviado: string }> | null = null;
  
  /**
   * Busca empresas cadastradas para fazer de-para com nome abreviado
   */
  private static async buscarEmpresas(): Promise<Array<{ nome_completo: string; nome_abreviado: string }>> {
    if (this.empresasCache) {
      return this.empresasCache;
    }
    
    try {
      const { data: empresas, error } = await supabase
        .from('empresas_clientes')
        .select('nome_completo, nome_abreviado')
        .eq('status', 'ativo');
      
      if (error) {
        console.error('Erro ao buscar empresas:', error);
        return [];
      }
      
      this.empresasCache = empresas || [];
      return this.empresasCache;
    } catch (error) {
      console.error('Erro inesperado ao buscar empresas:', error);
      return [];
    }
  }
  
  /**
   * Faz de-para do nome da empresa para nome abreviado
   */
  private async obterNomeAbreviadoEmpresa(nomeEmpresa: string): Promise<string> {
    if (!nomeEmpresa || nomeEmpresa === 'N/A') {
      return 'N/A';
    }
    
    const empresas = await ElogiosTemplateService.buscarEmpresas();
    
    // Buscar empresa correspondente pelo nome completo ou abreviado
    const empresaEncontrada = empresas.find(
      empresa => 
        empresa.nome_completo === nomeEmpresa || 
        empresa.nome_abreviado === nomeEmpresa ||
        empresa.nome_completo?.toLowerCase() === nomeEmpresa.toLowerCase() ||
        empresa.nome_abreviado?.toLowerCase() === nomeEmpresa.toLowerCase()
    );
    
    if (empresaEncontrada) {
      console.log(`📧 De-para empresa: "${nomeEmpresa}" → "${empresaEncontrada.nome_abreviado}"`);
      return empresaEncontrada.nome_abreviado;
    }
    
    console.warn(`⚠️ Empresa não encontrada no cadastro: "${nomeEmpresa}"`);
    return nomeEmpresa; // Retorna o nome original se não encontrar
  }
  
  /**
   * Busca todos os elogios compartilhados/enviados do mês e calcula o ranking top 3
   */
  private async calcularRankingMensal(
    mes: number,
    ano: number
  ): Promise<{ primeiro: string; qtd1: number; segundo: string; qtd2: number; terceiro: string; qtd3: number }> {
    const resultado = { primeiro: '-', qtd1: 0, segundo: '-', qtd2: 0, terceiro: '-', qtd3: 0 };

    try {
      // Calcular range de datas do mês
      const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const dataFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

      // Buscar todos os elogios do mês com dados da pesquisa (prestador)
      const { data: elogiosMes, error } = await supabase
        .from('elogios')
        .select(`
          id,
          pesquisa:pesquisas_satisfacao!inner(
            prestador
          )
        `)
        .in('status', ['compartilhado', 'enviado'])
        .gte('data_resposta', dataInicio)
        .lte('data_resposta', dataFim);

      if (error || !elogiosMes || elogiosMes.length === 0) {
        if (error) console.warn('⚠️ Erro ao buscar elogios para ranking:', error);
        return resultado;
      }

      // Contar elogios por prestador
      const contagemPorPrestador: Record<string, number> = {};
      elogiosMes.forEach((elogio: any) => {
        const prestador = elogio.pesquisa?.prestador || 'Sem nome';
        if (prestador !== 'Sem nome') {
          contagemPorPrestador[prestador] = (contagemPorPrestador[prestador] || 0) + 1;
        }
      });

      // Ordenar por quantidade (desc) e agrupar por posição (empates)
      const ranking = Object.entries(contagemPorPrestador)
        .sort((a, b) => b[1] - a[1]);

      if (ranking.length === 0) return resultado;

      // Agrupar por posição considerando empates
      const posicoes: Array<{ nomes: string[]; qtd: number }> = [];
      let posicaoAtual = -1;
      let qtdAtual = -1;

      for (const [nome, qtd] of ranking) {
        if (qtd !== qtdAtual) {
          posicoes.push({ nomes: [nome], qtd });
          qtdAtual = qtd;
          posicaoAtual++;
        } else {
          posicoes[posicaoAtual].nomes.push(nome);
        }
        // Só precisamos das 3 primeiras posições
        if (posicoes.length > 3) break;
      }

      // Preencher resultado (gerando HTML estruturado para empates com fonte adaptativa)
      if (posicoes[0]) {
        resultado.primeiro = this.formatarNomesRanking(posicoes[0].nomes, posicoes[0].qtd);
        resultado.qtd1 = posicoes[0].qtd;
      }
      if (posicoes[1]) {
        resultado.segundo = this.formatarNomesRanking(posicoes[1].nomes, posicoes[1].qtd);
        resultado.qtd2 = posicoes[1].qtd;
      }
      if (posicoes[2]) {
        resultado.terceiro = this.formatarNomesRanking(posicoes[2].nomes, posicoes[2].qtd);
        resultado.qtd3 = posicoes[2].qtd;
      }

      console.log('🏆 Ranking mensal calculado:', resultado);
    } catch (error) {
      console.error('❌ Erro ao calcular ranking mensal:', error);
    }

    return resultado;
  }

  /**
   * Formata nomes do ranking com HTML estruturado para empates.
   * Quando há apenas 1 consultor, retorna o nome simples.
   * Quando há empates, gera blocos separados com divisória e fonte adaptativa.
   */
  private formatarNomesRanking(nomes: string[], qtd: number): string {
    const nomesOrdenados = nomes.sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const qtdFormatada = String(qtd).padStart(2, '0');
    const total = nomesOrdenados.length;

    // Apenas 1 consultor: retorna nome + qtd formatados
    if (total === 1) {
      return `<div style="font-size:19px;font-weight:900;text-align:center;">${nomesOrdenados[0]}</div><div style="font-size:13.4px;margin-top:5px;text-align:center;">Nº de Elogios: ${qtdFormatada}</div>`;
    }

    // Fonte adaptativa: diminui conforme aumenta o número de consultores
    let fontSize = '16px';
    if (total === 2) fontSize = '15px';
    else if (total === 3) fontSize = '14px';
    else if (total >= 4) fontSize = '12px';

    // Gerar HTML com blocos separados por divisória
    const blocos = nomesOrdenados.map((nome, index) => {
      let html = '';
      // Divisória antes de cada nome (exceto o primeiro)
      if (index > 0) {
        html += `<div style="width:60%;margin:8px auto;border-top:1px solid #999;"></div>`;
      }
      html += `<div style="font-size:${fontSize};font-weight:900;text-align:center;">${nome}</div>`;
      html += `<div style="font-size:11px;margin-top:2px;text-align:center;">Nº de Elogios: ${qtdFormatada}</div>`;
      return html;
    });

    return blocos.join('');
  }

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
        .title-main { font-size: 16px; font-weight: bold; margin: 0 0 8px 0; color: #000000; line-height: 1.3; font-family: Arial, sans-serif; }
        .title-sub { font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: #000000; font-family: Arial, sans-serif; }
        .title-month { font-size: 18px; font-weight: bold; margin: 0; color: #000000; letter-spacing: 1px; font-family: Arial, sans-serif; }
        .main-content { max-width: 1200px; margin: 0 auto; padding: 40px 48px; }
        .footer-image { width: 100%; height: auto; display: block; }
        @media only screen and (max-width: 600px) {
            .title-section { padding: 16px; }
            .main-content { padding: 20px 16px; }
            table { width: 100% !important; }
            td { display: block !important; width: 100% !important; margin-bottom: 24px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <img src="http://books-sonda.vercel.app/images/header-elogios.png" alt="Header" class="header-image">
        
        <!-- Título -->
        <div class="title-section">
            <h1 class="title-main">{{TITULO_PRINCIPAL}}</h1>
            <h2 class="title-sub">{{SUBTITULO}}</h2>
            <h3 class="title-month">{{sistema.mesNomeAtual}}</h3>
        </div>
        
        <!-- Container de Elogios -->
        <div class="main-content">
            {{elogio.loop}}
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
      return await this.processarTemplateFallback(elogiosSelecionados, mesSelecionado, anoSelecionado);
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
      return await this.processarTemplateFallback(elogiosSelecionados, mesSelecionado, anoSelecionado);
    }

    // Preparar variáveis do sistema
    const nomesMeses = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    // Calcular ranking mensal (top 3 colaboradores)
    const ranking = await this.calcularRankingMensal(mesSelecionado, anoSelecionado);

    const variables: Partial<ElogiosTemplateVariables> = {
      'sistema.mesNomeAtual': nomesMeses[mesSelecionado - 1],
      'sistema.anoAtual': anoSelecionado.toString(),
      'sistema.dataAtual': new Date().toLocaleDateString('pt-BR'),
      'TITULO_PRINCIPAL': 'ELOGIOS AOS COLABORADORES',
      'SUBTITULO': 'DE SOLUÇÕES DE NEGÓCIOS',
      'MES_REFERENCIA': nomesMeses[mesSelecionado - 1],
      'HEADER_IMAGE_URL': 'http://books-sonda.vercel.app/images/header-elogios.png',
      'FOOTER_IMAGE_URL': 'http://books-sonda.vercel.app/images/rodape-elogios.png',
      'elogio.mesNomeAno': `${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}`,
      'elogio.primeiro': ranking.primeiro,
      'elogio.qtd1': ranking.qtd1.toString(),
      'elogio.segundo': ranking.segundo,
      'elogio.qtd2': ranking.qtd2.toString(),
      'elogio.terceiro': ranking.terceiro,
      'elogio.qtd3': ranking.qtd3.toString(),
    };

    // Processar loop de elogios
    const mesNomeAno = `${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}`;
    const elogiosHtml = await this.gerarHtmlElogios(elogiosSelecionados, mesNomeAno);
    
    // Substituir variáveis no template
    let htmlProcessado = templateHtml;
    
    // Substituir variáveis simples
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      htmlProcessado = htmlProcessado.replace(regex, value || '');
    });

    // Substituir loop de elogios
    htmlProcessado = htmlProcessado.replace('{{elogio.loop}}', elogiosHtml);

    return {
      html: htmlProcessado,
      variables,
      elogiosProcessados: elogiosSelecionados.length,
      linhasGeradas: Math.ceil(elogiosSelecionados.length / 4)
    };
  }

  /**
   * Gera HTML dos elogios organizados em blocos de 8 cards (2 linhas de 4)
   * Cada bloco tem imagem de fundo própria. Quando passa de 8, cria novo bloco.
   */
  /**
     * Capitaliza a primeira letra de cada palavra
     */
    private capitalizarPalavras(texto: string): string {
      return texto.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    /**
     * Capitaliza apenas a primeira letra da frase
     */
    private capitalizarPrimeiraLetra(texto: string): string {
      if (!texto) return '';
      return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    /**
     * Gera HTML dos elogios organizados em blocos de 8 cards (2 linhas de 4)
     * Cards com tamanho fixo, fontes Roboto específicas, texto justificado e centralizado.
     * Elogios ordenados alfabeticamente pelo nome do colaborador.
     * Blocos de 1500x1080.
     */
    /**
       * Gera HTML dos elogios organizados em blocos de 8 cards (2 linhas de até 4)
       * Cards com tamanho fixo, nomes alinhados no topo, grid centralizado quando < 8 cards.
       * Elogios ordenados alfabeticamente. Blocos de 1500x1080.
       */
      private async gerarHtmlElogios(elogios: ElogioCompleto[], mesNomeAno?: string): Promise<string> {
        // Ordenar elogios alfabeticamente pelo nome do colaborador
        const elogiosOrdenados = [...elogios].sort((a, b) => {
          const nomeA = (a.pesquisa?.prestador || 'Z').toLowerCase();
          const nomeB = (b.pesquisa?.prestador || 'Z').toLowerCase();
          return nomeA.localeCompare(nomeB, 'pt-BR');
        });

        // Dividir elogios em blocos de 8
        const blocos: typeof elogiosOrdenados[] = [];
        for (let i = 0; i < elogiosOrdenados.length; i += 8) {
          blocos.push(elogiosOrdenados.slice(i, i + 8));
        }

        const labelMesAno = mesNomeAno || '';
        let html = '';

        // Largura fixa do card em pixels
        const cardWidth = 310;
        const cardGap = 16; // padding entre cards (8px cada lado)

        for (let blocoIndex = 0; blocoIndex < blocos.length; blocoIndex++) {
          const bloco = blocos[blocoIndex];
          const isUltimoBloco = blocoIndex === blocos.length - 1;
          // Separar em linha 1 (até 4) e linha 2 (restante)
          const totalBloco = bloco.length;
          let linha1: typeof elogiosOrdenados;
          let linha2: typeof elogiosOrdenados;

          if (totalBloco <= 4) {
            linha1 = bloco;
            linha2 = [];
          } else {
            linha1 = bloco.slice(0, 4);
            linha2 = bloco.slice(4);
          }

          const linhas = [linha1];
          if (linha2.length > 0) linhas.push(linha2);

          // Abrir bloco 1500x1080
          html += `
    <!--[if gte mso 9]>
    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:1500px;height:1080px;">
    <v:fill type="frame" src="https://books-sonda.vercel.app/images/elogios/detalhes-fundo-demais-paginas.png" color="#ffffff" />
    <v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:true">
    <![endif]-->
    <div style="max-width:1500px;margin:0 auto;">
    <table width="1500" cellpadding="0" cellspacing="0" border="0"
      style="border-collapse:collapse;width:1500px;max-width:1500px;height:1080px;margin:0 auto;background:#ffffff url('https://books-sonda.vercel.app/images/elogios/detalhes-fundo-demais-paginas.png') no-repeat center center;background-size:cover;">
      <!-- HEADER DO BLOCO -->
      <tr>
        <td align="center" style="padding:40px 20px 10px;">
          <p style="font-size:22px;font-weight:900;margin:0;text-align:center;font-family:'Roboto',Arial,sans-serif;">ELOGIOS AOS COLABORADORES DE SOLUÇÕES DE NEGÓCIOS</p>
          <p style="font-size:16px;font-weight:700;color:#1f5df5;margin:10px 0 15px;text-align:center;font-family:'Roboto',Arial,sans-serif;">${labelMesAno}</p>
          <img src="https://books-sonda.vercel.app/images/elogios/balao-elogios-recebidos.png" width="420" style="max-width:90%;display:block;margin:0 auto;">
        </td>
      </tr>
      <!-- GRID DE ELOGIOS -->
      <tr>
        <td align="center" valign="middle" style="padding:20px 0;">`;

          for (const linha of linhas) {
            const count = linha.length;
            // Calcular largura total da linha para centralizar
            const linhaWidth = count * (cardWidth + cardGap);

            html += `
          <table width="${linhaWidth}" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 auto 10px auto;">
            <tr>`;

            for (const elogio of linha) {
              const nome = (elogio.pesquisa?.prestador || 'Colaborador').toUpperCase();
              const mensagemRaw = elogio.pesquisa?.comentario_pesquisa || elogio.pesquisa?.resposta || '';
              const mensagem = this.capitalizarPrimeiraLetra(mensagemRaw);
              const clienteRaw = elogio.pesquisa?.cliente || 'N/A';
              const cliente = this.capitalizarPalavras(clienteRaw);
              const nomeEmpresaOriginal = elogio.pesquisa?.empresa || 'N/A';
              const empresaAbreviado = await this.obterNomeAbreviadoEmpresa(nomeEmpresaOriginal);
              const empresa = empresaAbreviado.toUpperCase();

              html += `
              <td width="${cardWidth}" valign="top" style="padding:8px;">
                <table width="${cardWidth}" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background:#efefef;border-radius:20px;width:${cardWidth}px;height:220px;">
                  <tr>
                    <td valign="top" style="padding:18px;">
                      <div style="text-align:left;">
                        <div style="color:#1f5df5;font-weight:700;font-size:11.9px;font-family:'Roboto',Arial,sans-serif;text-align:justify;margin:0 0 6px 0;">${nome}</div>
                        <div style="color:#000;font-weight:400;font-size:9.9px;font-family:'Roboto',Arial,sans-serif;text-align:justify;margin:0 0 8px 0;line-height:1.4;">${mensagem}</div>
                        <div style="color:#000;font-weight:900;font-size:10px;font-family:'Roboto',Arial,sans-serif;text-align:justify;margin:0 0 2px 0;"><span style="font-weight:900;">Cliente:</span> ${cliente}</div>
                        <div style="color:#000;font-weight:900;font-size:10px;font-family:'Roboto',Arial,sans-serif;text-align:justify;margin:0;"><span style="font-weight:900;">Empresa:</span> ${empresa}</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>`;
            }

            html += `
            </tr>
          </table>`;
          }

          // Fechar grid + footer do bloco (apenas no último bloco)
          html += `
        </td>
      </tr>`;

          if (isUltimoBloco) {
            html += `
      <!-- COMO ENVIAR -->
      <tr>
        <td align="center" style="padding:30px 20px;">
          <img src="https://books-sonda.vercel.app/images/elogios/balao-como-enviar-elogios.png" width="600" style="max-width:90%;display:block;margin:0 auto;">
        </td>
      </tr>
      <!-- LOGO -->
      <tr>
        <td align="center" style="padding:20px 0 40px;">
          <img src="https://books-sonda.vercel.app/images/elogios/logo-elogios.png" width="180" style="display:block;margin:0 auto;">
        </td>
      </tr>`;
          }

          html += `
    </table>
    </div>
    <!--[if gte mso 9]>
    </v:textbox>
    </v:rect>
    <![endif]-->`;
        }

        return html;
      }




  /**
   * Template fallback caso não consiga acessar o banco
   */
  private async processarTemplateFallback(
    elogiosSelecionados: ElogioCompleto[],
    mesSelecionado: number,
    anoSelecionado: number
  ): Promise<ProcessedElogiosTemplate> {
    const nomesMeses = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    // Calcular ranking mensal (top 3 colaboradores)
    const ranking = await this.calcularRankingMensal(mesSelecionado, anoSelecionado);

    const variables: Partial<ElogiosTemplateVariables> = {
      'sistema.mesNomeAtual': nomesMeses[mesSelecionado - 1],
      'TITULO_PRINCIPAL': 'ELOGIOS AOS COLABORADORES',
      'SUBTITULO': 'DE SOLUÇÕES DE NEGÓCIOS',
      'HEADER_IMAGE_URL': 'http://books-sonda.vercel.app/images/header-elogios.png',
      'FOOTER_IMAGE_URL': 'http://books-sonda.vercel.app/images/rodape-elogios.png',
      'elogio.mesNomeAno': `${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}`,
      'elogio.primeiro': ranking.primeiro,
      'elogio.qtd1': ranking.qtd1.toString(),
      'elogio.segundo': ranking.segundo,
      'elogio.qtd2': ranking.qtd2.toString(),
      'elogio.terceiro': ranking.terceiro,
      'elogio.qtd3': ranking.qtd3.toString(),
    };

    // Template hardcoded como fallback com CSS simplificado para tabelas HTML
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
        .title-main { font-size: 16px; font-weight: bold; margin: 0 0 8px 0; color: #000000; line-height: 1.3; font-family: Arial, sans-serif; }
        .title-sub { font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: #000000; font-family: Arial, sans-serif; }
        .title-month { font-size: 18px; font-weight: bold; margin: 0; color: #000000; letter-spacing: 1px; font-family: Arial, sans-serif; }
        .main-content { max-width: 1200px; margin: 0 auto; padding: 40px 48px; }
        .footer-image { width: 100%; height: auto; display: block; }
        @media only screen and (max-width: 600px) {
            .title-section { padding: 16px; }
            .main-content { padding: 20px 16px; }
            table { width: 100% !important; }
            td { display: block !important; width: 100% !important; margin-bottom: 24px; }
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
            ${await this.gerarHtmlElogios(elogiosSelecionados, `${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}`)}
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
        variavel: '{{elogio.loop}}',
        descricao: 'Loop principal dos elogios - gera blocos de 8 cards (2 linhas de 4) com imagem de fundo. Substituído automaticamente.',
        exemplo: '[HTML dos elogios gerado automaticamente em blocos de 8]',
        categoria: 'Conteúdo'
      },
      {
        variavel: '{{elogio.nome}}',
        descricao: 'Nome do colaborador elogiado (prestador)',
        exemplo: 'CLEONAN SANTOS DA VISITACAO',
        categoria: 'Card Elogio'
      },
      {
        variavel: '{{elogio.mensagem}}',
        descricao: 'Mensagem/comentário do elogio recebido',
        exemplo: 'Excelente atendimento e resolução rápida do chamado',
        categoria: 'Card Elogio'
      },
      {
        variavel: '{{elogio.cliente}}',
        descricao: 'Nome do cliente que enviou o elogio',
        exemplo: 'João Silva',
        categoria: 'Card Elogio'
      },
      {
        variavel: '{{elogio.empresa}}',
        descricao: 'Nome abreviado da empresa do cliente',
        exemplo: 'SOUZA CRUZ',
        categoria: 'Card Elogio'
      },

      // Variáveis de Ranking de Elogios
      {
        variavel: '{{elogio.mesNomeAno}}',
        descricao: 'Mês e ano do disparo dos elogios',
        exemplo: 'FEVEREIRO 2026',
        categoria: 'Ranking'
      },
      {
        variavel: '{{elogio.primeiro}}',
        descricao: '1º lugar - Nome do(s) colaborador(es) com mais elogios no mês (empates separados por vírgula)',
        exemplo: 'CLEONAN SANTOS DA VISITACAO',
        categoria: 'Ranking'
      },
      {
        variavel: '{{elogio.qtd1}}',
        descricao: 'Quantidade de elogios do 1º lugar no mês',
        exemplo: '7',
        categoria: 'Ranking'
      },
      {
        variavel: '{{elogio.segundo}}',
        descricao: '2º lugar - Nome do(s) colaborador(es) com mais elogios no mês',
        exemplo: 'MARIA CELIA MORAIS FERNANDES',
        categoria: 'Ranking'
      },
      {
        variavel: '{{elogio.qtd2}}',
        descricao: 'Quantidade de elogios do 2º lugar no mês',
        exemplo: '5',
        categoria: 'Ranking'
      },
      {
        variavel: '{{elogio.terceiro}}',
        descricao: '3º lugar - Nome do(s) colaborador(es) com mais elogios no mês',
        exemplo: 'ALMIR DE SOUZA BATISTA',
        categoria: 'Ranking'
      },
      {
        variavel: '{{elogio.qtd3}}',
        descricao: 'Quantidade de elogios do 3º lugar no mês',
        exemplo: '5',
        categoria: 'Ranking'
      }
    ];
  }
}

// Instância singleton do serviço
export const elogiosTemplateService = new ElogiosTemplateService();