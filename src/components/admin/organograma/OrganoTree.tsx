import { useState, useCallback, useEffect } from 'react';
import Tree from 'react-d3-tree';
import { Edit, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useOrganograma } from '@/hooks/useOrganograma';
import type { PessoaComSubordinados } from '@/types/organograma';

interface OrganoTreeProps {
  pessoas: PessoaComSubordinados[];
  onEdit: (pessoa: PessoaComSubordinados) => void;
  onDelete?: () => void;
  viewOnly?: boolean;
  centerOffset?: number;
  height?: number;
  initialZoom?: number;
  isFiltered?: boolean;
}

interface TreeNode {
  name: string;
  attributes?: {
    id: string;
    cargo: string;
    departamento: string;
    email: string;
    telefone?: string;
    foto_url?: string;
    produtos?: string;
    produto?: string;
    superior_id?: string;
  };
  children?: TreeNode[];
}

export function OrganoTree({ pessoas, onEdit, onDelete, viewOnly = false, centerOffset = 0, height = 800, initialZoom = 0.7, isFiltered = false }: OrganoTreeProps) {
  const { toast } = useToast();
  const { deletarPessoa } = useOrganograma();
  const [pessoaParaDeletar, setPessoaParaDeletar] = useState<string | null>(null);
  
  const [translate, setTranslate] = useState({ x: 0, y: 100 });
  
  useEffect(() => {
    const container = document.querySelector('.rd3t-tree-container');
    if (container) {
      const width = container.clientWidth;
      const yPosition = viewOnly ? 120 : 100;
      setTranslate({ x: (width / 2) + centerOffset, y: yPosition });
    }
  }, [centerOffset, viewOnly]);

  const convertToTreeData = (pessoas: PessoaComSubordinados[]): TreeNode[] => {
    return pessoas.map(pessoa => ({
      name: pessoa.nome,
      attributes: {
        id: pessoa.id,
        cargo: pessoa.cargo,
        departamento: pessoa.departamento,
        email: pessoa.email,
        telefone: pessoa.telefone,
        foto_url: pessoa.foto_url,
        produtos: pessoa.produtos ? JSON.stringify(pessoa.produtos) : undefined,
        produto: pessoa.produto,
        superior_id: pessoa.superior_id,
      },
      children: pessoa.subordinados ? convertToTreeData(pessoa.subordinados) : undefined,
    }));
  };

  const treeData = convertToTreeData(pessoas);

  const coresProdutos = {
    'COMEX': '#2563eb',
    'FISCAL': '#03fefe',
    'GALLERY': '#e91f81',
  };

  const getBorderStyle = (produtos?: string[], produto?: string) => {
    const produtosArray = produtos || (produto ? [produto] : []);
    
    if (!produtosArray || produtosArray.length === 0) {
      return 'border-4 border-gray-300';
    }

    if (produtosArray.length === 1) {
      return `border-4`;
    }

    return 'border-4 border-transparent';
  };

  const getGradientStyle = (produtos?: string[], produto?: string) => {
    const produtosArray = produtos || (produto ? [produto] : []);
    
    if (!produtosArray || produtosArray.length <= 1) {
      const cor = produtosArray[0] ? coresProdutos[produtosArray[0] as keyof typeof coresProdutos] : '#d1d5db';
      return { borderColor: cor };
    }

    const cores = produtosArray.map(
      (p) => coresProdutos[p as keyof typeof coresProdutos]
    );

    const angulo = 360 / cores.length;
    const gradiente = cores
      .map((cor, i) => {
        const inicio = i * angulo;
        const fim = (i + 1) * angulo;
        return `${cor} ${inicio}deg ${fim}deg`;
      })
      .join(', ');

    return {
      background: `
        linear-gradient(#fff, #fff) padding-box,
        conic-gradient(from -90deg, ${gradiente}) border-box
      `,
    };
  };

  const renderCustomNode = useCallback(({ nodeDatum, hierarchyPointNode }: any) => {
    const pessoa = nodeDatum.attributes;
    const produtos = pessoa?.produtos ? JSON.parse(pessoa.produtos) : undefined;
    const produto = pessoa?.produto;
    const usaGradiente = produtos && produtos.length > 1;
    
    const nivel = hierarchyPointNode?.depth || 0;
    const nivelTexto = nivel === 0 ? '1º NÍVEL DE ESCALAÇÃO' : 
                       nivel === 1 ? '2º NÍVEL DE ESCALAÇÃO' : 
                       nivel === 2 ? '3º NÍVEL DE ESCALAÇÃO' : 
                       nivel === 3 ? '4º NÍVEL DE ESCALAÇÃO' :
                       `${nivel + 1}º NÍVEL DE ESCALAÇÃO`;

    const isCentralPriorizacao = pessoa?.cargo === 'Central Escalação' || nivel === 3;
    
    let numCoordenadores = 0;
    if (isCentralPriorizacao && hierarchyPointNode?.parent?.parent?.children) {
      numCoordenadores = hierarchyPointNode.parent.parent.children.length;
    }
    
    const ehNumeroPar = numCoordenadores % 2 === 0;
    const marginLeft = isFiltered && isCentralPriorizacao && ehNumeroPar ? 210 : 0;

    const getFundoOrganograma = () => {
      const cargo = pessoa?.cargo;
      const produtosArray = produtos || (produto ? [produto] : []);
      
      if (cargo === 'Diretor') {
        return '/images/fundo_organograma.png';
      }
      
      if (cargo === 'Gerente') {
        return '/images/fundo_organograma_gerente.png';
      }
      
      if (cargo === 'Coordenador' && produtosArray.length > 1) {
        return '/images/fundo_organograma_gerente.png';
      }
      
      if (cargo === 'Coordenador' && produtosArray.length === 1) {
        const produtoUnico = produtosArray[0];
        if (produtoUnico === 'FISCAL') {
          return '/images/fundo_organograma_coordenador_fiscal.png';
        }
        if (produtoUnico === 'COMEX') {
          return '/images/fundo_organograma_coordenador_comex.png';
        }
        if (produtoUnico === 'GALLERY') {
          return '/images/fundo_organograma_coordenador_gallery.png';
        }
      }
      
      return '/images/fundo_organograma.png';
    };

    const fundoImagem = getFundoOrganograma();

    const getCorTextoDepartamento = () => {
      const cargo = pessoa?.cargo;
      const produtosArray = produtos || (produto ? [produto] : []);
      
      if (cargo === 'Diretor' || cargo === 'Central Escalação') {
        return 'text-white';
      }
      
      if (cargo === 'Gerente') {
        return 'text-gray-700';
      }
      
      if (cargo === 'Coordenador' && produtosArray.length === 1) {
        const produtoUnico = produtosArray[0];
        if (produtoUnico === 'COMEX' || produtoUnico === 'GALLERY') {
          return 'text-white';
        }
      }
      
      return 'text-gray-700';
    };

    const corTextoDepartamento = getCorTextoDepartamento();

    
    return (
      <g>
        <foreignObject 
          x={-225 + marginLeft} 
          y="-120" 
          width="420" 
          height="350"
        > 
          <Card className="w-full h-full border-transparent shadow-none bg-transparent" style={{ overflow: 'visible'}}>
            <CardContent className="p-0" style={{ overflow: 'visible' }}>
              <div className="flex flex-col items-center space-y-3 bg-white rounded-lg" style={{ overflow: 'visible' }}>
                <div className={`relative ${isCentralPriorizacao ? 'p-6' : ''}`} style={isCentralPriorizacao ? { overflow: 'visible' } : undefined}>
                  {usaGradiente ? (
                    <div
                      className="rounded-full"
                      style={{
                        ...getGradientStyle(produtos, produto),
                        width: 96,
                        height: 96,
                        border: '4px solid transparent',
                      }}
                    >
                      <div className="h-full w-full rounded-full overflow-hidden">
                        {pessoa?.foto_url ? (
                          <img
                            src={pessoa.foto_url}
                            alt={nodeDatum.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                            <User className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {pessoa?.foto_url ? (
                        <img
                          src={pessoa.foto_url}
                          alt={nodeDatum.name}
                          className={`h-24 w-24 rounded-full object-cover ${getBorderStyle(produtos, produto)}`}
                          style={getGradientStyle(produtos, produto)}
                        />
                      ) : (
                        <div 
                          className={`h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center ${getBorderStyle(produtos, produto)}`}
                          style={getGradientStyle(produtos, produto)}
                        >
                          <User className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className={`text-center w-full px-4 flex flex-col ${viewOnly ? 'min-h-[80px]' : 'min-h-[180px]'}`}>
                  <div className="text-center">
                    <span className={`text-sm font-bold tracking-wide ${
                      nivel >= 2 ? 'text-blue-600' : 'text-gray-800'
                    }`}>
                      {nivelTexto}
                    </span>
                  </div>

                  <h3 className={`text-lg font-bold leading-tight min-h-[28px] ${
                    nivel >= 2 ? 'text-black' : 'text-blue-600'
                  }`}>
                    {nodeDatum.name}
                  </h3>

                  <div className="relative inline-block min-h-[20px]">
                    <div 
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${fundoImagem})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 1,
                      }}
                    />
                    <p className={`text-sm font-bold ${corTextoDepartamento} relative z-10 px-4 py-1`}>
                      {pessoa?.departamento}
                    </p>
                  </div>

                  <div className="text-sm font-bold text-black min-h-[20px]">
                    {pessoa?.email}
                  </div>

                  {!viewOnly && (
                    <div className="text-sm font-bold text-black min-h-[20px]">
                      {pessoa?.telefone || '\u00A0'}
                    </div>
                  )}

                  {!viewOnly && (
                    <div className="flex gap-2 justify-center mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 bg-white hover:bg-gray-100"
                        onClick={() => {
                          const idReal = pessoa.id.includes('_') ? pessoa.id.split('_')[0] : pessoa.id;
                          
                          const pessoaCompleta: PessoaComSubordinados = {
                            id: idReal,
                            nome: nodeDatum.name,
                            cargo: pessoa.cargo,
                            departamento: pessoa.departamento,
                            email: pessoa.email,
                            telefone: pessoa.telefone,
                            foto_url: pessoa.foto_url,
                            produtos: produtos,
                            produto: pessoa.produto,
                            superior_id: pessoa.superior_id,
                            created_at: '',
                            updated_at: '',
                          };
                          onEdit(pessoaCompleta);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800 bg-white hover:bg-gray-100"
                        onClick={() => {
                          const idReal = pessoa.id.includes('_') ? pessoa.id.split('_')[0] : pessoa.id;
                          setPessoaParaDeletar(idReal);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </foreignObject>
      </g>
    );
  }, [onEdit, isFiltered, viewOnly]);


  const handleDelete = async () => {
    if (!pessoaParaDeletar) return;

    try {
      await deletarPessoa(pessoaParaDeletar);
      toast({
        title: 'Sucesso!',
        description: 'Pessoa excluída com sucesso.',
      });
      setPessoaParaDeletar(null);
      
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Erro ao deletar pessoa:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir pessoa',
        variant: 'destructive',
      });
    }
  };

  if (pessoas.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2 font-medium">
            Nenhuma pessoa cadastrada
          </p>
          <p className="text-sm text-gray-400">
            Adicione pessoas para visualizar o organograma
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full bg-white relative" style={{ height: `${height}px`, overflow: 'visible' }}>       
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="step"
          translate={translate}
          nodeSize={{ x: 420, y: 320 }}
          separation={{ siblings: 0.9, nonSiblings: 1.1 }}
          renderCustomNodeElement={renderCustomNode}
          pathClassFunc={(link: any) => {
            const isLinkToCentral = link.target?.data?.attributes?.cargo === 'Central Escalação' || 
                                   link.target?.depth === 3;
            
            if (isFiltered && isLinkToCentral) {
              const numCoordenadores = link.source?.parent?.children?.length || 0;
              const ehNumeroPar = numCoordenadores % 2 === 0;
              
              if (ehNumeroPar) {
                return 'stroke-black stroke-2 fill-none [stroke-dasharray:5,5] [transform:translateX(210px)]';
              }
            }
            
            return 'stroke-black stroke-2 fill-none [stroke-dasharray:5,5]';
          }}
          zoom={initialZoom}
          scaleExtent={{ min: 0.4, max: 2 }}
          enableLegacyTransitions
          depthFactor={370}
        />
      </div>

      <AlertDialog open={!!pessoaParaDeletar} onOpenChange={() => setPessoaParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-sonda-blue">
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              Tem certeza que deseja excluir esta pessoa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
