import { useState, useCallback } from 'react';
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
  onDelete?: () => void; // Callback após exclusão bem-sucedida
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
    produtos?: string; // Convertido para string (JSON)
    produto?: string;
    superior_id?: string;
  };
  children?: TreeNode[];
}

export function OrganoTree({ pessoas, onEdit, onDelete }: OrganoTreeProps) {
  const { toast } = useToast();
  const { deletarPessoa } = useOrganograma();
  const [pessoaParaDeletar, setPessoaParaDeletar] = useState<string | null>(null);
  const [translate] = useState({ x: 0, y: 0 });

  // Converter estrutura de dados para formato do react-d3-tree
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

  // Cores dos produtos
  const coresProdutos = {
    'COMEX': '#2563eb',     // Azul
    'FISCAL': '#03fefe',    // Ciano
    'GALLERY': '#e91f81',   // Rosa
  };

  // Gerar estilo de borda baseado nos produtos
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

    // Gradiente cônico (circular) começando do topo
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

  // Renderizar nó customizado
  const renderCustomNode = useCallback(({ nodeDatum, hierarchyPointNode }: any) => {
    const pessoa = nodeDatum.attributes;
    // Converter produtos de volta para array
    const produtos = pessoa?.produtos ? JSON.parse(pessoa.produtos) : undefined;
    const produto = pessoa?.produto;
    const usaGradiente = produtos && produtos.length > 1;
    
    // Calcular nível de escalação (depth do nó)
    const nivel = hierarchyPointNode?.depth || 0;
    const nivelTexto = nivel === 0 ? '1º NÍVEL DE ESCALAÇÃO' : 
                       nivel === 1 ? '2º NÍVEL DE ESCALAÇÃO' : 
                       nivel === 2 ? '3º NÍVEL DE ESCALAÇÃO' : 
                       nivel === 3 ? '4º NÍVEL DE ESCALAÇÃO' :
                       `${nivel + 1}º NÍVEL DE ESCALAÇÃO`;

    // Determinar imagem de fundo baseado no cargo e produto
    const getFundoOrganograma = () => {
      const cargo = pessoa?.cargo;
      const produtosArray = produtos || (produto ? [produto] : []);
      
      // Diretor: sempre usa fundo padrão
      if (cargo === 'Diretor') {
        return '/images/fundo_organograma.png';
      }
      
      // Gerente: sempre usa fundo de gerente (independente do produto)
      if (cargo === 'Gerente') {
        return '/images/fundo_organograma_gerente.png';
      }
      
      // Coordenador com mais de um produto
      if (cargo === 'Coordenador' && produtosArray.length > 1) {
        return '/images/fundo_organograma_gerente.png';
      }
      
      // Coordenador com produto específico
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
      
      // Padrão
      return '/images/fundo_organograma.png';
    };

    const fundoImagem = getFundoOrganograma();

    // Determinar cor do texto do departamento
    const getCorTextoDepartamento = () => {
      const cargo = pessoa?.cargo;
      const produtosArray = produtos || (produto ? [produto] : []);
      
      // Diretor OU Central Escalação: texto branco
      if (cargo === 'Diretor' || cargo === 'Central Escalação') {
        return 'text-white';
      }
      
      // Gerente: sempre texto cinza escuro (preto)
      if (cargo === 'Gerente') {
        return 'text-gray-700';
      }
      
      // Coordenador com produto COMEX ou GALLERY: texto branco
      if (cargo === 'Coordenador' && produtosArray.length === 1) {
        const produtoUnico = produtosArray[0];
        if (produtoUnico === 'COMEX' || produtoUnico === 'GALLERY') {
          return 'text-white';
        }
      }
      
      // Padrão: texto cinza escuro
      return 'text-gray-700';
    };

    const corTextoDepartamento = getCorTextoDepartamento();
    return (
      <g>
        <foreignObject x="-225" y="-180" width="450" height="360">
          {/* Card invisível para conexão das linhas */}
          <Card className="w-full h-full border-transparent shadow-none bg-transparent">
            <CardContent className="p-4">
              <div className="flex flex-col items-center space-y-3 bg-white rounded-lg p-4">
                {/* Foto com borda colorida por produto */}
                <div className="relative">
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

                {/* Informações - altura fixa para alinhamento */}
                <div className="text-center w-full px-4 min-h-[180px] flex flex-col">
                  {/* Texto do Nível - ACIMA DO NOME */}
                  <div className="text-center">
                    <span className={`text-sm font-bold tracking-wide ${
                      nivel >= 2 ? 'text-blue-600' : 'text-gray-800'
                    }`}>
                      {nivelTexto}
                    </span>
                  </div>

                  {/* Nome - cor baseada no nível, pode quebrar em múltiplas linhas */}
                  <h3 className={`text-lg font-bold leading-tight min-h-[28px] ${
                    nivel >= 2 ? 'text-black' : 'text-blue-600'
                  }`}>
                    {nodeDatum.name}
                  </h3>
                  
                  {/* Cargo com fundo cinza 
                  <div className="flex justify-center">
                    <div className="inline-block px-6 py-1.5 bg-gray-300 rounded-full">
                      <span className="text-sm font-semibold text-gray-800">
                        {pessoa?.cargo}
                      </span>
                    </div>
                  </div>*/}

                  {/* Departamento com imagem de fundo */}
                  <div className="relative inline-block min-h-[20px]">
                    {/* Imagem de fundo dinâmica */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${fundoImagem})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 1, // Opacidade total para cores vibrantes
                      }}
                    />
                    {/* Texto do departamento com cor dinâmica */}
                    <p className={`text-sm font-bold ${corTextoDepartamento} relative z-10 px-4 py-1`}>
                      {pessoa?.departamento}
                    </p>
                  </div>

                  {/* Email em preto e negrito */}
                  <div className="text-sm font-bold text-black min-h-[20px]">
                    {pessoa?.email}
                  </div>

                  {/* Telefone em preto e negrito */}
                  <div className="text-sm font-bold text-black min-h-[20px]">
                    {pessoa?.telefone || '\u00A0'}
                  </div>

                  {/* Botões de Ação - sempre no final */}
                  <div className="flex gap-2 justify-center mt-auto pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 bg-white hover:bg-gray-100"
                      onClick={() => {
                        const pessoaCompleta: PessoaComSubordinados = {
                          id: pessoa.id,
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
                      onClick={() => setPessoaParaDeletar(pessoa.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </foreignObject>
      </g>
    );
  }, [onEdit]);

  const handleDelete = async () => {
    if (!pessoaParaDeletar) return;

    try {
      await deletarPessoa(pessoaParaDeletar);
      toast({
        title: 'Sucesso!',
        description: 'Pessoa excluída com sucesso.',
      });
      setPessoaParaDeletar(null);
      
      // Recarregar dados após exclusão
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
      <div className="w-full h-[800px] border rounded-lg bg-white">
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="step"
          translate={translate}
          nodeSize={{ x: 500, y: 400 }}
          separation={{ siblings: 1.2, nonSiblings: 1.5 }}
          renderCustomNodeElement={renderCustomNode}
          pathClassFunc={() => 'stroke-black stroke-2 fill-none [stroke-dasharray:5,5]'}
          zoom={0.7}
          scaleExtent={{ min: 0.3, max: 2 }}
          enableLegacyTransitions
          depthFactor={400}
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
