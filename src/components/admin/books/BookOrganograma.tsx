/**
 * BookOrganograma - Aba de organograma no modal de visualização de books
 * Busca dados diretamente do Supabase para evitar conflitos com hook compartilhado
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { OrganoTree } from '@/components/admin/organograma/OrganoTree';
import { supabase } from '@/integrations/supabase/client';
import type { PessoaComSubordinados } from '@/types/organograma';

interface BookOrganogramaProps {
  empresaId: string;
  produto: string;
  empresaNome: string;
}

export default function BookOrganograma({ empresaId, produto, empresaNome }: BookOrganogramaProps) {
  const [pessoas, setPessoas] = useState<PessoaComSubordinados[]>([]);
  const [loading, setLoading] = useState(true);

  // Buscar dados do organograma diretamente
  useEffect(() => {
    const buscarOrganograma = async () => {
      try {
        setLoading(true);
        console.log(`🔍 Buscando organograma para produto: ${produto.toUpperCase()}`);
        
        // Buscar pessoas do produto específico com filtro aplicado
        const { data, error } = await (supabase as any)
          .from('organizacao_estrutura')
          .select(`
            id,
            nome,
            cargo,
            departamento,
            email,
            telefone,
            foto_url,
            ordem_exibicao,
            created_at,
            updated_at,
            organizacao_produto!organizacao_produto_pessoa_id_fkey!inner(
              id,
              produto,
              superior_id
            )
          `)
          .eq('organizacao_produto.produto', produto.toUpperCase())
          .order('cargo', { ascending: true })
          .order('ordem_exibicao', { ascending: true })
          .order('nome', { ascending: true });

        if (error) {
          console.error('❌ Erro ao buscar organograma:', error);
          throw error;
        }

        console.log(`✅ Dados recebidos: ${data?.length || 0} pessoas`);

        // Processar dados - garantir que pegamos o produto correto
        const pessoasComProduto = (data || []).map((pessoa: any) => {
          const produtoData = Array.isArray(pessoa.organizacao_produto) 
            ? pessoa.organizacao_produto[0] 
            : pessoa.organizacao_produto;
          
          return {
            id: pessoa.id,
            nome: pessoa.nome,
            cargo: pessoa.cargo,
            departamento: pessoa.departamento,
            email: pessoa.email,
            telefone: pessoa.telefone,
            foto_url: pessoa.foto_url,
            ordem_exibicao: pessoa.ordem_exibicao,
            created_at: pessoa.created_at,
            updated_at: pessoa.updated_at,
            produto: produtoData.produto,
            superior_id: produtoData.superior_id,
            subordinados: []
          };
        });

        console.log(`📊 Pessoas processadas:`, pessoasComProduto.map((p: any) => ({ nome: p.nome, cargo: p.cargo, produto: p.produto })));

        // Construir árvore hierárquica
        const arvore = construirArvore(pessoasComProduto);
        console.log(`🌳 Árvore construída com ${arvore.length} raízes`);
        setPessoas(arvore);
      } catch (error) {
        console.error('❌ Erro ao buscar organograma:', error);
        setPessoas([]);
      } finally {
        setLoading(false);
      }
    };

    buscarOrganograma();
  }, [produto, empresaId]);

  // Função para construir árvore hierárquica
  const construirArvore = (pessoas: PessoaComSubordinados[]): PessoaComSubordinados[] => {
    const pessoasPorId = new Map<string, PessoaComSubordinados>();
    
    // Criar mapa de pessoas
    pessoas.forEach(pessoa => {
      pessoasPorId.set(pessoa.id, { ...pessoa, subordinados: [] });
    });

    const raizes: PessoaComSubordinados[] = [];

    // Construir hierarquia
    pessoas.forEach(pessoa => {
      const pessoaComSubordinados = pessoasPorId.get(pessoa.id)!;
      
      if (pessoa.superior_id) {
        const superior = pessoasPorId.get(pessoa.superior_id);
        if (superior) {
          superior.subordinados = superior.subordinados || [];
          superior.subordinados.push(pessoaComSubordinados);
        } else {
          // Superior não encontrado neste produto, adicionar como raiz
          raizes.push(pessoaComSubordinados);
        }
      } else {
        // Sem superior, é raiz
        raizes.push(pessoaComSubordinados);
      }
    });

    return raizes;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
      </div>
    );
  }

  // Definir zoom específico por produto
  const getZoomPorProduto = () => {
    const produtoUpper = produto.toUpperCase();
    switch (produtoUpper) {
      case 'FISCAL':
        return 0.75; // Zoom menor para Fiscal (mais pessoas)
      case 'COMEX':
        return 0.95; // Zoom médio para Comex
      case 'GALLERY':
        return 0.95; // Zoom maior para Gallery
      default:
        return 0.75; // Zoom padrão
    }
  };

  const zoomInicial = getZoomPorProduto();

  return (
    <div key={`org-container-${produto}`} className="w-full h-full bg-white p-8" data-organograma={produto}>
      <div className="space-y-6">
        {/* Título da Seção */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Organograma {produto ? `${produto.charAt(0).toUpperCase() + produto.slice(1).toLowerCase()} ` : ''}{empresaNome ? <span className="text-blue-600">{empresaNome}</span> : 'RAINBOW'}
          </h2>
          <p className="text-sm text-gray-500">Visão Geral do Organograma do Produto</p>
        </div>

        {/* Card sem borda e sem sombra */}
        <div className="bg-white" style={{ minHeight: '1100px' }}>
          {/* Reutiliza o componente OrganoTree da tela de Organograma em modo somente visualização */}
          <OrganoTree 
            key={`organograma-${produto}`} // Key fixa baseada no produto
            pessoas={pessoas}
            onEdit={() => {}} // Não usado em modo viewOnly
            onDelete={() => {}} // Não usado em modo viewOnly
            viewOnly={true} // Esconde botões de editar/excluir
            centerOffset={0} // Ajuste negativo para centralizar melhor no modal
            height={1100} // Altura aumentada para ocupar toda a página
            initialZoom={zoomInicial} // Zoom específico por produto
          />
        </div>
      </div>
    </div>
  );
}
