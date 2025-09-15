/**
 * Sistema de mapeamento de variáveis para templates de email do sistema de Books
 * Mapeia dados de empresas e colaboradores para variáveis utilizadas nos templates
 */

import type { EmpresaClienteCompleta, ColaboradorCompleto } from '@/types/clientBooks';

export interface ClientBooksTemplateData {
  empresa: EmpresaClienteCompleta;
  colaborador: ColaboradorCompleto;
  disparo: {
    mes: number;
    ano: number;
    dataDisparo: Date;
  };
}

export interface ClientBooksVariaveis {
  // Variáveis de empresa
  'empresa.nomeCompleto': string;
  'empresa.nomeAbreviado': string;
  'empresa.linkSharepoint': string;
  'empresa.templatePadrao': string;
  'empresa.status': string;
  'empresa.emailGestor': string;
  'empresa.produtos': string;
  'empresa.produtosList': string;
  
  // Variáveis de colaborador
  'colaborador.nomeCompleto': string;
  'colaborador.email': string;
  'colaborador.funcao': string;
  'colaborador.status': string;
  'colaborador.principalContato': string;
  
  // Variáveis de disparo
  'disparo.mes': string;
  'disparo.ano': string;
  'disparo.mesNome': string;
  'disparo.dataDisparo': string;
  'disparo.dataDisparoFormatada': string;
  
  // Variáveis de sistema
  'sistema.dataAtual': string;
  'sistema.anoAtual': string;
  'sistema.mesAtual': string;
}

/**
 * Mapeia produtos para exibição
 */
const mapearProdutos = (produtos: Array<{ produto: string }>): { lista: string; formatado: string } => {
  if (!produtos || produtos.length === 0) {
    return { lista: '', formatado: '' };
  }

  const mapeamento: { [key: string]: string } = {
    'CE_PLUS': 'CE Plus',
    'FISCAL': 'Fiscal',
    'GALLERY': 'Gallery'
  };

  const produtosMapeados = produtos.map(p => mapeamento[p.produto] || p.produto);
  
  return {
    lista: produtosMapeados.join(', '),
    formatado: produtosMapeados.length === 1 
      ? produtosMapeados[0] 
      : produtosMapeados.join('\n• ')
  };
};

/**
 * Mapeia status para exibição
 */
const mapearStatus = (status: string): string => {
  const mapeamento: { [key: string]: string } = {
    'ativo': 'Ativo',
    'inativo': 'Inativo',
    'suspenso': 'Suspenso'
  };

  return mapeamento[status] || status;
};

/**
 * Mapeia template padrão para exibição
 */
const mapearTemplatePadrao = (template: string): string => {
  const mapeamento: { [key: string]: string } = {
    'portugues': 'Português',
    'ingles': 'Inglês'
  };

  return mapeamento[template] || template;
};

/**
 * Obtém nome do mês por número
 */
const obterNomeMes = (mes: number): string => {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return meses[mes - 1] || `Mês ${mes}`;
};

/**
 * Formata data para exibição
 */
const formatarData = (data: Date): string => {
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formata data completa para exibição
 */
const formatarDataCompleta = (data: Date): string => {
  return data.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Mapeia dados do sistema de books para variáveis do template
 */
export const mapearVariaveisClientBooks = (dados: ClientBooksTemplateData): ClientBooksVariaveis => {
  const { empresa, colaborador, disparo } = dados;
  const produtos = mapearProdutos(empresa.produtos || []);
  const dataAtual = new Date();

  return {
    // Variáveis de empresa
    'empresa.nomeCompleto': empresa.nome_completo || '',
    'empresa.nomeAbreviado': empresa.nome_abreviado || '',
    'empresa.linkSharepoint': empresa.link_sharepoint || '',
    'empresa.templatePadrao': mapearTemplatePadrao(empresa.template_padrao || 'portugues'),
    'empresa.status': mapearStatus(empresa.status || 'ativo'),
    'empresa.emailGestor': empresa.email_gestor || '',
    'empresa.produtos': produtos.lista,
    'empresa.produtosList': produtos.formatado,
    
    // Variáveis de colaborador
    'colaborador.nomeCompleto': colaborador.nome_completo || '',
    'colaborador.email': colaborador.email || '',
    'colaborador.funcao': colaborador.funcao || '',
    'colaborador.status': mapearStatus(colaborador.status || 'ativo'),
    'colaborador.principalContato': colaborador.principal_contato ? 'Sim' : 'Não',
    
    // Variáveis de disparo
    'disparo.mes': String(disparo.mes),
    'disparo.ano': String(disparo.ano),
    'disparo.mesNome': obterNomeMes(disparo.mes),
    'disparo.dataDisparo': formatarData(disparo.dataDisparo),
    'disparo.dataDisparoFormatada': formatarDataCompleta(disparo.dataDisparo),
    
    // Variáveis de sistema
    'sistema.dataAtual': formatarData(dataAtual),
    'sistema.anoAtual': String(dataAtual.getFullYear()),
    'sistema.mesAtual': String(dataAtual.getMonth() + 1),
  };
};

/**
 * Substitui variáveis no template com os valores mapeados
 */
export const substituirVariaveisClientBooks = (
  template: string,
  variaveis: ClientBooksVariaveis
): string => {
  let templateProcessado = template;

  // Substituir cada variável no template
  Object.entries(variaveis).forEach(([chave, valor]) => {
    const regex = new RegExp(`{{${chave}}}`, 'g');

    // Garantir que o valor seja uma string
    let valorProcessado = typeof valor === 'string' ? valor : String(valor || '');

    // Processar quebras de linha para HTML se necessário
    if (/<[^>]+>/.test(template)) {
      // É um template HTML
      if (valorProcessado.includes('\n')) {
        valorProcessado = valorProcessado.replace(/\n/g, '<br>');
      }

      // Escapar caracteres especiais para HTML
      valorProcessado = valorProcessado
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        // Restaurar tags HTML permitidas
        .replace(/&lt;br&gt;/g, '<br>');
    }

    templateProcessado = templateProcessado.replace(regex, valorProcessado);
  });

  return templateProcessado;
};

/**
 * Lista todas as variáveis disponíveis para uso nos templates de books
 */
export const obterVariaveisClientBooksDisponiveis = (): { [categoria: string]: string[] } => {
  return {
    'Dados da Empresa': [
      'empresa.nomeCompleto',
      'empresa.nomeAbreviado',
      'empresa.linkSharepoint',
      'empresa.templatePadrao',
      'empresa.status',
      'empresa.emailGestor',
      'empresa.produtos',
      'empresa.produtosList'
    ],
    'Dados do Colaborador': [
      'colaborador.nomeCompleto',
      'colaborador.email',
      'colaborador.funcao',
      'colaborador.status',
      'colaborador.principalContato'
    ],
    'Dados do Disparo': [
      'disparo.mes',
      'disparo.ano',
      'disparo.mesNome',
      'disparo.dataDisparo',
      'disparo.dataDisparoFormatada'
    ],
    'Sistema': [
      'sistema.dataAtual',
      'sistema.anoAtual',
      'sistema.mesAtual'
    ]
  };
};

/**
 * Valida se todas as variáveis no template têm valores correspondentes
 */
export const validarVariaveisClientBooks = (
  template: string,
  variaveis: ClientBooksVariaveis
): { valido: boolean; variaveisNaoEncontradas: string[] } => {
  const regex = /{{([^}]+)}}/g;
  const variaveisNaoEncontradas: string[] = [];

  let match;
  while ((match = regex.exec(template)) !== null) {
    const nomeVariavel = match[1];

    if (!(nomeVariavel in variaveis)) {
      variaveisNaoEncontradas.push(nomeVariavel);
    }
  }

  return {
    valido: variaveisNaoEncontradas.length === 0,
    variaveisNaoEncontradas
  };
};

/**
 * Gera dados de exemplo para preview de templates
 */
export const gerarDadosExemplo = (): ClientBooksTemplateData => {
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
};