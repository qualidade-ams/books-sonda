import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EstatisticasEmpresas {
  totalEmpresas: number;
  totalClientes: number;
  clientesAtivos: number;
  empresasComAms: number;
  empresasSemAms: number;
  empresasEmProjeto: number;
  empresasAtivas: number;
  empresasInativas: number;
  empresasSuspensas: number;
  
  // Produtos
  empresasComFiscal: number;
  empresasComComex: number;
  empresasComFiscalEComex: number;
  empresasComGallery: number;
  
  // Produtos específicos (baseado nos nomes dos produtos)
  empresasComComplyEDocs: number;
  empresasComSatiSped: number;
  
  // Tipos de book
  empresasComBookQualidade: number;
  empresasComBookOutros: number;
  empresasSemBook: number;
  
  // Tipos de book apenas para empresas com AMS
  empresasAmsComBookQualidade: number;
  empresasAmsComBookOutros: number;
  empresasAmsSemBook: number;
  
  // Tipos de cobrança
  empresasBancoHoras: number;
  empresasTicket: number;
  empresasOutrosCobranca: number;
  
  // Produtos exclusivos (somente)
  empresasSomenteFiscal: number;
  empresasSomenteGallery: number;
  empresasSomenteComex: number;
  
  // Movimentação anual
  empresasEntraramAno: number;
  empresasSairamAno: number;
}

export const useEstatisticasEmpresas = () => {
  return useQuery({
    queryKey: ['estatisticas-empresas'],
    queryFn: async (): Promise<EstatisticasEmpresas> => {
      try {
        // Buscar todas as empresas com seus relacionamentos
        const { data: empresas, error: empresasError } = await supabase
          .from('empresas_clientes')
          .select(`
            *,
            produtos:empresa_produtos(produto),
            clientes(id)
          `);

        if (empresasError) {
          console.error('Erro ao buscar empresas:', empresasError);
          throw empresasError;
        }

        if (!empresas) {
          throw new Error('Nenhuma empresa encontrada');
        }

        // Filtrar apenas empresas ativas para os cálculos de produtos, AMS, etc.
        const empresasAtivas = empresas.filter(e => e.status === 'ativo');

        // Buscar clientes ativos diretamente da tabela clientes
        const { data: clientesAtivos, error: clientesError } = await supabase
          .from('clientes')
          .select('id')
          .eq('status', 'ativo');

        if (clientesError) {
          console.error('Erro ao buscar clientes ativos:', clientesError);
          throw clientesError;
        }

        // Calcular estatísticas
        const stats: EstatisticasEmpresas = {
          totalEmpresas: empresas.length,
          totalClientes: empresas.reduce((acc, empresa) => acc + (empresa.clientes?.length || 0), 0),
          clientesAtivos: clientesAtivos?.length || 0,
          
          // Usar apenas empresas ativas para AMS
          empresasComAms: empresasAtivas.filter(e => e.tem_ams === true).length,
          empresasSemAms: empresasAtivas.filter(e => e.tem_ams === false || e.tem_ams === null).length,
          
          // Status das empresas (usar todas para mostrar distribuição)
          empresasEmProjeto: empresas.filter(e => e.em_projeto === true).length,
          empresasAtivas: empresas.filter(e => e.status === 'ativo').length,
          empresasInativas: empresas.filter(e => e.status === 'inativo').length,
          empresasSuspensas: empresas.filter(e => e.status === 'suspenso').length,
          
          // Produtos - usar apenas empresas ativas
          empresasComFiscal: empresasAtivas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'FISCAL') ||
            e.produtos?.some((p: any) => p.produto === 'GALLERY')
          ).length,
          empresasComComex: empresasAtivas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'COMEX')
          ).length,
          empresasComFiscalEComex: empresasAtivas.filter(e => 
            (e.produtos?.some((p: any) => p.produto === 'FISCAL') || e.produtos?.some((p: any) => p.produto === 'GALLERY')) &&
            e.produtos?.some((p: any) => p.produto === 'COMEX')
          ).length,
          empresasComGallery: empresasAtivas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'GALLERY')
          ).length,
          
          // Produtos específicos - usar apenas empresas ativas
          empresasComComplyEDocs: empresasAtivas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'FISCAL')
          ).length,
          empresasComSatiSped: empresasAtivas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'FISCAL')
          ).length,
          
          // Tipos de book - usar apenas empresas ativas
          empresasComBookQualidade: empresasAtivas.filter(e => e.tipo_book === 'qualidade').length,
          empresasComBookOutros: empresasAtivas.filter(e => e.tipo_book === 'outros').length,
          empresasSemBook: empresasAtivas.filter(e => e.tipo_book === 'nao_tem_book' || e.tipo_book === null).length,
          
          // Tipos de book apenas para empresas com AMS
          empresasAmsComBookQualidade: empresasAtivas.filter(e => e.tem_ams === true && e.tipo_book === 'qualidade').length,
          empresasAmsComBookOutros: empresasAtivas.filter(e => e.tem_ams === true && e.tipo_book === 'outros').length,
          empresasAmsSemBook: empresasAtivas.filter(e => e.tem_ams === true && (e.tipo_book === 'nao_tem_book' || e.tipo_book === null)).length,
          
          // Tipos de cobrança - usar apenas empresas ativas
          empresasBancoHoras: empresasAtivas.filter(e => e.tipo_cobranca === 'banco_horas').length,
          empresasTicket: empresasAtivas.filter(e => e.tipo_cobranca === 'ticket').length,
          empresasOutrosCobranca: empresasAtivas.filter(e => e.tipo_cobranca === 'outros').length,
          
          // Produtos exclusivos (somente um produto)
          empresasSomenteFiscal: empresasAtivas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'FISCAL') &&
            !e.produtos?.some((p: any) => p.produto === 'COMEX') &&
            !e.produtos?.some((p: any) => p.produto === 'GALLERY')
          ).length,
          empresasSomenteGallery: empresasAtivas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'GALLERY') &&
            !e.produtos?.some((p: any) => p.produto === 'FISCAL') &&
            !e.produtos?.some((p: any) => p.produto === 'COMEX')
          ).length,
          empresasSomenteComex: empresasAtivas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'COMEX') &&
            !e.produtos?.some((p: any) => p.produto === 'FISCAL') &&
            !e.produtos?.some((p: any) => p.produto === 'GALLERY')
          ).length,
          
          // Movimentação anual (ano corrente) baseado em vigência do contrato
          // Apenas datas que já passaram (até hoje)
          empresasEntraramAno: (() => {
            const hoje = new Date();
            hoje.setHours(23, 59, 59, 999);
            const anoAtual = hoje.getFullYear();
            return empresas.filter(e => {
              if (!e.vigencia_inicial) return false;
              const dataInicio = new Date(e.vigencia_inicial + 'T00:00:00');
              return dataInicio.getFullYear() === anoAtual && dataInicio <= hoje;
            }).length;
          })(),
          empresasSairamAno: (() => {
            const hoje = new Date();
            hoje.setHours(23, 59, 59, 999);
            const anoAtual = hoje.getFullYear();
            return empresas.filter(e => {
              if (!e.vigencia_final) return false;
              const dataFim = new Date(e.vigencia_final + 'T00:00:00');
              return dataFim.getFullYear() === anoAtual && dataFim <= hoje;
            }).length;
          })(),
        };

        // Log simples para debug
        console.log('📊 Estatísticas:', {
          empresasAtivas: empresasAtivas.length,
          empresasComAms: stats.empresasComAms,
          empresasComFiscal: stats.empresasComFiscal,
          empresasSomenteFiscal: stats.empresasSomenteFiscal,
          empresasSomenteGallery: stats.empresasSomenteGallery,
          empresasSomenteComex: stats.empresasSomenteComex,
          // Estatísticas de book AMS
          empresasAmsComBookQualidade: stats.empresasAmsComBookQualidade,
          empresasAmsComBookOutros: stats.empresasAmsComBookOutros,
          empresasAmsSemBook: stats.empresasAmsSemBook
        });

        return stats;
      } catch (error) {
        console.error('Erro ao calcular estatísticas das empresas:', error);
        throw error;
      }
    },
    staleTime: 0, // Forçar refresh para debug
    gcTime: 0, // Não manter cache para debug
  });
};