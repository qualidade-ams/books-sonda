import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  PessoaOrganograma, 
  PessoaComSubordinados, 
  PessoaComProduto,
  PessoaProduto,
  Cargo, 
  Produto 
} from '@/types/organograma';

export function useOrganograma() {
  const [pessoas, setPessoas] = useState<PessoaComProduto[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usandoSistemaAntigo, setUsandoSistemaAntigo] = useState(false);

  // Verificar se tabela organizacao_produto existe
  const verificarTabelaProduto = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('organizacao_produto')
        .select('id')
        .limit(1);
      
      return !error;
    } catch {
      return false;
    }
  }, []);

  // Buscar pessoas com sistema NOVO (múltiplos produtos)
  const fetchPessoasNovo = useCallback(async (produto?: Produto | 'all') => {
    if (produto && produto !== 'all') {
      // Buscar pessoas de um produto específico
      const { data, error: fetchError } = await supabase
        .from('organizacao_estrutura')
        .select(`
          *,
          organizacao_produto!organizacao_produto_pessoa_id_fkey!inner(
            id,
            produto,
            superior_id
          )
        `)
        .eq('organizacao_produto.produto', produto)
        .order('cargo', { ascending: true })
        .order('ordem_exibicao', { ascending: true })
        .order('nome', { ascending: true });

      if (fetchError) throw fetchError;

      const pessoasComProduto: PessoaComProduto[] = (data || []).map((pessoa: any) => {
        const produtoData = Array.isArray(pessoa.organizacao_produto) 
          ? pessoa.organizacao_produto[0] 
          : pessoa.organizacao_produto;
        
        return {
          ...pessoa,
          produto: produtoData.produto,
          superior_id: produtoData.superior_id,
          organizacao_produto: undefined
        };
      });

      setPessoas(pessoasComProduto);
    } else {
      // Buscar todas as pessoas com todos os produtos
      const { data: pessoasData, error: pessoasError } = await supabase
        .from('organizacao_estrutura')
        .select('*')
        .order('cargo', { ascending: true })
        .order('ordem_exibicao', { ascending: true })
        .order('nome', { ascending: true });

      if (pessoasError) throw pessoasError;

      const { data: produtosData, error: produtosError } = await supabase
        .from('organizacao_produto')
        .select('*');

      if (produtosError) throw produtosError;

      const pessoasComProdutos: PessoaComProduto[] = (pessoasData || []).map((pessoa) => {
        const produtosPessoa = (produtosData || []).filter(
          (p: PessoaProduto) => p.pessoa_id === pessoa.id
        );
        
        const produtoPrincipal = produtosPessoa[0];
        
        return {
          ...pessoa,
          produto: produtoPrincipal?.produto || 'COMEX',
          superior_id: produtoPrincipal?.superior_id,
          produtos: produtosPessoa.map((p: PessoaProduto) => p.produto)
        };
      });

      setPessoas(pessoasComProdutos);
    }
  }, []);

  // Buscar pessoas com sistema ANTIGO (sem múltiplos produtos)
  const fetchPessoasAntigo = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('organizacao_estrutura')
      .select('*')
      .order('cargo', { ascending: true })
      .order('ordem_exibicao', { ascending: true })
      .order('nome', { ascending: true });

    if (fetchError) throw fetchError;

    // Converter para formato PessoaComProduto (compatibilidade)
    const pessoasComProduto: PessoaComProduto[] = (data || []).map((pessoa) => ({
      ...pessoa,
      produto: 'COMEX', // Produto padrão no sistema antigo
      produtos: ['COMEX']
    }));

    setPessoas(pessoasComProduto);
  }, []);

  // Buscar pessoas (detecta automaticamente qual sistema usar)
  const fetchPessoas = useCallback(async (produto?: Produto | 'all') => {
    try {
      setLoading(true);
      setError(null);

      // Verificar se tabela de produtos existe
      const tabelaExiste = await verificarTabelaProduto();
      setUsandoSistemaAntigo(!tabelaExiste);

      if (tabelaExiste) {
        console.log('✅ Usando sistema NOVO (múltiplos produtos)');
        await fetchPessoasNovo(produto);
      } else {
        console.log('⚠️ Usando sistema ANTIGO (sem múltiplos produtos)');
        console.log('💡 Execute as migrations para habilitar múltiplos produtos!');
        await fetchPessoasAntigo();
      }
    } catch (err) {
      console.error('Erro ao buscar pessoas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [verificarTabelaProduto, fetchPessoasNovo, fetchPessoasAntigo]);

  useEffect(() => {
    fetchPessoas(produtoSelecionado);
  }, [fetchPessoas, produtoSelecionado]);

  // Buscar produtos de uma pessoa específica
  const getProdutosPessoa = useCallback(async (pessoaId: string): Promise<PessoaProduto[]> => {
    if (usandoSistemaAntigo) {
      // Sistema antigo: retornar produto padrão
      return [{
        id: 'default',
        pessoa_id: pessoaId,
        produto: 'COMEX',
        superior_id: pessoas.find(p => p.id === pessoaId)?.superior_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }];
    }

    const { data, error } = await supabase
      .from('organizacao_produto')
      .select('*')
      .eq('pessoa_id', pessoaId);

    if (error) throw error;
    return data || [];
  }, [usandoSistemaAntigo, pessoas]);

  const getPessoasPorCargo = useCallback((cargo: Cargo, produto?: Produto): PessoaComProduto[] => {
    return pessoas.filter(p => {
      const matchCargo = p.cargo === cargo;
      const matchProduto = !produto || p.produto === produto || p.produtos?.includes(produto);
      return matchCargo && matchProduto;
    });
  }, [pessoas]);

  const getSuperioresDisponiveis = useCallback((cargo: Cargo, produto?: Produto): PessoaComProduto[] => {
    if (cargo === 'Diretor') return [];
    if (cargo === 'Gerente') return getPessoasPorCargo('Diretor', produto);
    if (cargo === 'Coordenador') return getPessoasPorCargo('Gerente', produto);
    if (cargo === 'Central Escalação') return getPessoasPorCargo('Coordenador', produto);
    return [];
  }, [getPessoasPorCargo]);

  const construirArvoreHierarquica = useCallback((produto?: Produto): PessoaComSubordinados[] => {
    console.log('🌳 Construindo árvore hierárquica:', { 
      produto, 
      totalPessoas: pessoas.length,
      pessoasComProdutos: pessoas.filter(p => p.produtos && p.produtos.length > 0).length
    });
    
    const pessoasFiltradas = produto 
      ? pessoas.filter(p => p.produto === produto || p.produtos?.includes(produto))
      : pessoas;

    console.log('📊 Pessoas filtradas:', pessoasFiltradas.length);

    const pessoasMap = new Map<string, PessoaComSubordinados>();
    
    pessoasFiltradas.forEach(pessoa => {
      pessoasMap.set(pessoa.id, { ...pessoa, subordinados: [] });
    });

    const raizes: PessoaComSubordinados[] = [];
    
    // Separar Central Escalação para tratamento especial
    const centraisEscalacao = pessoasFiltradas.filter(p => p.cargo === 'Central Escalação');
    const outrasPessoas = pessoasFiltradas.filter(p => p.cargo !== 'Central Escalação');
    
    // Construir hierarquia normal (sem Central Escalação)
    outrasPessoas.forEach(pessoa => {
      const pessoaComSub = pessoasMap.get(pessoa.id)!;
      
      if (pessoa.superior_id) {
        const superior = pessoasMap.get(pessoa.superior_id);
        if (superior) {
          superior.subordinados = superior.subordinados || [];
          superior.subordinados.push(pessoaComSub);
        } else {
          raizes.push(pessoaComSub);
        }
      } else {
        raizes.push(pessoaComSub);
      }
    });

    // Adicionar Central Escalação de forma centralizada
    if (centraisEscalacao.length > 0) {
      // Para cada Central Escalação
      centraisEscalacao.forEach(central => {
        // Obter produtos do Central Escalação
        const produtosCentral = central.produtos || [central.produto];
        
        console.log(`📍 Processando Central Escalação "${central.nome}" com produtos:`, produtosCentral);
        
        // Se estiver filtrado por produto específico
        if (produto) {
          // Verificar se a Central atende este produto
          if (produtosCentral.includes(produto)) {
            // Filtrar coordenadores deste produto específico
            const coordenadoresProduto = outrasPessoas.filter(p => 
              p.cargo === 'Coordenador' && 
              (p.produto === produto || p.produtos?.includes(produto))
            );
            
            if (coordenadoresProduto.length > 0) {
              // Criar UMA Central com TODOS os produtos dela (para borda multicolorida)
              const centralComSub: PessoaComSubordinados = {
                ...central,
                subordinados: []
              };
              
              // Calcular índice do coordenador mais central
              const indiceMeio = Math.floor((coordenadoresProduto.length - 1) / 2);
              const coordenadorCentral = pessoasMap.get(coordenadoresProduto[indiceMeio].id);
              
              if (coordenadorCentral) {
                coordenadorCentral.subordinados = coordenadorCentral.subordinados || [];
                coordenadorCentral.subordinados.push(centralComSub);
                console.log(`✅ Central Escalação "${central.nome}" (filtrado: ${produto}) adicionado ao coordenador central "${coordenadorCentral.nome}" (índice ${indiceMeio} de ${coordenadoresProduto.length})`);
              }
            }
          }
        } else {
          // Sem filtro: criar uma Central para cada produto (comportamento original)
          produtosCentral.forEach(produtoCentral => {
            // Filtrar coordenadores deste produto específico
            const coordenadoresProduto = outrasPessoas.filter(p => 
              p.cargo === 'Coordenador' && 
              (p.produto === produtoCentral || p.produtos?.includes(produtoCentral))
            );
            
            if (coordenadoresProduto.length > 0) {
              // Criar uma cópia do Central Escalação para este produto
              const centralComSub: PessoaComSubordinados = {
                ...central,
                id: `${central.id}_${produtoCentral}`, // ID único por produto
                produto: produtoCentral, // Produto específico
                produtos: [produtoCentral], // Array com apenas este produto
                subordinados: []
              };
              
              // Calcular índice do coordenador mais central
              const indiceMeio = Math.floor((coordenadoresProduto.length - 1) / 2);
              const coordenadorCentral = pessoasMap.get(coordenadoresProduto[indiceMeio].id);
              
              if (coordenadorCentral) {
                coordenadorCentral.subordinados = coordenadorCentral.subordinados || [];
                coordenadorCentral.subordinados.push(centralComSub);
                console.log(`✅ Central Escalação "${central.nome}" (${produtoCentral}) adicionado ao coordenador central "${coordenadorCentral.nome}" (índice ${indiceMeio} de ${coordenadoresProduto.length})`);
              }
            } else {
              console.log(`⚠️ Nenhum coordenador encontrado para o produto ${produtoCentral}`);
            }
          });
        }
      });
    }

    console.log('🌲 Raízes encontradas:', raizes.length, raizes.map(r => ({ nome: r.nome, cargo: r.cargo, produto: r.produto })));

    return raizes;
  }, [pessoas]);

  const uploadFoto = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('organograma')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('organograma')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const deleteFoto = async (fotoUrl: string) => {
    try {
      const fileName = fotoUrl.split('/').pop();
      if (!fileName) return;

      await supabase.storage
        .from('organograma')
        .remove([fileName]);
    } catch (err) {
      console.error('Erro ao deletar foto:', err);
    }
  };

  const criarPessoa = async (
    dados: Omit<PessoaOrganograma, 'id' | 'created_at' | 'updated_at' | 'foto_url' | 'superior_id'>,
    produtos: Produto[],
    superiores: Record<Produto, string | undefined>,
    foto?: File
  ): Promise<PessoaOrganograma> => {
    // Validar que produtos é um array
    if (!Array.isArray(produtos)) {
      console.error('❌ Erro: produtos não é um array:', produtos);
      throw new Error('Produtos deve ser um array');
    }

    let fotoUrl: string | undefined;

    if (foto) {
      fotoUrl = await uploadFoto(foto);
    }

    console.log('📝 Criando pessoa com dados:', {
      ...dados,
      foto_url: fotoUrl,
      produtos,
      superiores,
      sistemaAntigo: usandoSistemaAntigo
    });

    // 1. Criar pessoa
    const dadosInsert: any = {
      nome: dados.nome,
      cargo: dados.cargo,
      departamento: dados.departamento,
      email: dados.email,
      telefone: dados.telefone,
      foto_url: fotoUrl
    };

    // Sistema antigo: adicionar superior_id diretamente
    if (usandoSistemaAntigo) {
      dadosInsert.superior_id = superiores[produtos[0]] || null;
    }

    const { data: pessoaData, error: insertError } = await supabase
      .from('organizacao_estrutura')
      .insert(dadosInsert)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao criar pessoa:', insertError);
      throw insertError;
    }

    // 2. Criar vínculos com produtos (apenas sistema novo)
    if (!usandoSistemaAntigo) {
      const produtosInsert = produtos.map(produto => ({
        pessoa_id: pessoaData.id,
        produto,
        superior_id: superiores[produto] || null
      }));

      const { error: produtosError } = await supabase
        .from('organizacao_produto')
        .insert(produtosInsert);

      if (produtosError) {
        console.error('❌ Erro ao vincular produtos:', produtosError);
        await supabase.from('organizacao_estrutura').delete().eq('id', pessoaData.id);
        throw produtosError;
      }

      // 3. Se for Central Escalação, criar múltiplos vínculos com TODOS os coordenadores
      if (dados.cargo === 'Central Escalação') {
        console.log('🔗 Vinculando Central Escalação a todos os coordenadores...');
        
        for (const produto of produtos) {
          // Primeiro, buscar os IDs das pessoas que têm esse produto
          const { data: pessoasProduto, error: produtoError } = await supabase
            .from('organizacao_produto')
            .select('pessoa_id')
            .eq('produto', produto);

          if (produtoError) {
            console.error('❌ Erro ao buscar pessoas do produto:', produtoError);
            continue;
          }

          if (!pessoasProduto || pessoasProduto.length === 0) {
            console.log(`⚠️ Nenhuma pessoa encontrada para o produto ${produto}`);
            continue;
          }

          const pessoaIds = pessoasProduto.map(p => p.pessoa_id);

          // Agora buscar coordenadores que estão nessa lista de IDs
          const { data: coordenadores, error: coordError } = await supabase
            .from('organizacao_estrutura')
            .select('id')
            .eq('cargo', 'Coordenador')
            .in('id', pessoaIds);

          if (coordError) {
            console.error('❌ Erro ao buscar coordenadores:', coordError);
            continue;
          }

          if (coordenadores && coordenadores.length > 0) {
            // Criar vínculos com todos os coordenadores
            const vinculosSuperiores = coordenadores.map(coord => ({
              pessoa_id: pessoaData.id,
              superior_id: coord.id,
              produto
            }));

            const { error: vinculosError } = await supabase
              .from('organizacao_multiplos_superiores')
              .insert(vinculosSuperiores);

            if (vinculosError) {
              console.error('❌ Erro ao criar vínculos múltiplos:', vinculosError);
            } else {
              console.log(`✅ Central Escalação vinculado a ${coordenadores.length} coordenadores em ${produto}`);
            }
          }
        }
      }
    }

    console.log('✅ Pessoa criada com sucesso:', pessoaData);
    await fetchPessoas(produtoSelecionado);
    return pessoaData;
  };

  const atualizarPessoa = async (
    id: string,
    dados: Partial<Omit<PessoaOrganograma, 'id' | 'created_at' | 'updated_at' | 'foto_url' | 'superior_id'>>,
    produtos: Produto[],
    superiores: Record<Produto, string | undefined>,
    foto?: File | null
  ): Promise<PessoaOrganograma> => {
    const pessoaAtual = pessoas.find(p => p.id === id);
    let fotoUrl: string | null | undefined = undefined;

    if (foto === null) {
      if (pessoaAtual?.foto_url) {
        await deleteFoto(pessoaAtual.foto_url);
      }
      fotoUrl = null;
    } else if (foto) {
      if (pessoaAtual?.foto_url) {
        await deleteFoto(pessoaAtual.foto_url);
      }
      fotoUrl = await uploadFoto(foto);
    }

    const dadosParaAtualizar: any = { ...dados };
    
    if (fotoUrl !== undefined) {
      dadosParaAtualizar.foto_url = fotoUrl;
    }

    // Sistema antigo: atualizar superior_id diretamente
    if (usandoSistemaAntigo) {
      dadosParaAtualizar.superior_id = superiores[produtos[0]] || null;
    }

    const { data, error: updateError } = await supabase
      .from('organizacao_estrutura')
      .update(dadosParaAtualizar)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Sistema novo: atualizar produtos
    if (!usandoSistemaAntigo) {
      // Validar que produtos é um array
      if (!Array.isArray(produtos)) {
        console.error('❌ Erro: produtos não é um array:', produtos);
        throw new Error('Produtos deve ser um array');
      }

      const produtosAtuais = await getProdutosPessoa(id);
      const produtosAtuaisSet = new Set(produtosAtuais.map(p => p.produto));
      const produtosNovosSet = new Set(produtos);

      const produtosAdicionar = produtos.filter(p => !produtosAtuaisSet.has(p));
      const produtosRemover = produtosAtuais.filter(p => !produtosNovosSet.has(p.produto));
      const produtosAtualizar = produtosAtuais.filter(p => {
        if (!produtosNovosSet.has(p.produto)) return false;
        const novoSuperior = superiores[p.produto];
        return p.superior_id !== novoSuperior;
      });

      if (produtosAdicionar.length > 0) {
        const inserts = produtosAdicionar.map(produto => ({
          pessoa_id: id,
          produto,
          superior_id: superiores[produto] || null
        }));

        const { error: insertError } = await supabase
          .from('organizacao_produto')
          .insert(inserts);

        if (insertError) throw insertError;
      }

      if (produtosRemover.length > 0) {
        const { error: deleteError } = await supabase
          .from('organizacao_produto')
          .delete()
          .in('id', produtosRemover.map(p => p.id));

        if (deleteError) throw deleteError;
      }

      for (const produtoAtual of produtosAtualizar) {
        const { error: updateError } = await supabase
          .from('organizacao_produto')
          .update({ superior_id: superiores[produtoAtual.produto] || null })
          .eq('id', produtoAtual.id);

        if (updateError) throw updateError;
      }

      // Se for Central Escalação, atualizar múltiplos vínculos
      if (dados.cargo === 'Central Escalação' || pessoaAtual?.cargo === 'Central Escalação') {
        console.log('🔗 Atualizando vínculos de Central Escalação...');
        
        // Remover vínculos antigos
        await supabase
          .from('organizacao_multiplos_superiores')
          .delete()
          .eq('pessoa_id', id);

        // Criar novos vínculos com todos os coordenadores
        for (const produto of produtos) {
          // Primeiro, buscar os IDs das pessoas que têm esse produto
          const { data: pessoasProduto, error: produtoError } = await supabase
            .from('organizacao_produto')
            .select('pessoa_id')
            .eq('produto', produto);

          if (produtoError) {
            console.error('❌ Erro ao buscar pessoas do produto:', produtoError);
            continue;
          }

          if (!pessoasProduto || pessoasProduto.length === 0) {
            console.log(`⚠️ Nenhuma pessoa encontrada para o produto ${produto}`);
            continue;
          }

          const pessoaIds = pessoasProduto.map(p => p.pessoa_id);

          // Agora buscar coordenadores que estão nessa lista de IDs
          const { data: coordenadores, error: coordError } = await supabase
            .from('organizacao_estrutura')
            .select('id')
            .eq('cargo', 'Coordenador')
            .in('id', pessoaIds);

          if (coordError) {
            console.error('❌ Erro ao buscar coordenadores:', coordError);
            continue;
          }

          if (coordenadores && coordenadores.length > 0) {
            const vinculosSuperiores = coordenadores.map(coord => ({
              pessoa_id: id,
              superior_id: coord.id,
              produto
            }));

            const { error: vinculosError } = await supabase
              .from('organizacao_multiplos_superiores')
              .insert(vinculosSuperiores);

            if (vinculosError) {
              console.error('❌ Erro ao criar vínculos múltiplos:', vinculosError);
            } else {
              console.log(`✅ Central Escalação vinculado a ${coordenadores.length} coordenadores em ${produto}`);
            }
          }
        }
      }
    }

    await fetchPessoas(produtoSelecionado);
    return data;
  };

  const deletarPessoa = async (id: string): Promise<void> => {
    const pessoa = pessoas.find(p => p.id === id);

    if (!usandoSistemaAntigo) {
      const { data: subordinados, error: checkError } = await supabase
        .from('organizacao_produto')
        .select('id')
        .eq('superior_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (subordinados && subordinados.length > 0) {
        throw new Error('Não é possível excluir uma pessoa que possui subordinados em algum produto');
      }
    } else {
      const temSubordinados = pessoas.some(p => p.superior_id === id);
      if (temSubordinados) {
        throw new Error('Não é possível excluir uma pessoa que possui subordinados');
      }
    }

    if (pessoa?.foto_url) {
      await deleteFoto(pessoa.foto_url);
    }

    const { error: deleteError } = await supabase
      .from('organizacao_estrutura')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await fetchPessoas(produtoSelecionado);
  };

  return {
    pessoas,
    produtoSelecionado,
    setProdutoSelecionado,
    loading,
    error,
    usandoSistemaAntigo,
    fetchPessoas,
    getProdutosPessoa,
    getPessoasPorCargo,
    getSuperioresDisponiveis,
    construirArvoreHierarquica,
    criarPessoa,
    atualizarPessoa,
    deletarPessoa
  };
}
