/**
 * BookOrganogramaComercialCS - Aba de organograma Comercial/Customer Success no book
 * Busca a árvore hierárquica completa dos produtos CUSTOMER_SUCCESS e COMERCIAL
 * Filtra CS pelo email_gestor e Comercial pelo email_comercial da empresa
 * Exibe hierarquia completa: Diretor → Gerente → Coordenador → CS/Comercial
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { OrganoTree } from '@/components/admin/organograma/OrganoTree';
import { supabase } from '@/integrations/supabase/client';
import type { PessoaComSubordinados, Cargo, Produto } from '@/types/organograma';

interface BookOrganogramaComercialCSProps {
  empresaId: string;
  empresaNome: string;
}

export default function BookOrganogramaComercialCS({ empresaId, empresaNome }: BookOrganogramaComercialCSProps) {
  const { t } = useTranslation();
  const [pessoas, setPessoas] = useState<PessoaComSubordinados[]>([]);
  const [pessoasTM, setPessoasTM] = useState<PessoaComSubordinados[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const buscarOrganograma = async () => {
      try {
        setLoading(true);

        // Buscar emails da empresa
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas_clientes')
          .select('email_gestor, email_comercial, email_tm')
          .eq('id', empresaId)
          .single();

        if (empresaError) {
          console.error('❌ [BookOrgComercialCS] Erro ao buscar empresa:', empresaError);
          setPessoas([]);
          setPessoasTM([]);
          return;
        }

        const emailGestor = empresaData?.email_gestor;
        const emailComercial = (empresaData as any)?.email_comercial;
        const emailTm = (empresaData as any)?.email_tm;

        console.log(`📧 [BookOrgComercialCS] Email CS: ${emailGestor || 'N/A'}`);
        console.log(`📧 [BookOrgComercialCS] Email Comercial: ${emailComercial || 'N/A'}`);
        console.log(`📧 [BookOrgComercialCS] Email T&M: ${emailTm || 'N/A'}`);

        // Buscar TODAS as pessoas dos produtos CUSTOMER_SUCCESS, COMERCIAL e T_M com hierarquia
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
          .in('organizacao_produto.produto', ['CUSTOMER_SUCCESS', 'COMERCIAL', 'T_M'])
          .order('cargo', { ascending: true })
          .order('ordem_exibicao', { ascending: true })
          .order('nome', { ascending: true });

        if (pessoasError) {
          console.error('❌ [BookOrgComercialCS] Erro ao buscar pessoas:', pessoasError);
          setPessoas([]);
          setPessoasTM([]);
          return;
        }

        // Processar dados
        const pessoasRaw: PessoaComSubordinados[] = (pessoasData || []).map((pessoa: any) => {
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

        // Deduplicar pessoas (pode vir duplicada por ter múltiplos produtos)
        const pessoasMap = new Map<string, PessoaComSubordinados>();
        pessoasRaw.forEach(pessoa => {
          if (!pessoasMap.has(pessoa.id)) {
            pessoasMap.set(pessoa.id, pessoa);
          }
        });
        const todasPessoas = Array.from(pessoasMap.values());

        console.log(`📊 [BookOrgComercialCS] Total pessoas encontradas: ${todasPessoas.length}`);

        // Filtrar: manter toda a hierarquia (Diretor, Gerente, Coordenador)
        // mas para CS, Comercial e T&M, mostrar apenas os vinculados à empresa
        const pessoasFiltradas = todasPessoas.filter((pessoa) => {
          // Manter todos os níveis hierárquicos (Diretor, Gerente, Coordenador, Central Escalação)
          if (pessoa.cargo !== 'Customer Success' && pessoa.cargo !== 'Comercial' && pessoa.cargo !== 'T&M') {
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
          // T&M: filtrar pelo email_tm
          if (pessoa.cargo === 'T&M') {
            return emailTm && pessoa.email?.toLowerCase() === emailTm.toLowerCase();
          }
          return false;
        });

        console.log(`📊 [BookOrgComercialCS] Pessoas após filtro: ${pessoasFiltradas.length}`);

        // Construir árvore hierárquica (sem T&M, que fica separado)
        const pessoasSemTM = pessoasFiltradas.filter(p => p.cargo !== 'T&M');
        const pessoasTMFiltradas = pessoasFiltradas.filter(p => p.cargo === 'T&M');
        
        const arvore = construirArvore(pessoasSemTM);
        console.log(`🌳 [BookOrgComercialCS] Árvore construída com ${arvore.length} raízes`);
        console.log(`🌳 [BookOrgComercialCS] Pessoas T&M separadas: ${pessoasTMFiltradas.length}`);
        setPessoas(arvore);
        setPessoasTM(pessoasTMFiltradas);
      } catch (error) {
        console.error('❌ [BookOrgComercialCS] Erro:', error);
        setPessoas([]);
        setPessoasTM([]);
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

    // Separar cargos independentes (CS, Comercial) que vão como subordinados do coordenador
    const cargosIndependentes = pessoasList.filter(p => 
      p.cargo === 'Customer Success' || p.cargo === 'Comercial'
    );
    const cargosHierarquicos = pessoasList.filter(p => 
      p.cargo !== 'Customer Success' && p.cargo !== 'Comercial'
    );

    // Construir árvore hierárquica normal (Diretor, Gerente, Coordenador)
    cargosHierarquicos.forEach(pessoa => {
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

    // Adicionar cargos independentes (CS, Comercial) como subordinados do coordenador
    cargosIndependentes.forEach(pessoa => {
      const pessoaComSub = pessoasMap.get(pessoa.id)!;

      if (pessoa.superior_id) {
        const superior = pessoasMap.get(pessoa.superior_id);
        if (superior) {
          superior.subordinados = superior.subordinados || [];
          superior.subordinados.push(pessoaComSub);
        } else {
          const coordenador = cargosHierarquicos.find(p => p.cargo === 'Coordenador');
          if (coordenador) {
            const coordNode = pessoasMap.get(coordenador.id)!;
            coordNode.subordinados = coordNode.subordinados || [];
            coordNode.subordinados.push(pessoaComSub);
          } else {
            raizes.push(pessoaComSub);
          }
        }
      } else {
        const coordenador = cargosHierarquicos.find(p => p.cargo === 'Coordenador');
        if (coordenador) {
          const coordNode = pessoasMap.get(coordenador.id)!;
          coordNode.subordinados = coordNode.subordinados || [];
          coordNode.subordinados.push(pessoaComSub);
        } else {
          raizes.push(pessoaComSub);
        }
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

  if (pessoas.length === 0 && pessoasTM.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Nenhum Comercial/Customer Success/T&M vinculado</p>
          <p className="text-gray-400 text-sm mt-2">
            Configure os emails no Cadastro de Empresa para vincular.
          </p>
        </div>
      </div>
    );
  }

  // T&M NÃO é adicionado na árvore - será renderizado como card separado posicionado
  // para não afetar o posicionamento/centralização dos outros nós

  return (
    <div className="h-full w-full overflow-auto">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-1">
          {t('books.organogramaComercialTitle')} <span className="text-sonda-blue">{empresaNome}</span>
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {t('books.organogramaComercialSubtitle')}
        </p>
      </div>
      <div className="relative">
        <OrganoTree 
          pessoas={pessoas} 
          onEdit={() => {}} 
          onDelete={() => {}}
          isFiltered={true}
          viewOnly={true}
        />
        {/* Card T&M posicionado no canto direito, alinhado com o nível 4 */}
        {pessoasTM.length > 0 && (
          <div className="absolute right-[120px]" style={{ top: '505px' }}>
            {pessoasTM.map(pessoa => (
              <div 
                key={pessoa.id}
                className="flex flex-col items-center space-y-1 bg-white rounded-lg"
                style={{ width: '480px', transform: 'scale(0.7)', transformOrigin: 'top right' }}
              >
                {/* Foto */}
                <div>
                  {pessoa.foto_url ? (
                    <div
                      className="relative h-28 w-28 rounded-full"
                      style={{ flexShrink: 0 }}
                    >
                      <div className="h-full w-full rounded-full overflow-hidden">
                        <img
                          src={pessoa.foto_url}
                          alt={pessoa.nome}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          borderWidth: '4px',
                          borderStyle: 'solid',
                          borderColor: '#9ca3af',
                          zIndex: 10,
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-28 w-28 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-400">
                      <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="text-center w-full px-2 flex flex-col">
                  {/* Nível */}
                  <div className="text-center">
                    <span className="text-base font-bold tracking-wide text-blue-600">
                      {t('books.escalationLevel', { level: 4 })}
                    </span>
                  </div>

                  {/* Nome */}
                  <h3 className="text-xl font-bold leading-tight min-h-[28px] text-black whitespace-nowrap">
                    {pessoa.nome}
                  </h3>

                  {/* Cargo com imagem de fundo */}
                  <div className="relative inline-block min-h-[20px]">
                    <div 
                      className="absolute inset-0"
                      style={{
                        backgroundImage: 'url(/images/fundo_organograma.png)',
                        backgroundSize: '100% 100%',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        opacity: 1,
                      }}
                    />
                    <p className="text-base font-bold text-white relative z-10 px-4 py-1">
                      {pessoa.cargo}
                    </p>
                  </div>

                  {/* Email */}
                  <div className="text-base font-bold text-black min-h-[20px]">
                    {pessoa.email}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
