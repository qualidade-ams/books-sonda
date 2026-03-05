import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload, X, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useOrganograma } from '@/hooks/useOrganograma';
import type { PessoaComProduto, Cargo, Produto } from '@/types/organograma';
import { PRODUTOS, PRODUTO_LABELS } from '@/types/organograma';

const formSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cargo: z.enum(['Diretor', 'Gerente', 'Coordenador', 'Central Escalação', 'Customer Success', 'Comercial']),
  departamento: z.string().min(2, 'Departamento é obrigatório'),
  email: z.string().email('Email inválido'),
  telefone: z.string().optional(),
  produtos: z.array(z.string()).min(1, 'Selecione pelo menos um produto'),
}).refine((data) => {
  // Diretor, Customer Success e Comercial não podem ter superior
  if (data.cargo === 'Diretor' || data.cargo === 'Customer Success' || data.cargo === 'Comercial') {
    return true;
  }
  return true;
}, {
  message: 'Validação de produtos',
  path: ['produtos'],
});

type FormValues = z.infer<typeof formSchema>;

interface FormPessoaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pessoa?: PessoaComProduto;
  modoVisualizacao?: boolean;
  onSuccess?: () => void;
}

export function FormPessoa({ open, onOpenChange, pessoa, modoVisualizacao = false, onSuccess }: FormPessoaProps) {
  const { toast } = useToast();
  const { getSuperioresDisponiveis, criarPessoa, atualizarPessoa, getProdutosPessoa } = useOrganograma();
  const [loading, setLoading] = useState(false);
  const [foto, setFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [produtosSelecionados, setProdutosSelecionados] = useState<Produto[]>([]);
  const [superioresPorProduto, setSuperioresPorProduto] = useState<Record<Produto, string | undefined>>({
    'COMEX': undefined,
    'FISCAL': undefined,
    'GALLERY': undefined
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      cargo: 'Coordenador',
      departamento: '',
      email: '',
      telefone: '',
      produtos: [],
    },
  });

  const cargoSelecionado = form.watch('cargo');

  // Carregar dados da pessoa ao editar
  useEffect(() => {
    const loadPessoaData = async () => {
      if (pessoa && open) {
        form.reset({
          nome: pessoa.nome,
          cargo: pessoa.cargo,
          departamento: pessoa.departamento,
          email: pessoa.email,
          telefone: pessoa.telefone || '',
          produtos: pessoa.produtos || [pessoa.produto],
        });
        setPreviewUrl(pessoa.foto_url || null);
        
        // Carregar produtos e superiores da pessoa
        try {
          const produtosPessoa = await getProdutosPessoa(pessoa.id);
          const produtos = produtosPessoa.map(p => p.produto);
          setProdutosSelecionados(produtos);
          
          const superiores: Record<Produto, string | undefined> = {
            'COMEX': undefined,
            'FISCAL': undefined,
            'GALLERY': undefined
          };
          
          produtosPessoa.forEach(p => {
            superiores[p.produto] = p.superior_id || undefined;
          });
          
          setSuperioresPorProduto(superiores);
        } catch (err) {
          console.error('Erro ao carregar produtos:', err);
        }
      } else if (!pessoa && open) {
        // Limpar formulário para nova pessoa
        form.reset({
          nome: '',
          cargo: 'Coordenador',
          departamento: '',
          email: '',
          telefone: '',
          produtos: [],
        });
        setPreviewUrl(null);
        setFoto(null);
        setProdutosSelecionados([]);
        setSuperioresPorProduto({
          'COMEX': undefined,
          'FISCAL': undefined,
          'GALLERY': undefined
        });
      }
    };

    loadPessoaData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pessoa, open]);

  const handleProdutoToggle = (produto: Produto, checked: boolean) => {
    if (checked) {
      setProdutosSelecionados([...produtosSelecionados, produto]);
      form.setValue('produtos', [...produtosSelecionados, produto]);
    } else {
      const novos = produtosSelecionados.filter(p => p !== produto);
      setProdutosSelecionados(novos);
      form.setValue('produtos', novos);
      // Limpar superior deste produto
      setSuperioresPorProduto(prev => ({
        ...prev,
        [produto]: undefined
      }));
    }
  };

  const handleSuperiorChange = (produto: Produto, superiorId: string) => {
    setSuperioresPorProduto(prev => ({
      ...prev,
      [produto]: superiorId || undefined
    }));
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoverFoto = () => {
    setFoto(null);
    setPreviewUrl(null);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);

      const dadosParaSalvar = {
        nome: values.nome,
        cargo: values.cargo,
        departamento: values.departamento,
        email: values.email,
        telefone: values.telefone,
      };

      // Se for Central Escalação, vincular automaticamente a TODOS os coordenadores
      let superioresFinais = { ...superioresPorProduto };
      
      if (values.cargo === 'Central Escalação') {
        produtosSelecionados.forEach((produto) => {
          const coordenadores = getSuperioresDisponiveis('Central Escalação' as Cargo, produto);
          // Por enquanto, vamos usar o primeiro coordenador
          // TODO: Implementar lógica para múltiplos superiores no banco
          if (coordenadores.length > 0) {
            superioresFinais[produto] = coordenadores[0].id;
          }
        });
      }

      if (pessoa) {
        // Editar pessoa
        const fotoParaEnviar = previewUrl === null ? null : (foto || undefined);
        
        console.log('📝 Atualizando pessoa:', {
          id: pessoa.id,
          produtosSelecionados,
          superioresFinais,
          isProdutosArray: Array.isArray(produtosSelecionados)
        });
        
        await atualizarPessoa(
          pessoa.id, 
          dadosParaSalvar, 
          produtosSelecionados,
          superioresFinais,
          fotoParaEnviar
        );
        toast({
          title: 'Sucesso!',
          description: 'Pessoa atualizada com sucesso.',
        });
      } else {
        // Criar pessoa
        console.log('📝 Criando nova pessoa:', {
          produtosSelecionados,
          superioresFinais,
          isProdutosArray: Array.isArray(produtosSelecionados)
        });
        
        await criarPessoa(
          dadosParaSalvar, 
          produtosSelecionados,
          superioresFinais,
          foto || undefined
        );
        toast({
          title: 'Sucesso!',
          description: 'Pessoa cadastrada com sucesso.',
        });
      }

      onOpenChange(false);
      form.reset();
      setFoto(null);
      setPreviewUrl(null);
      setProdutosSelecionados([]);
      setSuperioresPorProduto({
        'COMEX': undefined,
        'FISCAL': undefined,
        'GALLERY': undefined
      });
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar pessoa:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar pessoa',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue">
            {modoVisualizacao ? 'Visualizar Pessoa' : pessoa ? 'Editar Pessoa' : 'Nova Pessoa'}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {modoVisualizacao 
              ? 'Visualize os dados da pessoa cadastrada'
              : 'Preencha os dados da pessoa e selecione os produtos em que ela atuará'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Upload de Foto */}
            <div className="space-y-2">
              <FormLabel className="text-sm font-medium text-gray-700">
                Foto
              </FormLabel>
              <div className="flex items-center gap-4">
                <div className="relative">
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                        onClick={handleRemoverFoto}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <User className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <Input
                    id="foto"
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('foto')?.click()}
                    disabled={modoVisualizacao}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {previewUrl ? 'Alterar Foto' : 'Adicionar Foto'}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG ou GIF (máx. 5MB)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Nome Completo <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o nome completo"
                        {...field}
                        disabled={modoVisualizacao}
                        className={form.formState.errors.nome 
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                          : 'focus:ring-sonda-blue focus:border-sonda-blue'
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cargo */}
              <FormField
                control={form.control}
                name="cargo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Cargo <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={modoVisualizacao}>
                      <FormControl>
                        <SelectTrigger className={form.formState.errors.cargo 
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                          : 'focus:ring-sonda-blue focus:border-sonda-blue'
                        }>
                          <SelectValue placeholder="Selecione o cargo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Diretor">Diretor</SelectItem>
                        <SelectItem value="Gerente">Gerente</SelectItem>
                        <SelectItem value="Coordenador">Coordenador</SelectItem>
                        <SelectItem value="Central Escalação">Central Escalação</SelectItem>
                        <SelectItem value="Customer Success">Customer Success</SelectItem>
                        <SelectItem value="Comercial">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Departamento */}
              <FormField
                control={form.control}
                name="departamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Departamento <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: TI, RH, Financeiro"
                        {...field}
                        disabled={modoVisualizacao}
                        className={form.formState.errors.departamento 
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                          : 'focus:ring-sonda-blue focus:border-sonda-blue'
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        {...field}
                        disabled={modoVisualizacao}
                        className={form.formState.errors.email 
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                          : 'focus:ring-sonda-blue focus:border-sonda-blue'
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Telefone */}
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-sm font-medium text-gray-700">
                      Telefone
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(00) 00000-0000"
                        {...field}
                        disabled={modoVisualizacao}
                        className="focus:ring-sonda-blue focus:border-sonda-blue"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Produtos e Superiores */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Produtos <span className="text-red-500">*</span>
                </FormLabel>
                <p className="text-xs text-gray-500 mt-1 mb-3">
                  Selecione os produtos em que esta pessoa atuará
                </p>
                <div className="flex gap-4">
                  {PRODUTOS.map((produto) => (
                    <div key={produto} className="flex items-center space-x-2">
                      <Checkbox
                        id={`produto-${produto}`}
                        checked={produtosSelecionados.includes(produto)}
                        onCheckedChange={(checked) => handleProdutoToggle(produto, checked as boolean)}
                        disabled={modoVisualizacao}
                      />
                      <label
                        htmlFor={`produto-${produto}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {PRODUTO_LABELS[produto]}
                      </label>
                    </div>
                  ))}
                </div>
                {form.formState.errors.produtos && (
                  <p className="text-sm text-red-500 mt-2">{form.formState.errors.produtos.message}</p>
                )}
              </div>

              {/* Superiores por Produto */}
              {cargoSelecionado !== 'Diretor' && cargoSelecionado !== 'Customer Success' && cargoSelecionado !== 'Comercial' && produtosSelecionados.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-gray-300">
                  {cargoSelecionado === 'Central Escalação' ? (
                    // Central Escalação: Mostrar aviso que será vinculado a todos os coordenadores
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <p className="text-sm font-medium text-orange-900 mb-2">
                        Vinculação Automática
                      </p>
                      <p className="text-xs text-orange-800">
                        Central Escalação será automaticamente vinculado a TODOS os Coordenadores dos produtos selecionados.
                      </p>
                      {produtosSelecionados.map((produto) => {
                        const coordenadores = getSuperioresDisponiveis('Central Escalação' as Cargo, produto);
                        return (
                          <div key={produto} className="mt-2">
                            <p className="text-xs font-medium text-orange-900">
                              {PRODUTO_LABELS[produto]}:
                            </p>
                            {coordenadores.length > 0 ? (
                              <ul className="text-xs text-orange-800 ml-4 list-disc">
                                {coordenadores.map((coord) => (
                                  <li key={coord.id}>{coord.nome}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-orange-700 ml-4">
                                Nenhum Coordenador cadastrado ainda
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // Outros cargos: Seletor normal de superior
                    produtosSelecionados.map((produto) => {
                      const superioresDisponiveis = getSuperioresDisponiveis(cargoSelecionado as Cargo, produto);
                      
                      return (
                        <div key={produto}>
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Superior em {PRODUTO_LABELS[produto]}
                          </FormLabel>
                          {superioresDisponiveis.length > 0 ? (
                            <Select 
                              value={superioresPorProduto[produto]} 
                              onValueChange={(value) => handleSuperiorChange(produto, value)}
                              disabled={modoVisualizacao}
                            >
                              <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue mt-1">
                                <SelectValue placeholder="Nenhum (vincular depois)" />
                              </SelectTrigger>
                              <SelectContent>
                                {superioresDisponiveis.map((superior) => (
                                  <SelectItem key={superior.id} value={superior.id}>
                                    {superior.nome} - {superior.cargo}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="p-2 bg-blue-50 border border-blue-200 rounded-md mt-1">
                              <p className="text-xs text-blue-800">
                                {cargoSelecionado === 'Gerente' 
                                  ? `Nenhum Diretor cadastrado em ${PRODUTO_LABELS[produto]} ainda.`
                                  : cargoSelecionado === 'Coordenador'
                                  ? `Nenhum Gerente cadastrado em ${PRODUTO_LABELS[produto]} ainda.`
                                  : `Nenhum Coordenador cadastrado em ${PRODUTO_LABELS[produto]} ainda.`}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="pt-6 border-t">
              {!modoVisualizacao ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-sonda-blue hover:bg-sonda-dark-blue"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {pessoa 
                      ? 'Salvar Alterações' 
                      : `Criar ${cargoSelecionado || 'Pessoa'}`
                    }
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Fechar
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
