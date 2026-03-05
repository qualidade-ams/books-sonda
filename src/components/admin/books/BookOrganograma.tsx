/**
 * BookOrganograma - Aba de organograma no modal de visualização de books
 * Busca dados diretamente do Supabase para evitar conflitos com hook compartilhado
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { OrganoTree } from '@/components/admin/organograma/OrganoTree';
import { supabase } from '@/integrations/supabase/client';
import type { PessoaComSubordinados, Cargo, Produto } from '@/types/organograma';

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
        const produtoUpper = produto.toUpperCase();
        console.log(`🔍 [BookOrganograma] Produto recebido: "${produto}"`);
        console.log(`🔍 [BookOrganograma] Produto uppercase: "${produtoUpper}"`);
        console.log(`🔍 [BookOrganograma] Empresa ID: "${empresaId}"`);
        console.log(`🔍 [BookOrganograma] Empresa Nome: "${empresaNome}"`);
        
        // Verificar se é Customer Success ou Comercial (filtrar por cargo)
        const isCustomerSuccess = produtoUpper === 'CUSTOMER SUCCESS' || produtoUpper === 'CUSTOMER_SUCCESS';
        const isComercial = produtoUpper === 'COMERCIAL';
        const isProdutoHierarquico = !isCustomerSuccess && !isComercial; // COMEX, FISCAL, GALLERY
        
        console.log(`🔍 [BookOrganograma] isCustomerSuccess: ${isCustomerSuccess}`);
        console.log(`🔍 [BookOrganograma] isComercial: ${isComercial}`);
        console.log(`🔍 [BookOrganograma] isProdutoHierarquico: ${isProdutoHierarquico}`);
        
        // SEMPRE buscar o Customer Success da empresa (para todos os produtos)
        let customerSuccessData: any[] = [];
        
        console.log(`📧 [BookOrganograma] Buscando email_gestor para empresa ID: ${empresaId}`);
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas_clientes')
          .select('email_gestor')
          .eq('id', empresaId)
          .single();
        
        if (empresaError) {
          console.error(`❌ [BookOrganograma] Erro ao buscar empresa:`, empresaError);
        }
        
        const emailGestor = empresaData?.email_gestor;
        console.log(`📧 [BookOrganograma] Email gestor encontrado: ${emailGestor || 'NÃO DEFINIDO'}`);
        
        // Buscar Customer Success específico da empresa
        if (emailGestor) {
          console.log(`🎯 [BookOrganograma] Buscando Customer Success com email: ${emailGestor}`);
          const csResult = await (supabase as any)
            .from('organizacao_estrutura')
            .select('*')
            .eq('cargo', 'Customer Success')
            .eq('email', emailGestor);
          
          const csData = csResult.data as any[];
          const csError = csResult.error;
          
          if (csError) {
            console.error(`❌ [BookOrganograma] Erro ao buscar Customer Success:`, csError);
          } else if (csData && csData.length > 0) {
            customerSuccessData = csData;
            console.log(`✅ [BookOrganograma] Customer Success encontrado: ${csData[0].nome} (${csData[0].email})`);
          } else {
            console.warn(`⚠️ [BookOrganograma] Nenhum Customer Success encontrado com email: ${emailGestor}`);
          }
        } else {
          console.warn(`⚠️ [BookOrganograma] Email gestor não definido para empresa ${empresaNome}`);
        }
        
        let data, error;
        
        if (isCustomerSuccess || isComercial) {
          // Buscar por cargo (Customer Success ou Comercial)
          const cargoFiltro = isCustomerSuccess ? 'Customer Success' : 'Comercial';
          console.log(`📊 [BookOrganograma] Buscando por cargo: ${cargoFiltro}`);
          
          let query = (supabase as any)
            .from('organizacao_estrutura')
            .select('*')
            .eq('cargo', cargoFiltro);
          
          // Se for Customer Success e houver email_gestor, filtrar apenas esse gestor
          if (isCustomerSuccess && emailGestor) {
            console.log(`🎯 [BookOrganograma] Filtrando apenas Customer Success com email: ${emailGestor}`);
            query = query.eq('email', emailGestor);
          } else if (isCustomerSuccess && !emailGestor) {
            console.warn(`⚠️ [BookOrganograma] Email gestor não definido para empresa ${empresaNome}. Mostrando todos os Customer Success.`);
          }
          
          const result = await query
            .order('ordem_exibicao', { ascending: true })
            .order('nome', { ascending: true });
          
          data = result.data as any[];
          error = result.error;
          
          console.log(`📊 [BookOrganograma] Resultado da query por cargo:`, { 
            total: data?.length || 0, 
            error: error?.message,
            filtradoPorEmail: isCustomerSuccess && !!emailGestor
          });
          
          // Processar dados sem produto (Customer Success e Comercial não têm hierarquia)
          if (data) {
            const pessoasProcessadas = data.map((pessoa: any) => ({
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
              produto: produtoUpper as Produto,
              superior_id: null, // Sem hierarquia
              subordinados: []
            }));
            
            console.log(`✅ [BookOrganograma] ${pessoasProcessadas.length} pessoas encontradas para ${cargoFiltro}`);
            console.log(`📋 [BookOrganograma] Pessoas:`, pessoasProcessadas.map(p => `${p.nome} (${p.email})`));
            
            // Criar raiz virtual para agrupar
            if (pessoasProcessadas.length > 0) {
              const arvore = [{
                id: isCustomerSuccess ? 'root-cs' : 'root-comercial',
                nome: cargoFiltro,
                cargo: cargoFiltro as Cargo,
                departamento: 'Nível Superior',
                email: '',
                telefone: '',
                foto_url: '',
                ordem_exibicao: 0,
                created_at: '',
                updated_at: '',
                produto: produtoUpper as Produto,
                superior_id: null,
                subordinados: pessoasProcessadas
              }];
              console.log(`🌳 [BookOrganograma] Árvore criada com raiz virtual e ${pessoasProcessadas.length} subordinados`);
              setPessoas(arvore);
            } else {
              console.log(`⚠️ [BookOrganograma] Nenhuma pessoa encontrada, árvore vazia`);
              setPessoas([]);
            }
            setLoading(false);
            return;
          }
        } else {
          // Buscar por produto (COMEX, FISCAL, GALLERY)
          console.log(`📊 [BookOrganograma] Buscando por produto: ${produtoUpper}`);
          
          const result = await (supabase as any)
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
            .eq('organizacao_produto.produto', produtoUpper)
            .order('cargo', { ascending: true })
            .order('ordem_exibicao', { ascending: true })
            .order('nome', { ascending: true });
          
          data = result.data;
          error = result.error;
          
          console.log(`📊 [BookOrganograma] Resultado da query por produto:`, { 
            total: data?.length || 0, 
            error: error?.message 
          });
        }

        if (error) {
          console.error('❌ [BookOrganograma] Erro ao buscar organograma:', error);
          throw error;
        }

        console.log(`✅ [BookOrganograma] Dados recebidos: ${data?.length || 0} pessoas do produto`);

        // Processar dados - garantir que pegamos o produto correto
        const pessoasComProduto = (data || []).map((pessoa: any) => {
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

        // IMPORTANTE: Remover Customer Success que não são da empresa (para produtos hierárquicos)
        let pessoasFiltradas = pessoasComProduto;
        if (isProdutoHierarquico) {
          // Filtrar apenas pessoas que NÃO são Customer Success
          // (vamos adicionar o Customer Success correto depois)
          pessoasFiltradas = pessoasComProduto.filter(p => p.cargo !== 'Customer Success');
          console.log(`🔍 [BookOrganograma] Removidos ${pessoasComProduto.length - pessoasFiltradas.length} Customer Success genéricos`);
        }

        // Adicionar Customer Success às pessoas (se houver e for produto hierárquico)
        let customerSuccessParaAdicionar: any[] = [];
        if (isProdutoHierarquico && customerSuccessData.length > 0) {
          console.log(`➕ [BookOrganograma] Preparando Customer Success específico para adicionar ao organograma do produto ${produtoUpper}`);
          
          customerSuccessParaAdicionar = customerSuccessData.map((pessoa: any) => ({
            id: pessoa.id,
            nome: pessoa.nome,
            cargo: pessoa.cargo as Cargo,
            departamento: pessoa.departamento,
            email: pessoa.email,
            telefone: pessoa.telefone,
            foto_url: pessoa.foto_url,
            ordem_exibicao: 999, // Colocar no final da ordem
            created_at: pessoa.created_at,
            updated_at: pessoa.updated_at,
            produto: produtoUpper as Produto,
            superior_id: null, // Será definido na construção da árvore
            subordinados: [],
            isCustomerSuccess: true // Flag para identificar
          }));
          
          console.log(`✅ [BookOrganograma] Customer Success preparado: ${customerSuccessParaAdicionar[0].nome}`);
        }

        console.log(`📊 [BookOrganograma] Pessoas processadas:`, pessoasFiltradas.map((p: any) => ({ nome: p.nome, cargo: p.cargo, produto: p.produto })));

        // Construir árvore hierárquica (passando Customer Success separadamente)
        const arvore = construirArvore(pessoasFiltradas, customerSuccessParaAdicionar);
        console.log(`🌳 [BookOrganograma] Árvore construída com ${arvore.length} raízes`);
        setPessoas(arvore);
      } catch (error) {
        console.error('❌ [BookOrganograma] Erro ao buscar organograma:', error);
        setPessoas([]);
      } finally {
        setLoading(false);
      }
    };

    buscarOrganograma();
  }, [produto, empresaId]);

  // Função para construir árvore hierárquica
  const construirArvore = (pessoas: PessoaComSubordinados[], customerSuccess: any[] = []): PessoaComSubordinados[] => {
    console.log(`🔨 [construirArvore] Iniciando com ${pessoas.length} pessoas`);
    console.log(`📋 [construirArvore] Pessoas:`, pessoas.map(p => ({ 
      nome: p.nome, 
      cargo: p.cargo, 
      superior_id: p.superior_id,
      tem_superior: !!p.superior_id
    })));
    
    if (customerSuccess.length > 0) {
      console.log(`👤 [construirArvore] Customer Success para adicionar: ${customerSuccess[0].nome}`);
    }
    
    const pessoasPorId = new Map<string, PessoaComSubordinados>();
    
    // Criar mapa de pessoas
    pessoas.forEach(pessoa => {
      pessoasPorId.set(pessoa.id, { ...pessoa, subordinados: [] });
    });

    const raizes: PessoaComSubordinados[] = [];
    
    // Separar Central Escalação para tratamento especial
    const centraisEscalacao = pessoas.filter(p => p.cargo === 'Central Escalação');
    const outrasPessoas = pessoas.filter(p => p.cargo !== 'Central Escalação');

    console.log(`📊 [construirArvore] Centrais Escalação: ${centraisEscalacao.length}`);
    console.log(`📊 [construirArvore] Outras pessoas: ${outrasPessoas.length}`);

    // Construir hierarquia normal (sem Central Escalação)
    outrasPessoas.forEach(pessoa => {
      const pessoaComSubordinados = pessoasPorId.get(pessoa.id)!;
      
      if (pessoa.superior_id) {
        const superior = pessoasPorId.get(pessoa.superior_id);
        if (superior) {
          superior.subordinados = superior.subordinados || [];
          superior.subordinados.push(pessoaComSubordinados);
          console.log(`  ↳ ${pessoa.nome} (${pessoa.cargo}) → subordinado de ${superior.nome}`);
        } else {
          // Superior não encontrado neste produto, adicionar como raiz
          console.log(`  ⚠️ ${pessoa.nome} (${pessoa.cargo}) - Superior ${pessoa.superior_id} não encontrado, adicionando como raiz`);
          raizes.push(pessoaComSubordinados);
        }
      } else {
        // Sem superior, é raiz
        console.log(`  🌳 ${pessoa.nome} (${pessoa.cargo}) - É RAIZ (sem superior_id)`);
        raizes.push(pessoaComSubordinados);
      }
    });
    
    console.log(`🌳 [construirArvore] Total de raízes encontradas: ${raizes.length}`);
    console.log(`📋 [construirArvore] Raízes:`, raizes.map(r => ({ nome: r.nome, cargo: r.cargo })));
    
    // Ordenar subordinados por ordem_exibicao e nome
    const ordenarSubordinados = (pessoa: PessoaComSubordinados) => {
      if (pessoa.subordinados && pessoa.subordinados.length > 0) {
        pessoa.subordinados.sort((a, b) => {
          // Primeiro por ordem_exibicao
          const ordemA = a.ordem_exibicao || 999;
          const ordemB = b.ordem_exibicao || 999;
          if (ordemA !== ordemB) {
            return ordemA - ordemB;
          }
          // Depois por nome
          return a.nome.localeCompare(b.nome, 'pt-BR');
        });
        
        // Ordenar recursivamente
        pessoa.subordinados.forEach(ordenarSubordinados);
      }
    };

    // Adicionar Central Escalação de forma centralizada
    if (centraisEscalacao.length > 0) {
      centraisEscalacao.forEach(central => {
        // Filtrar coordenadores deste produto específico
        const coordenadoresProduto = outrasPessoas.filter(p => p.cargo === 'Coordenador');
        
        if (coordenadoresProduto.length > 0) {
          console.log(`📊 Coordenadores encontrados (${coordenadoresProduto.length}):`, 
            coordenadoresProduto.map((c, i) => `[${i}] ${c.nome} (ordem: ${c.ordem_exibicao || 'N/A'})`)
          );
          
          // Calcular índice do coordenador mais central (para Central Escalação)
          const indiceMeio = Math.floor((coordenadoresProduto.length - 1) / 2);
          const coordenadorCentral = pessoasPorId.get(coordenadoresProduto[indiceMeio].id);
          
          // Último coordenador da direita (para Customer Success)
          const ultimoCoordenador = pessoasPorId.get(coordenadoresProduto[coordenadoresProduto.length - 1].id);
          
          console.log(`🎯 Coordenador central (índice ${indiceMeio}): ${coordenadorCentral?.nome}`);
          console.log(`🎯 Último coordenador (índice ${coordenadoresProduto.length - 1}): ${ultimoCoordenador?.nome}`);
          
          // Adicionar Central Escalação ao coordenador central
          if (coordenadorCentral) {
            const centralComSub: PessoaComSubordinados = {
              ...central,
              subordinados: []
            };
            
            coordenadorCentral.subordinados = coordenadorCentral.subordinados || [];
            coordenadorCentral.subordinados.push(centralComSub);
            console.log(`✅ Central Escalação "${central.nome}" adicionado ao coordenador central "${coordenadorCentral.nome}"`);
          }
          
          // Adicionar Customer Success ao último coordenador da direita
          if (ultimoCoordenador && customerSuccess.length > 0) {
            customerSuccess.forEach(cs => {
              const csComSub: PessoaComSubordinados = {
                ...cs,
                subordinados: [],
                isCustomerSuccess: true // Flag para ocultar linha
              };
              
              ultimoCoordenador.subordinados = ultimoCoordenador.subordinados || [];
              ultimoCoordenador.subordinados.push(csComSub);
              console.log(`✅ Customer Success "${cs.nome}" adicionado ao último coordenador "${ultimoCoordenador.nome}"`);
            });
          }
        }
      });
    }
    
    // Ordenar raízes
    raizes.sort((a, b) => {
      const ordemA = a.ordem_exibicao || 999;
      const ordemB = b.ordem_exibicao || 999;
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
    
    // Ordenar subordinados de todas as raízes
    raizes.forEach(ordenarSubordinados);

    console.log(`✅ [construirArvore] Árvore final: ${raizes.length} raízes`);
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
    
    // Customer Success e Comercial não têm hierarquia, usar zoom maior
    if (produtoUpper === 'CUSTOMER SUCCESS' || produtoUpper === 'CUSTOMER_SUCCESS' || produtoUpper === 'COMERCIAL') {
      return 0.85;
    }
    
    switch (produtoUpper) {
      case 'FISCAL':
        return 0.75; // Zoom menor para Fiscal (mais pessoas)
      case 'COMEX':
        return 0.75; // Zoom médio para Comex
      case 'GALLERY':
        return 0.78; // Zoom maior para Gallery
      default:
        return 0.78; // Zoom padrão
    }
  };

  const zoomInicial = getZoomPorProduto();
  
  // Calcular centerOffset específico por produto para centralizar coordenadores
  const getCenterOffsetPorProduto = () => {
    const produtoUpper = produto.toUpperCase();
    
    // Customer Success e Comercial não precisam de ajuste
    if (produtoUpper === 'CUSTOMER SUCCESS' || produtoUpper === 'CUSTOMER_SUCCESS' || produtoUpper === 'COMERCIAL') {
      return 0;
    }
    
    // Contar coordenadores no produto
    const coordenadores = pessoas.flatMap(p => 
      p.subordinados?.filter(s => s.cargo === 'Coordenador') || []
    );
    const numCoordenadores = coordenadores.length;
    
    console.log(`📐 [getCenterOffset] Produto: ${produtoUpper}, Coordenadores: ${numCoordenadores}`);
    
    // Ajuste para centralizar baseado no número de coordenadores
    switch (produtoUpper) {
      case 'GALLERY':
        // Gallery tem 3 coordenadores, precisa de ajuste para centralizar
        return numCoordenadores === 3 ? -210 : 0; // Deslocar para a esquerda
      case 'COMEX':
        // Comex geralmente tem 4 coordenadores, já fica centralizado
        return 0;
      case 'FISCAL':
        // Fiscal geralmente tem mais coordenadores, já fica centralizado
        return 0;
      default:
        return 0;
    }
  };
  
  const centerOffset = getCenterOffsetPorProduto();
  
  // Formatar nome do produto para exibição
  const formatarNomeProduto = () => {
    const produtoUpper = produto.toUpperCase();
    if (produtoUpper === 'CUSTOMER SUCCESS' || produtoUpper === 'CUSTOMER_SUCCESS') {
      return 'Customer Success';
    }
    if (produtoUpper === 'COMERCIAL') {
      return 'Comercial';
    }
    return produto.charAt(0).toUpperCase() + produto.slice(1).toLowerCase();
  };

  return (
    <div key={`org-container-${produto}`} className="w-full h-full bg-white p-8" data-organograma={produto}>
      <div className="space-y-6">
        {/* Título da Seção */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Organograma {formatarNomeProduto()} <span className="text-blue-600">{empresaNome || 'RAINBOW'}</span>
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
            centerOffset={centerOffset} // Ajuste específico por produto para centralizar
            height={1100} // Altura aumentada para ocupar toda a página
            initialZoom={zoomInicial} // Zoom específico por produto
            isFiltered={true} // Sempre filtrado por produto específico no book
          />
        </div>
      </div>
    </div>
  );
}
