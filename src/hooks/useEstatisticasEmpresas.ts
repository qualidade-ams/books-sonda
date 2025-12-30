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
  
  // Tipos de cobrança
  empresasBancoHoras: number;
  empresasTicket: number;
  empresasOutrosCobranca: number;
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
          empresasComAms: empresas.filter(e => e.tem_ams === true).length,
          empresasSemAms: empresas.filter(e => e.tem_ams === false || e.tem_ams === null).length,
          empresasEmProjeto: empresas.filter(e => e.em_projeto === true).length,
          empresasAtivas: empresas.filter(e => e.status === 'ativo').length,
          empresasInativas: empresas.filter(e => e.status === 'inativo').length,
          empresasSuspensas: empresas.filter(e => e.status === 'suspenso').length,
          
          // Produtos
          empresasComFiscal: empresas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'FISCAL')
          ).length,
          empresasComComex: empresas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'COMEX')
          ).length,
          empresasComFiscalEComex: empresas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'FISCAL') &&
            e.produtos?.some((p: any) => p.produto === 'COMEX')
          ).length,
          empresasComGallery: empresas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'GALLERY')
          ).length,
          
          // Produtos específicos (estimativa baseada nos produtos principais)
          empresasComComplyEDocs: empresas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'FISCAL')
          ).length, // Assume que empresas com FISCAL têm Comply e-Docs
          empresasComSatiSped: empresas.filter(e => 
            e.produtos?.some((p: any) => p.produto === 'FISCAL')
          ).length, // Assume que empresas com FISCAL têm SATI/SPED
          
          // Tipos de book
          empresasComBookQualidade: empresas.filter(e => e.tipo_book === 'qualidade').length,
          empresasComBookOutros: empresas.filter(e => e.tipo_book === 'outros').length,
          empresasSemBook: empresas.filter(e => e.tipo_book === 'nao_tem_book' || e.tipo_book === null).length,
          
          // Tipos de cobrança
          empresasBancoHoras: empresas.filter(e => e.tipo_cobranca === 'banco_horas').length,
          empresasTicket: empresas.filter(e => e.tipo_cobranca === 'ticket').length,
          empresasOutrosCobranca: empresas.filter(e => e.tipo_cobranca === 'outros').length,
        };

        return stats;
      } catch (error) {
        console.error('Erro ao calcular estatísticas das empresas:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};