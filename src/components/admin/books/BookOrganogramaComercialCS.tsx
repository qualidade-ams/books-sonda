/**
 * BookOrganogramaComercialCS - Aba de organograma Comercial/Customer Success no book
 * Busca a árvore hierárquica completa dos produtos CUSTOMER_SUCCESS e COMERCIAL
 * Filtra CS pelo email_gestor e Comercial pelo email_comercial da empresa
 * Exibe hierarquia completa: Diretor → Gerente → Coordenador → CS/Comercial
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { OrganoTree } from '@/components/admin/organograma/OrganoTree';
import { supabase } from '@/integrations/supabase/client';
import type { PessoaComSubordinados, Cargo, Produto } from '@/types/organograma';

interface BookOrganogramaComercialCSProps {
  empresaId: string;
  empresaNome: string;
}

export default function BookOrganogramaComercialCS({ empresaId, empresaNome }: BookOrganogramaComercialCSProps) {
  const [pessoas, setPessoas] = useState<PessoaComSubordinados[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscarOrganograma = async () => {
      try {
        setLoading(true);

        // Buscar emails da empresa
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas_clientes')
          .select('email_gestor, email_comercial')
          .eq('id', empresaId)
          .single();

        if (empresaError) {
          console.error('❌ [BookOrgComercialCS] Erro ao buscar empresa:', empresaError);
          setPessoas([]);
          return;
        }

        const emailGestor = empresaData?.email_gestor;
        const emailComercial = (empresaData as any)?.email_comercial;

        console.log(`📧 [BookOrgComercialCS] Email CS: ${emailGestor || 'N/A'}`);
        console.log(`📧 [BookOrgComercialCS] Email Comercial: ${emailComercial || 'N/A'}`);

        // Buscar TODAS as pessoas dos produtos CUSTOMER_SUCCESS e COMERCIAL com hierarquia
        const { data: pessoasData, error: pessoasError } = await (supabase as any)
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
          .in('organizacao_produto.produto', ['CUSTOMER_SUCCESS', 'COMERCIAL'])
          .order('cargo', { ascending: true })
          .order('ordem_exibicao', { ascending: true })
          .order('nome', { ascending: true });

        if (pessoasError) {
          console.error('❌ [BookOrgComercialCS] Erro ao buscar pessoas:', pessoasError);
          setPessoas([]);
          return;
        }

        // Processar dados
        const todasPessoas: PessoaComSubordinados[] = (pessoasData || []).map((pessoa: any) => {
          const produtoData = Array.isArray(pessoa.organizacao_produto)
            ? pessoa.organizacao_produto[0]
            : pessoa.organizacao_produto;

          return {
            id: pessoa.id,
            nome: pessoa.nome,
            cargo: pessoa.cargo as Cargo,
            departamento: pessoa.departamento,
            email: pessoa.email,
            telefone: pessoa.telefone,
            foto_url: pessoa.foto_url,
            ordem_exibicao: pessoa.ordem_exibicao,
            created_at: pessoa.created_at,
            updated_at: pessoa.updated_at,
            produto: produtoData.produto as Produto,
            superior_id: produtoData.superior_id,
            subordinados: []
          };
        });

        console.log(`📊 [BookOrgComercialCS] Total pessoas encontradas: ${todasPessoas.length}`);

        // Filtrar: manter toda a hierarquia (Diretor, Gerente, Coordenador)
        // mas para CS e Comercial, mostrar apenas os vinculados à empresa
        const pessoasFiltradas = todasPessoas.filter((pessoa) => {
          // Manter todos os níveis hierárquicos (Diretor, Gerente, Coordenador, Central Escalação)
          if (pessoa.cargo !== 'Customer Success' && pessoa.cargo !== 'Comercial') {
            return true;
          }
          // Customer Success: filtrar pelo email_gestor
          if (pessoa.cargo === 'Customer Success') {
            return emailGestor && pessoa.email?.toLowerCase() === emailGestor.toLowerCase();
          }
          // Comercial: filtrar pelo email_comercial
          if (pessoa.cargo === 'Comercial') {
            return emailComercial && pessoa.email?.toLowerCase() === emailComercial.toLowerCase();
          }
          return false;
        });

        console.log(`📊 [BookOrgComercialCS] Pessoas após filtro: ${pessoasFiltradas.length}`);

        // Construir árvore hierárquica
        const arvore = construirArvore(pessoasFiltradas);
        console.log(`🌳 [BookOrgComercialCS] Árvore construída com ${arvore.length} raízes`);
        setPessoas(arvore);
      } catch (error) {
        console.error('❌ [BookOrgComercialCS] Erro:', error);
        setPessoas([]);
      } finally {
        setLoading(false);
      }
    };

    buscarOrganograma();
  }, [empresaId, empresaNome]);

  // Construir árvore hierárquica a partir da lista de pessoas
  function construirArvore(pessoasList: PessoaComSubordinados[]): PessoaComSubordinados[] {
    const pessoasMap = new Map<string, PessoaComSubordinados>();

    pessoasList.forEach(pessoa => {
      pessoasMap.set(pessoa.id, { ...pessoa, subordinados: [] });
    });

    const raizes: PessoaComSubordinados[] = [];

    pessoasList.forEach(pessoa => {
      const pessoaComSub = pessoasMap.get(pessoa.id)!;

      if (pessoa.superior_id) {
        const superior = pessoasMap.get(pessoa.superior_id);
        if (superior) {
          superior.subordinados = superior.subordinados || [];
          superior.subordinados.push(pessoaComSub);
        } else {
          // Superior não está na lista filtrada, adicionar como raiz
          raizes.push(pessoaComSub);
        }
      } else {
        raizes.push(pessoaComSub);
      }
    });

    return raizes;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
      </div>
    );
  }

  if (pessoas.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Nenhum Comercial/Customer Success vinculado</p>
          <p className="text-gray-400 text-sm mt-2">
            Configure os emails no Cadastro de Empresa para vincular.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-1">
          Organograma Comercial/Customer Success <span className="text-sonda-blue">{empresaNome}</span>
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Visão Geral do Organograma Comercial e Customer Success
        </p>
      </div>
      <OrganoTree 
        pessoas={pessoas} 
        onEdit={() => {}} 
        onDelete={() => {}}
        isFiltered={true}
        viewOnly={true}
      />
    </div>
  );
}
