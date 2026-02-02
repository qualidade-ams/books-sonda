import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { useEmpresas } from '@/hooks/useEmpresas';
import type { TaxaClienteCompleta, TaxaFormData, TipoProduto } from '@/types/taxasClientes';
import { calcularValores, getFuncoesPorProduto, calcularValoresLocaisAutomaticos, getCamposEspecificosPorCliente, clienteTemCamposEspecificos } from '@/types/taxasClientes';

interface TaxaFormProps {
  taxa?: TaxaClienteCompleta | null;
  onSubmit: (dados: TaxaFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  dadosIniciais?: {
    clienteId?: string;
    tipoProduto?: 'GALLERY' | 'OUTROS';
  } | null;
}

export function TaxaForm({ taxa, onSubmit, onCancel, isLoading, dadosIniciais }: TaxaFormProps) {
  // ✅ CORREÇÃO: Filtrar apenas empresas com status ativo
  const { empresas } = useEmpresas({ status: ['ativo'] });
  const [tipoProdutoSelecionado, setTipoProdutoSelecionado] = useState<TipoProduto | ''>(taxa?.tipo_produto || '');
  const [tipoCalculoAdicional, setTipoCalculoAdicional] = useState<'normal' | 'media'>(taxa?.tipo_calculo_adicional || 'media');
  const [produtosCliente, setProdutosCliente] = useState<string[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [valoresEditando, setValoresEditando] = useState<Record<string, string>>({});
  const [valoresOriginais, setValoresOriginais] = useState<any>(null);
  const [personalizado, setPersonalizado] = useState<boolean>(taxa?.personalizado || false);
  
  // Função para formatar valor como moeda
  const formatarMoeda = (valor: number): string => {
    const resultado = valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return resultado;
  };

  // Função para converter moeda para número
  const converterMoedaParaNumero = (valor: string): number => {
    // Remove tudo exceto números, vírgula e ponto
    const limpo = valor.replace(/[^\d,]/g, '');
    const numero = limpo.replace(',', '.');
    return parseFloat(numero) || 0;
  };
  
  const form = useForm<any>({
    defaultValues: {
      cliente_id: '',
      vigencia_inicio: undefined,
      vigencia_fim: undefined,
      tipo_produto: '',
      tipo_calculo_adicional: 'media',
      personalizado: false,
      taxa_reajuste: undefined,
      valores_remota: {
        funcional: 0,
        tecnico: 0,
        abap: 0,
        dba: 0,
        gestor: 0,
      },
      valores_local: {
        funcional: 0,
        tecnico: 0,
        abap: 0,
        dba: 0,
        gestor: 0,
      },
      // Campos específicos por cliente
      valor_ticket: undefined,
      valor_ticket_excedente: undefined,
      ticket_excedente_simples: undefined,
      ticket_excedente_complexo: undefined,
      ticket_excedente_1: undefined,
      ticket_excedente_2: undefined,
      ticket_excedente: undefined,
    },
  });

  // Aplicar dados iniciais quando fornecidos (ao criar taxa a partir da aba "Clientes Sem Taxa")
  useEffect(() => {
    if (dadosIniciais && !taxa && empresas.length > 0) {
      // Resetar o formulário primeiro para limpar valores anteriores
      form.reset({
        cliente_id: '',
        vigencia_inicio: undefined,
        vigencia_fim: undefined,
        tipo_produto: '',
        tipo_calculo_adicional: 'media',
        personalizado: false,
        taxa_reajuste: undefined,
        valores_remota: {
          funcional: 0,
          tecnico: 0,
          abap: 0,
          dba: 0,
          gestor: 0,
        },
        valores_local: {
          funcional: 0,
          tecnico: 0,
          abap: 0,
          dba: 0,
          gestor: 0,
        },
        valor_ticket: undefined,
        valor_ticket_excedente: undefined,
        ticket_excedente_simples: undefined,
        ticket_excedente_complexo: undefined,
        ticket_excedente_1: undefined,
        ticket_excedente_2: undefined,
        ticket_excedente: undefined,
      });
      
      if (dadosIniciais.clienteId) {
        const empresa = empresas.find(e => e.id === dadosIniciais.clienteId);
        
        if (empresa) {
          form.setValue('cliente_id', empresa.nome_abreviado);
          setClienteSelecionado(empresa.nome_abreviado);
          
          // Carregar produtos do cliente
          if (empresa.produtos) {
            const produtos = empresa.produtos.map((p: any) => p.produto);
            setProdutosCliente(produtos);
          }
        }
      }
      
      if (dadosIniciais.tipoProduto) {
        // Usar setTimeout para garantir que o campo está renderizado
        setTimeout(() => {
          form.setValue('tipo_produto', dadosIniciais.tipoProduto);
          setTipoProdutoSelecionado(dadosIniciais.tipoProduto);
        }, 100);
      }
    } else if (!dadosIniciais && !taxa) {
      // Se não há dados iniciais nem taxa para editar, resetar o formulário
      form.reset({
        cliente_id: '',
        vigencia_inicio: undefined,
        vigencia_fim: undefined,
        tipo_produto: '',
        tipo_calculo_adicional: 'media',
        personalizado: false,
        taxa_reajuste: undefined,
        valores_remota: {
          funcional: 0,
          tecnico: 0,
          abap: 0,
          dba: 0,
          gestor: 0,
        },
        valores_local: {
          funcional: 0,
          tecnico: 0,
          abap: 0,
          dba: 0,
          gestor: 0,
        },
        valor_ticket: undefined,
        valor_ticket_excedente: undefined,
        ticket_excedente_simples: undefined,
        ticket_excedente_complexo: undefined,
        ticket_excedente_1: undefined,
        ticket_excedente_2: undefined,
        ticket_excedente: undefined,
      });
      setClienteSelecionado('');
      setProdutosCliente([]);
      setTipoProdutoSelecionado('');
    }
  }, [dadosIniciais, empresas, taxa, form]);

  // Buscar produtos do cliente selecionado
  useEffect(() => {
    if (clienteSelecionado && !taxa) {
      const empresa = empresas.find(e => e.nome_abreviado === clienteSelecionado);
      if (empresa && empresa.produtos) {
        // Extrair lista de produtos da empresa
        const produtos = empresa.produtos.map((p: any) => p.produto);
        setProdutosCliente(produtos);
        
        // Se houver apenas um produto, selecionar automaticamente
        if (produtos.length === 1) {
          const produtoUnico = produtos[0];
          const tipoProduto = produtoUnico === 'GALLERY' ? 'GALLERY' : 'OUTROS';
          form.setValue('tipo_produto', tipoProduto);
          setTipoProdutoSelecionado(tipoProduto);
        }

        // CORREÇÃO APRIMORADA: Se cliente não tem AMS, buscar taxa padrão vigente
        // Busca taxa padrão baseada no tipo de produto (GALLERY ou OUTROS)
        // Se não houver taxa vigente, deixa campos zerados
        if (empresa.tem_ams === false) {
          console.log('🔍 Cliente sem AMS detectado:', empresa.nome_abreviado);
          console.log('📦 Produtos do cliente:', produtos);
          console.log('⚠️ APLICANDO TAXA PADRÃO - Cliente não possui AMS');
          
          import('@/services/taxaPadraoService').then(async ({ buscarTaxaPadrao }) => {
            // Determinar tipo de produto baseado nos produtos do cliente
            // GALLERY → busca taxa padrão GALLERY
            // COMEX, FISCAL → busca taxa padrão OUTROS
            let tipoProduto: 'GALLERY' | 'OUTROS' = 'OUTROS';
            
            if (produtos.includes('GALLERY')) {
              tipoProduto = 'GALLERY';
              console.log('✅ Cliente tem GALLERY - buscando taxa padrão GALLERY');
            } else if (produtos.some((p: string) => ['COMEX', 'FISCAL'].includes(p))) {
              tipoProduto = 'OUTROS';
              console.log('✅ Cliente tem COMEX/FISCAL - buscando taxa padrão OUTROS');
            } else if (produtos.length > 0) {
              tipoProduto = 'OUTROS';
              console.log('✅ Cliente tem outros produtos - buscando taxa padrão OUTROS');
            }

            try {
              const taxaPadrao = await buscarTaxaPadrao(tipoProduto);
              
              if (taxaPadrao) {
                console.log('✅ Taxa padrão vigente encontrada:', {
                  tipo: taxaPadrao.tipo_produto,
                  vigencia_inicio: taxaPadrao.vigencia_inicio,
                  vigencia_fim: taxaPadrao.vigencia_fim
                });
                
                // Preencher formulário com taxa padrão vigente
                form.setValue('tipo_produto', taxaPadrao.tipo_produto);
                form.setValue('valores_remota', taxaPadrao.valores_remota);
                form.setValue('valores_local', taxaPadrao.valores_local);
                setTipoProdutoSelecionado(taxaPadrao.tipo_produto);
              } else {
                console.log('⚠️ Nenhuma taxa padrão vigente encontrada - campos ficarão zerados');
                // Não fazer nada - campos ficam zerados
              }
            } catch (error) {
              console.error('❌ Erro ao buscar taxa padrão:', error);
              // Em caso de erro, deixar campos zerados
            }
          });
        } else {
          console.log('✅ Cliente COM AMS detectado:', empresa.nome_abreviado);
          console.log('⚠️ NÃO APLICANDO TAXA PADRÃO - Cliente possui AMS');
          console.log('📊 Status AMS do cliente:', empresa.tem_ams);
          console.log('ℹ️ Campos ficarão zerados para preenchimento manual');
        }
      } else {
        setProdutosCliente([]);
      }
    }
  }, [clienteSelecionado, empresas, form, taxa]);

  // NOVO: Buscar taxa padrão quando tipo de produto for alterado manualmente
  useEffect(() => {
    // Só executar se:
    // 1. Não está editando uma taxa existente
    // 2. Cliente está selecionado
    // 3. Tipo de produto foi selecionado
    // 4. Cliente não tem AMS
    if (!taxa && clienteSelecionado && tipoProdutoSelecionado) {
      const empresa = empresas.find(e => e.nome_abreviado === clienteSelecionado);
      
      if (empresa && empresa.tem_ams === false) {
        console.log('🔄 Tipo de produto alterado manualmente:', tipoProdutoSelecionado);
        console.log('🔍 Buscando taxa padrão correspondente...');
        console.log('⚠️ APLICANDO TAXA PADRÃO - Cliente não possui AMS');
        
        import('@/services/taxaPadraoService').then(async ({ buscarTaxaPadrao }) => {
          try {
            const taxaPadrao = await buscarTaxaPadrao(tipoProdutoSelecionado);
            
            if (taxaPadrao) {
              console.log('✅ Taxa padrão vigente encontrada para', tipoProdutoSelecionado, ':', {
                vigencia_inicio: taxaPadrao.vigencia_inicio,
                vigencia_fim: taxaPadrao.vigencia_fim
              });
              
              // Preencher formulário com taxa padrão vigente
              form.setValue('valores_remota', taxaPadrao.valores_remota);
              form.setValue('valores_local', taxaPadrao.valores_local);
            } else {
              console.log('⚠️ Nenhuma taxa padrão vigente encontrada para', tipoProdutoSelecionado);
              // Limpar campos se não houver taxa vigente
              form.setValue('valores_remota', {
                funcional: 0,
                tecnico: 0,
                abap: 0,
                dba: 0,
                gestor: 0,
              });
              form.setValue('valores_local', {
                funcional: 0,
                tecnico: 0,
                abap: 0,
                dba: 0,
                gestor: 0,
              });
            }
          } catch (error) {
            console.error('❌ Erro ao buscar taxa padrão:', error);
          }
        });
      }
    }
  }, [tipoProdutoSelecionado, clienteSelecionado, empresas, form, taxa]);

  // NOVO: Validar vigência selecionada contra taxas padrão cadastradas
  const vigenciaInicio = form.watch('vigencia_inicio');
  
  useEffect(() => {
    // Só executar se:
    // 1. Não está editando uma taxa existente
    // 2. Cliente está selecionado
    // 3. Tipo de produto foi selecionado
    // 4. Cliente não tem AMS
    // 5. Vigência início foi selecionada
    if (!taxa && clienteSelecionado && tipoProdutoSelecionado && vigenciaInicio) {
      const empresa = empresas.find(e => e.nome_abreviado === clienteSelecionado);
      
      if (empresa && empresa.tem_ams === false) {
        console.log('📅 Vigência início selecionada:', vigenciaInicio);
        console.log('🔍 Validando vigência contra taxas padrão cadastradas...');
        console.log('⚠️ APLICANDO TAXA PADRÃO - Cliente não possui AMS');
        
        import('@/services/taxaPadraoService').then(async ({ buscarTaxaPadrao }) => {
          try {
            // Converter vigência para string no formato YYYY-MM-DD
            const dataReferencia = vigenciaInicio instanceof Date 
              ? vigenciaInicio.toISOString().split('T')[0]
              : vigenciaInicio;
            
            console.log('📅 Data de referência para busca:', dataReferencia);
            
            // Buscar taxa padrão vigente na data selecionada
            const taxaPadrao = await buscarTaxaPadrao(tipoProdutoSelecionado, dataReferencia);
            
            if (taxaPadrao) {
              console.log('✅ Taxa padrão vigente encontrada para data', dataReferencia, ':', {
                tipo: taxaPadrao.tipo_produto,
                vigencia_inicio: taxaPadrao.vigencia_inicio,
                vigencia_fim: taxaPadrao.vigencia_fim
              });
              
              // Preencher formulário com taxa padrão vigente
              form.setValue('valores_remota', taxaPadrao.valores_remota);
              form.setValue('valores_local', taxaPadrao.valores_local);
            } else {
              console.log('⚠️ Nenhuma taxa padrão vigente encontrada para data', dataReferencia);
              console.log('⚠️ Limpando campos - vigência selecionada não está cadastrada no sistema');
              
              // Limpar campos se não houver taxa vigente na data selecionada
              form.setValue('valores_remota', {
                funcional: 0,
                tecnico: 0,
                abap: 0,
                dba: 0,
                gestor: 0,
              });
              form.setValue('valores_local', {
                funcional: 0,
                tecnico: 0,
                abap: 0,
                dba: 0,
                gestor: 0,
              });
            }
          } catch (error) {
            console.error('❌ Erro ao validar vigência:', error);
          }
        });
      }
    }
  }, [vigenciaInicio, tipoProdutoSelecionado, clienteSelecionado, empresas, form, taxa]);

  // Preencher formulário ao editar
  useEffect(() => {
    if (taxa && empresas.length > 0) {
      const empresa = empresas.find(e => e.id === taxa.cliente_id);
      
      if (empresa) {
        // Carregar produtos do cliente PRIMEIRO
        if (empresa.produtos) {
          const produtos = empresa.produtos.map((p: any) => p.produto);
          setProdutosCliente(produtos);
        }
        setClienteSelecionado(empresa.nome_abreviado);
        
        // CRÍTICO: Definir personalizado ANTES de qualquer cálculo
        const isPersonalizado = taxa.personalizado || false;
        setPersonalizado(isPersonalizado);
        
        // Aguardar um tick para garantir que os estados foram atualizados
        setTimeout(() => {
          const valoresIniciais = {
            cliente_id: empresa.nome_abreviado,
            vigencia_inicio: taxa.vigencia_inicio ? new Date(taxa.vigencia_inicio + 'T00:00:00') : undefined,
            vigencia_fim: taxa.vigencia_fim ? new Date(taxa.vigencia_fim + 'T00:00:00') : undefined,
            tipo_produto: taxa.tipo_produto,
            tipo_calculo_adicional: taxa.tipo_calculo_adicional || 'media',
            personalizado: isPersonalizado,
            taxa_reajuste: undefined,
            valores_remota: {
              funcional: taxa.valores_remota?.find(v => v.funcao === 'Funcional')?.valor_base || 0,
              tecnico: taxa.valores_remota?.find(v => 
                v.funcao === 'Técnico / ABAP' || v.funcao === 'Técnico (Instalação / Atualização)'
              )?.valor_base || 0,
              abap: taxa.valores_remota?.find(v => v.funcao === 'ABAP - PL/SQL')?.valor_base || 0,
              dba: taxa.valores_remota?.find(v => 
                v.funcao === 'DBA / Basis' || v.funcao === 'DBA'
              )?.valor_base || 0,
              gestor: taxa.valores_remota?.find(v => v.funcao === 'Gestor')?.valor_base || 0,
            },
            valores_local: {
              funcional: taxa.valores_local?.find(v => v.funcao === 'Funcional')?.valor_base || 0,
              tecnico: taxa.valores_local?.find(v => 
                v.funcao === 'Técnico / ABAP' || v.funcao === 'Técnico (Instalação / Atualização)'
              )?.valor_base || 0,
              abap: taxa.valores_local?.find(v => v.funcao === 'ABAP - PL/SQL')?.valor_base || 0,
              dba: taxa.valores_local?.find(v => 
                v.funcao === 'DBA / Basis' || v.funcao === 'DBA'
              )?.valor_base || 0,
              gestor: taxa.valores_local?.find(v => v.funcao === 'Gestor')?.valor_base || 0,
            },
            // Campos específicos por cliente
            valor_ticket: taxa.valor_ticket,
            valor_ticket_excedente: taxa.valor_ticket_excedente,
            ticket_excedente_simples: taxa.ticket_excedente_simples,
            ticket_excedente_complexo: taxa.ticket_excedente_complexo,
            ticket_excedente_1: taxa.ticket_excedente_1,
            ticket_excedente_2: taxa.ticket_excedente_2,
            ticket_excedente: taxa.ticket_excedente,
          };
          
          // Salvar valores originais para referência
          setValoresOriginais({
            valores_remota: { ...valoresIniciais.valores_remota },
            valores_local: { ...valoresIniciais.valores_local },
            vigencia_inicio: valoresIniciais.vigencia_inicio,
            vigencia_fim: valoresIniciais.vigencia_fim,
          });
          
          form.reset(valoresIniciais);
          
          setTipoProdutoSelecionado(taxa.tipo_produto);
          setTipoCalculoAdicional(taxa.tipo_calculo_adicional || 'media');
        }, 0);
      }
    }
  }, [taxa, empresas, form]);

  const handleSubmit = (data: any) => {
    console.log('🔄 [TAXA FORM] handleSubmit chamado');
    console.log('📊 [TAXA FORM] Dados do formulário:', data);
    console.log('🔧 [TAXA FORM] É edição de taxa existente?', !!taxa);
    console.log('🎨 [TAXA FORM] É personalizado?', data.personalizado);
    console.log('⚡ [TAXA FORM] Estado isLoading:', isLoading);
    
    // TESTE: Verificar se o botão está sendo clicado
    if (taxa) {
      console.log('✏️ [TAXA FORM] MODO EDIÇÃO - Botão Atualizar clicado!');
      console.log('📋 [TAXA FORM] Taxa sendo editada:', {
        id: taxa.id,
        cliente: taxa.cliente?.nome_abreviado,
        tipo_produto: taxa.tipo_produto
      });
    } else {
      console.log('➕ [TAXA FORM] MODO CRIAÇÃO - Botão Criar clicado!');
    }
    
    // Encontrar ID da empresa pelo nome abreviado
    const empresa = empresas.find(e => e.nome_abreviado === data.cliente_id);
    
    if (!empresa) {
      console.error('❌ [TAXA FORM] Cliente não encontrado:', data.cliente_id);
      form.setError('cliente_id', { message: 'Cliente não encontrado' });
      return;
    }

    // Validar campos obrigatórios
    if (!data.vigencia_inicio) {
      console.error('❌ [TAXA FORM] Vigência início não fornecida');
      form.setError('vigencia_inicio', { message: 'Vigência início é obrigatória' });
      return;
    }

    if (!data.tipo_produto) {
      console.error('❌ [TAXA FORM] Tipo de produto não fornecido');
      form.setError('tipo_produto', { message: 'Tipo de produto é obrigatório' });
      return;
    }

    // CORREÇÃO CRÍTICA: Log detalhado dos dados enviados
    console.log('📝 [TAXA FORM] Dados brutos do formulário:', data);
    console.log('📊 [TAXA FORM] Valores remotos enviados:', data.valores_remota);
    console.log('📊 [TAXA FORM] Valores locais enviados:', data.valores_local);

    const dadosFormatados: TaxaFormData = {
      cliente_id: empresa.id,
      vigencia_inicio: data.vigencia_inicio,
      vigencia_fim: data.vigencia_fim || undefined,
      tipo_produto: data.tipo_produto,
      tipo_calculo_adicional: data.tipo_calculo_adicional,
      personalizado: data.personalizado || false,
      taxa_reajuste: data.taxa_reajuste,
      valores_remota: data.valores_remota,
      valores_local: data.valores_local,
      valores_remota_personalizados: data.personalizado ? data.valores_remota_personalizados : undefined,
      valores_local_personalizados: data.personalizado ? data.valores_local_personalizados : undefined,
      // Campos específicos por cliente
      valor_ticket: data.valor_ticket,
      valor_ticket_excedente: data.valor_ticket_excedente,
      ticket_excedente_simples: data.ticket_excedente_simples,
      ticket_excedente_complexo: data.ticket_excedente_complexo,
      ticket_excedente_1: data.ticket_excedente_1,
      ticket_excedente_2: data.ticket_excedente_2,
      ticket_excedente: data.ticket_excedente,
    };

    console.log('📤 [TAXA FORM] Dados formatados para envio:', dadosFormatados);
    console.log('🚀 [TAXA FORM] Chamando onSubmit...');

    try {
      onSubmit(dadosFormatados);
      console.log('✅ [TAXA FORM] onSubmit chamado com sucesso');
    } catch (error) {
      console.error('❌ [TAXA FORM] Erro ao chamar onSubmit:', error);
    }
  };

  // Calcular valores em tempo real
  const valoresRemota = form.watch('valores_remota');
  const valoresLocal = form.watch('valores_local');
  const taxaReajuste = form.watch('taxa_reajuste');
  
  // Monitorar campos específicos para garantir reatividade
  const funcionalRemoto = form.watch('valores_remota.funcional');
  const tecnicoRemoto = form.watch('valores_remota.tecnico');
  const abapRemoto = form.watch('valores_remota.abap');
  const dbaRemoto = form.watch('valores_remota.dba');
  const gestorRemoto = form.watch('valores_remota.gestor');

  // Monitorar campos específicos dos valores locais
  const funcionalLocal = form.watch('valores_local.funcional');
  const tecnicoLocal = form.watch('valores_local.tecnico');
  const abapLocal = form.watch('valores_local.abap');
  const dbaLocal = form.watch('valores_local.dba');
  const gestorLocal = form.watch('valores_local.gestor');

  // NOVO: Calcular automaticamente valores locais quando valores remotos mudarem (10% a mais)
  useEffect(() => {
    // BLOQUEIO CRÍTICO: Se for personalizado, NÃO calcular NADA
    if (personalizado) {
      return;
    }
    
    // BLOQUEIO ADICIONAL: Se estamos editando uma taxa existente, não recalcular automaticamente
    if (taxa) {
      return;
    }
    
    if (valoresRemota) {
      // Verificar se há valores válidos
      const temValores = valoresRemota.funcional > 0 || valoresRemota.tecnico > 0 || 
                        valoresRemota.dba > 0 || valoresRemota.gestor > 0 ||
                        (valoresRemota.abap && valoresRemota.abap > 0);
      
      if (temValores) {
        const valoresLocaisCalculados = calcularValoresLocaisAutomaticos(valoresRemota);
        
        // Atualizar valores locais no formulário
        form.setValue('valores_local', valoresLocaisCalculados);
      }
    }
  }, [valoresRemota, personalizado, taxa, form]);

  // ADICIONAL: Monitorar campos específicos para garantir cálculo em tempo real
  useEffect(() => {
    // BLOQUEIO CRÍTICO: Se for personalizado, NÃO calcular NADA
    if (personalizado) {
      return;
    }
    
    // BLOQUEIO ADICIONAL: Se estamos editando uma taxa existente, não recalcular automaticamente
    if (taxa) {
      return;
    }
    
    if (funcionalRemoto || tecnicoRemoto || abapRemoto || dbaRemoto || gestorRemoto) {
      const valoresAtuais = {
        funcional: funcionalRemoto || 0,
        tecnico: tecnicoRemoto || 0,
        abap: abapRemoto || 0,
        dba: dbaRemoto || 0,
        gestor: gestorRemoto || 0,
      };
      
      // Verificar se há valores válidos
      const temValores = valoresAtuais.funcional > 0 || valoresAtuais.tecnico > 0 || 
                        valoresAtuais.dba > 0 || valoresAtuais.gestor > 0 ||
                        valoresAtuais.abap > 0;
      
      if (temValores) {
        const valoresLocaisCalculados = calcularValoresLocaisAutomaticos(valoresAtuais);
        form.setValue('valores_local', valoresLocaisCalculados);
      }
    }
  }, [funcionalRemoto, tecnicoRemoto, abapRemoto, dbaRemoto, gestorRemoto, personalizado, taxa, form]);

  // ✅ NOVO: Alterar automaticamente tipo de cálculo para "média" quando taxa de reajuste for preenchida
  useEffect(() => {
    console.log('🔍 [TAXA FORM] useEffect taxaReajuste executado:', { taxaReajuste, tipoCalculoAtual: form.getValues('tipo_calculo_adicional') });
    
    if (taxaReajuste && taxaReajuste > 0) {
      // Alterar automaticamente para "média" quando taxa de reajuste for inserida
      console.log('✅ [TAXA FORM] Alterando tipo de cálculo para média devido à taxa de reajuste:', taxaReajuste);
      form.setValue('tipo_calculo_adicional', 'media', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      setTipoCalculoAdicional('media');
      
      // Forçar re-render do componente
      setTimeout(() => {
        console.log('🔄 [TAXA FORM] Valor após setTimeout:', form.getValues('tipo_calculo_adicional'));
      }, 100);
    }
  }, [taxaReajuste, form]);

  // Recalcular valores e vigências quando taxa de reajuste mudar (apenas em edição e não personalizado)
  useEffect(() => {
    // BLOQUEIO CRÍTICO: Se for personalizado, NÃO calcular NADA
    if (personalizado) {
      return;
    }
    
    if (taxa && valoresOriginais && taxaReajuste && taxaReajuste > 0) {
      const percentual = taxaReajuste / 100;
      
      // Recalcular valores remotos
      const novosValoresRemota = {
        funcional: valoresOriginais.valores_remota.funcional + (valoresOriginais.valores_remota.funcional * percentual),
        tecnico: valoresOriginais.valores_remota.tecnico + (valoresOriginais.valores_remota.tecnico * percentual),
        abap: valoresOriginais.valores_remota.abap + (valoresOriginais.valores_remota.abap * percentual),
        dba: valoresOriginais.valores_remota.dba + (valoresOriginais.valores_remota.dba * percentual),
        gestor: valoresOriginais.valores_remota.gestor + (valoresOriginais.valores_remota.gestor * percentual),
      };
      
      // ATUALIZADO: Recalcular valores locais usando a nova função (10% a mais dos novos valores remotos)
      const novosValoresLocal = calcularValoresLocaisAutomaticos(novosValoresRemota);
      
      // Recalcular vigências
      const dataFimOriginal = valoresOriginais.vigencia_fim || valoresOriginais.vigencia_inicio;
      if (dataFimOriginal) {
        const novaDataInicio = new Date(dataFimOriginal);
        novaDataInicio.setDate(novaDataInicio.getDate() + 1);
        
        const novaDataFim = new Date(novaDataInicio);
        novaDataFim.setFullYear(novaDataFim.getFullYear() + 1);
        novaDataFim.setDate(novaDataFim.getDate() - 1);
        
        form.setValue('vigencia_inicio', novaDataInicio);
        form.setValue('vigencia_fim', novaDataFim);
      }
      
      // Atualizar valores no formulário
      form.setValue('valores_remota', novosValoresRemota);
      form.setValue('valores_local', novosValoresLocal);
    } else if (taxa && valoresOriginais && (!taxaReajuste || taxaReajuste === 0)) {
      // Se taxa de reajuste for zerada, restaurar valores originais (apenas se não for personalizado)
      form.setValue('valores_remota', valoresOriginais.valores_remota);
      form.setValue('valores_local', valoresOriginais.valores_local);
      form.setValue('vigencia_inicio', valoresOriginais.vigencia_inicio);
      form.setValue('vigencia_fim', valoresOriginais.vigencia_fim);
    }
  }, [taxaReajuste, taxa, valoresOriginais, personalizado, form]);

  const calcularValoresExibicao = (valores: any, tipo: 'remota' | 'local') => {
    const funcoes = getFuncoesPorProduto(tipoProdutoSelecionado || 'GALLERY');
    const resultado: any = {};

    funcoes.forEach(funcao => {
      // REGRA ÚNICA: Se personalizado está marcado, NÃO calcular automaticamente (nova taxa OU edição)
      if (personalizado) {
        // Se estiver editando uma taxa personalizada, usar EXATAMENTE os valores do banco
        if (taxa) {
          const valoresSalvos = tipo === 'remota' ? taxa.valores_remota : taxa.valores_local;
          const valorSalvo = valoresSalvos?.find(v => v.funcao === funcao);
          
          if (valorSalvo) {
            // Usar EXATAMENTE os valores salvos no banco, sem nenhuma alteração
            resultado[funcao] = {
              funcao: valorSalvo.funcao,
              valor_base: valorSalvo.valor_base ?? 0,
              valor_17h30_19h30: valorSalvo.valor_17h30_19h30 ?? 0,
              valor_apos_19h30: valorSalvo.valor_apos_19h30 ?? 0,
              valor_fim_semana: valorSalvo.valor_fim_semana ?? 0,
              valor_adicional: tipo === 'remota' ? (valorSalvo.valor_adicional ?? 0) : 0,
              valor_standby: tipo === 'remota' ? (valorSalvo.valor_standby ?? 0) : 0
            };
          } else {
            // Se não tem valor salvo no banco, usar zeros
            resultado[funcao] = {
              funcao: funcao,
              valor_base: 0,
              valor_17h30_19h30: 0,
              valor_apos_19h30: 0,
              valor_fim_semana: 0,
              valor_adicional: 0,
              valor_standby: 0
            };
          }
        } else {
          // Para nova taxa personalizada, usar apenas o valor base digitado, resto em zero
          let valorBase = 0;
          
          if (funcao === 'Funcional') {
            valorBase = funcionalRemoto || valores.funcional || 0;
          } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
            valorBase = tecnicoRemoto || valores.tecnico || 0;
          } else if (funcao === 'ABAP - PL/SQL') {
            valorBase = abapRemoto || valores.abap || 0;
          } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
            valorBase = dbaRemoto || valores.dba || 0;
          } else if (funcao === 'Gestor') {
            valorBase = gestorRemoto || valores.gestor || 0;
          }
          
          resultado[funcao] = {
            funcao: funcao,
            valor_base: valorBase,
            valor_17h30_19h30: 0, // NÃO calcular automaticamente
            valor_apos_19h30: 0,  // NÃO calcular automaticamente
            valor_fim_semana: 0,  // NÃO calcular automaticamente
            valor_adicional: 0,   // NÃO calcular automaticamente
            valor_standby: 0      // NÃO calcular automaticamente
          };
        }
        
        return; // Pular para próxima função
      }

      // LÓGICA NORMAL: Calcular automaticamente APENAS quando NÃO é personalizado (nova taxa OU edição)
      
      // Obter valor base atual do formulário (mais atualizado) - USAR VARIÁVEIS CORRETAS BASEADO NO TIPO
      let valorBase = 0;
      
      if (tipo === 'remota') {
        // Para valores remotos, usar as variáveis dos valores remotos
        if (funcao === 'Funcional') {
          valorBase = funcionalRemoto || valores.funcional || 0;
        } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
          valorBase = tecnicoRemoto || valores.tecnico || 0;
        } else if (funcao === 'ABAP - PL/SQL') {
          valorBase = abapRemoto || valores.abap || 0;
        } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
          valorBase = dbaRemoto || valores.dba || 0;
        } else if (funcao === 'Gestor') {
          valorBase = gestorRemoto || valores.gestor || 0;
        }
      } else {
        // Para valores locais, usar as variáveis dos valores locais
        if (funcao === 'Funcional') {
          valorBase = funcionalLocal || valores.funcional || 0;
        } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
          valorBase = tecnicoLocal || valores.tecnico || 0;
        } else if (funcao === 'ABAP - PL/SQL') {
          valorBase = abapLocal || valores.abap || 0;
        } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
          valorBase = dbaLocal || valores.dba || 0;
        } else if (funcao === 'Gestor') {
          valorBase = gestorLocal || valores.gestor || 0;
        }
      }

      // Preparar array com todas as funções para cálculo da média (usando valores corretos baseado no tipo)
      const todasFuncoes = funcoes.map(f => {
        let vb = 0;
        if (tipo === 'remota') {
          // Para valores remotos, usar as variáveis dos valores remotos
          if (f === 'Funcional') vb = funcionalRemoto || valores.funcional || 0;
          else if (f === 'Técnico / ABAP' || f === 'Técnico (Instalação / Atualização)') vb = tecnicoRemoto || valores.tecnico || 0;
          else if (f === 'ABAP - PL/SQL') vb = abapRemoto || valores.abap || 0;
          else if (f === 'DBA / Basis' || f === 'DBA') vb = dbaRemoto || valores.dba || 0;
          else if (f === 'Gestor') vb = gestorRemoto || valores.gestor || 0;
        } else {
          // Para valores locais, usar as variáveis dos valores locais
          if (f === 'Funcional') vb = funcionalLocal || valores.funcional || 0;
          else if (f === 'Técnico / ABAP' || f === 'Técnico (Instalação / Atualização)') vb = tecnicoLocal || valores.tecnico || 0;
          else if (f === 'ABAP - PL/SQL') vb = abapLocal || valores.abap || 0;
          else if (f === 'DBA / Basis' || f === 'DBA') vb = dbaLocal || valores.dba || 0;
          else if (f === 'Gestor') vb = gestorLocal || valores.gestor || 0;
        }
        return { funcao: f, valor_base: vb };
      });

      // Usar parâmetro isLocal para aplicar 10% a mais nos valores locais
      const isLocal = tipo === 'local';
      
      const valoresCalculados = calcularValores(valorBase, funcao, todasFuncoes, tipoCalculoAdicional, tipoProdutoSelecionado || 'GALLERY', isLocal);
      
      resultado[funcao] = valoresCalculados;
    });

    return resultado;
  };
  const valoresCalculadosRemota = useMemo(() => {
    const resultado = calcularValoresExibicao(valoresRemota, 'remota');
    return resultado;
  }, [valoresRemota, personalizado, taxa, tipoProdutoSelecionado, tipoCalculoAdicional, funcionalRemoto, tecnicoRemoto, abapRemoto, dbaRemoto, gestorRemoto]);
  
  const valoresCalculadosLocal = useMemo(() => {
    return calcularValoresExibicao(valoresLocal, 'local');
  }, [valoresLocal, personalizado, taxa, tipoProdutoSelecionado, tipoCalculoAdicional, funcionalLocal, tecnicoLocal, abapLocal, dbaLocal, gestorLocal]);

  // Forçar recálculo quando valores base mudam (apenas para taxas não personalizadas)
  useEffect(() => {
    if (!personalizado) {
      // Força uma atualização dos valores calculados quando qualquer valor base muda
      const timeoutId = setTimeout(() => {
        // Este timeout garante que o recálculo aconteça após a atualização do estado
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [funcionalRemoto, tecnicoRemoto, abapRemoto, dbaRemoto, gestorRemoto, funcionalLocal, tecnicoLocal, abapLocal, dbaLocal, gestorLocal, personalizado]);

  const funcoes = getFuncoesPorProduto(tipoProdutoSelecionado || 'GALLERY');

  return (
    <Form {...form}>
      <form 
        onSubmit={(e) => {
          console.log('📝 [TAXA FORM] Form onSubmit event triggered');
          console.log('🔧 [TAXA FORM] Event:', e);
          console.log('📋 [TAXA FORM] Form state:', {
            isValid: form.formState.isValid,
            isSubmitting: form.formState.isSubmitting,
            errors: form.formState.errors
          });
          form.handleSubmit(handleSubmit)(e);
        }} 
        className="space-y-6"
      >
        {/* Dados Principais */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dados Principais</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setClienteSelecionado(value);
                    }}
                    value={field.value || ""}
                    disabled={!!taxa}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {empresas
                        .filter((empresa) => empresa.status === 'ativo')
                        .sort((a, b) => a.nome_abreviado.localeCompare(b.nome_abreviado))
                        .map((empresa) => (
                          <SelectItem key={empresa.id} value={empresa.nome_abreviado}>
                            {empresa.nome_abreviado}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo_produto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Produto *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setTipoProdutoSelecionado(value as TipoProduto);
                    }}
                    value={field.value || ""}
                    disabled={!clienteSelecionado || produtosCliente.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !clienteSelecionado 
                            ? "Selecione um cliente primeiro" 
                            : produtosCliente.length === 0 
                              ? "Cliente sem produtos cadastrados"
                              : "Selecione um Tipo de Produto"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {produtosCliente.includes('GALLERY') && (
                        <SelectItem value="GALLERY">GALLERY</SelectItem>
                      )}
                      {produtosCliente.some(p => p !== 'GALLERY') && (
                        <SelectItem value="OUTROS">
                          {produtosCliente.filter(p => p !== 'GALLERY').join(', ')}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="vigencia_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vigência Início *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                        field.onChange(date);
                        // Sempre que a data início mudar, atualizar a data fim para 1 ano - 1 dia
                        if (date) {
                          // Criar nova data para data fim
                          const dataFim = new Date(date.getTime());
                          // Adicionar 1 ano e subtrair 1 dia
                          dataFim.setFullYear(dataFim.getFullYear() + 1);
                          dataFim.setDate(dataFim.getDate() - 1);
                          form.setValue('vigencia_fim', dataFim);
                        }
                      }}
                      disabled={isLoading}
                      min="2020-01-01"
                      max="2030-12-31"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vigencia_fim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vigência Fim</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                        field.onChange(date);
                      }}
                      disabled={isLoading}
                      min="2020-01-01"
                      max="2030-12-31"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className={`grid grid-cols-1 ${taxa ? 'md:grid-cols-2' : ''} gap-4`}>
            <FormField
              control={form.control}
              name="tipo_calculo_adicional"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Cálculo - Hora Adicional</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setTipoCalculoAdicional(value as 'normal' | 'media');
                    }}
                    value={field.value || "media"}
                    defaultValue="media"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de cálculo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="normal">Normal (Valor Base + 15%)</SelectItem>
                      <SelectItem value="media">Média (Cálculo por Média)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo de Taxa de Reajuste - Apenas visível ao editar e quando não for personalizado */}
            {taxa && !personalizado && (
              <FormField
                control={form.control}
                name="taxa_reajuste"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Reajuste (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 5.5"
                        value={field.value || ''}
                        onChange={(e) => {
                          const valor = e.target.value ? parseFloat(e.target.value) : undefined;
                          field.onChange(valor);
                          
                          // ✅ MUDANÇA AUTOMÁTICA: Quando digitar qualquer valor, mudar para "média"
                          if (valor && valor > 0) {
                            console.log('✅ [TAXA FORM] Valor digitado no campo Taxa de Reajuste:', valor);
                            console.log('🔄 [TAXA FORM] Alterando tipo de cálculo para média...');
                            form.setValue('tipo_calculo_adicional', 'media', { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                            setTipoCalculoAdicional('media');
                            console.log('✅ [TAXA FORM] Tipo de cálculo alterado para:', form.getValues('tipo_calculo_adicional'));
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Checkbox Personalizado */}
          <div className='grid grid-cols-1 md:grid-cols-2'>
          <FormField
            control={form.control}
            name="personalizado"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      setPersonalizado(checked as boolean);
                    }}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="font-semibold">
                    Personalizado
                  </FormLabel>
                </div>
              </FormItem>
              
            )}
          />
          </div>
        </div>

        {/* Campos Específicos por Cliente */}
        {clienteSelecionado && clienteTemCamposEspecificos(clienteSelecionado) && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Campos Específicos - {clienteSelecionado}</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {getCamposEspecificosPorCliente(clienteSelecionado).map((campo) => (
                <FormField
                  key={campo.campo}
                  control={form.control}
                  name={campo.campo}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{campo.label}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={campo.placeholder}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tabela de Valores Remotos */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Valores Hora Remota</h3>
          
          <div className="overflow-x-auto rounded-lg border-gray-200 dark:border-gray-700">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '200px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '130px' }} />
              </colgroup>
              <thead>
                <tr className="bg-[#0066FF] text-white">
                  <th className="border-r border-white/20 px-3 py-2.5 text-left text-xs font-semibold">Função</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>08h30-17h30</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>17h30-19h30</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>Após 19h30</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Sáb/Dom/<br/>Feriados</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Hora Adicional <br/>(Excedente do Banco)</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold">Stand<br/>By</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {funcoes.map((funcao, index) => {
                  const valores = valoresCalculadosRemota[funcao];
                  
                  const campoNome = funcao === 'Funcional' ? 'funcional' 
                    : (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') ? 'tecnico'
                    : funcao === 'ABAP - PL/SQL' ? 'abap'
                    : (funcao === 'DBA / Basis' || funcao === 'DBA') ? 'dba'
                    : 'gestor';

                  return (
                    <tr key={funcao} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'}>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-900 dark:text-white">{funcao}</td>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-2 py-2">
                        <FormField
                          control={form.control}
                          name={`valores_remota.${campoNome}`}
                          render={({ field }) => {
                            const fieldKey = `remota_${campoNome}`;
                            const isEditing = valoresEditando[fieldKey] !== undefined;
                            
                            return (
                              <Input
                                type="text"
                                value={isEditing ? valoresEditando[fieldKey] : formatarMoeda(field.value || 0)}
                                onChange={(e) => {
                                  setValoresEditando({ ...valoresEditando, [fieldKey]: e.target.value });
                                }}
                                onFocus={(e) => {
                                  e.target.select();
                                  setValoresEditando({ ...valoresEditando, [fieldKey]: formatarMoeda(field.value || 0) });
                                }}
                                onBlur={(e) => {
                                  const valor = converterMoedaParaNumero(e.target.value);
                                  field.onChange(valor);
                                  const newValues = { ...valoresEditando };
                                  delete newValues[fieldKey];
                                  setValoresEditando(newValues);
                                  
                                  // BLOQUEIO CRÍTICO: Só calcular valores locais se NÃO for personalizado E não estiver editando taxa existente
                                  if (!personalizado && !taxa) {
                                    setTimeout(() => {
                                      const valoresRemotosAtuais = form.getValues('valores_remota');
                                      if (valoresRemotosAtuais) {
                                        const valoresLocaisCalculados = calcularValoresLocaisAutomaticos(valoresRemotosAtuais);
                                        form.setValue('valores_local', valoresLocaisCalculados);
                                      }
                                    }, 100);
                                  }
                                }}
                                className="text-right text-xs h-8 pr-3"
                                placeholder="0,00"
                              />
                            );
                          }}
                        />
                      </td>
                      {/* Valor 17h30-19h30 - Editável se personalizado */}
                      <td className="border-r border-gray-200 dark:border-gray-700 px-2 py-2 bg-blue-50 dark:bg-blue-900/20">
                        {personalizado ? (
                          <FormField
                            control={form.control}
                            name={`valores_remota_personalizados.${funcao}.valor_17h30_19h30`}
                            render={({ field }) => {
                              const fieldKey = `remota_${campoNome}_17h30`;
                              const isEditing = valoresEditando[fieldKey] !== undefined;
                              const valorAtual = field.value !== undefined ? field.value : valores?.valor_17h30_19h30 || 0;
                              
                              return (
                                <Input
                                  type="text"
                                  value={isEditing ? valoresEditando[fieldKey] : formatarMoeda(valorAtual)}
                                  onChange={(e) => {
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: e.target.value });
                                  }}
                                  onFocus={(e) => {
                                    e.target.select();
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: formatarMoeda(valorAtual) });
                                  }}
                                  onBlur={(e) => {
                                    const valor = converterMoedaParaNumero(e.target.value);
                                    field.onChange(valor);
                                    const newValues = { ...valoresEditando };
                                    delete newValues[fieldKey];
                                    setValoresEditando(newValues);
                                  }}
                                  className="text-right text-xs h-8 pr-3"
                                  placeholder="0,00"
                                />
                              );
                            }}
                          />
                        ) : (
                          <div className="text-center text-xs text-gray-700 dark:text-gray-300">
                            R$ {formatarMoeda(valores?.valor_17h30_19h30 || 0)}
                          </div>
                        )}
                      </td>
                      
                      {/* Valor Após 19h30 - Editável se personalizado */}
                      <td className="border-r border-gray-200 dark:border-gray-700 px-2 py-2 bg-blue-50 dark:bg-blue-900/20">
                        {personalizado ? (
                          <FormField
                            control={form.control}
                            name={`valores_remota_personalizados.${funcao}.valor_apos_19h30`}
                            render={({ field }) => {
                              const fieldKey = `remota_${campoNome}_apos19h30`;
                              const isEditing = valoresEditando[fieldKey] !== undefined;
                              const valorAtual = field.value !== undefined ? field.value : valores?.valor_apos_19h30 || 0;
                              
                              return (
                                <Input
                                  type="text"
                                  value={isEditing ? valoresEditando[fieldKey] : formatarMoeda(valorAtual)}
                                  onChange={(e) => {
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: e.target.value });
                                  }}
                                  onFocus={(e) => {
                                    e.target.select();
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: formatarMoeda(valorAtual) });
                                  }}
                                  onBlur={(e) => {
                                    const valor = converterMoedaParaNumero(e.target.value);
                                    field.onChange(valor);
                                    const newValues = { ...valoresEditando };
                                    delete newValues[fieldKey];
                                    setValoresEditando(newValues);
                                  }}
                                  className="text-right text-xs h-8 pr-3"
                                  placeholder="0,00"
                                />
                              );
                            }}
                          />
                        ) : (
                          <div className="text-center text-xs text-gray-700 dark:text-gray-300">
                            R$ {formatarMoeda(valores?.valor_apos_19h30 || 0)}
                          </div>
                        )}
                      </td>
                      
                      {/* Valor Fim de Semana - Editável se personalizado */}
                      <td className="border-r border-gray-200 dark:border-gray-700 px-2 py-2 bg-blue-50 dark:bg-blue-900/20">
                        {personalizado ? (
                          <FormField
                            control={form.control}
                            name={`valores_remota_personalizados.${funcao}.valor_fim_semana`}
                            render={({ field }) => {
                              const fieldKey = `remota_${campoNome}_fimsemana`;
                              const isEditing = valoresEditando[fieldKey] !== undefined;
                              const valorAtual = field.value !== undefined ? field.value : valores?.valor_fim_semana || 0;
                              
                              return (
                                <Input
                                  type="text"
                                  value={isEditing ? valoresEditando[fieldKey] : formatarMoeda(valorAtual)}
                                  onChange={(e) => {
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: e.target.value });
                                  }}
                                  onFocus={(e) => {
                                    e.target.select();
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: formatarMoeda(valorAtual) });
                                  }}
                                  onBlur={(e) => {
                                    const valor = converterMoedaParaNumero(e.target.value);
                                    field.onChange(valor);
                                    const newValues = { ...valoresEditando };
                                    delete newValues[fieldKey];
                                    setValoresEditando(newValues);
                                  }}
                                  className="text-right text-xs h-8 pr-3"
                                  placeholder="0,00"
                                />
                              );
                            }}
                          />
                        ) : (
                          <div className="text-center text-xs text-gray-700 dark:text-gray-300">
                            R$ {formatarMoeda(valores?.valor_fim_semana || 0)}
                          </div>
                        )}
                      </td>
                      
                      {/* Valor Adicional - Editável se personalizado */}
                      <td className="border-r border-gray-200 dark:border-gray-700 px-2 py-2 bg-blue-50 dark:bg-blue-900/20">
                        {personalizado ? (
                          <FormField
                            control={form.control}
                            name={`valores_remota_personalizados.${funcao}.valor_adicional`}
                            render={({ field }) => {
                              const fieldKey = `remota_${campoNome}_adicional`;
                              const isEditing = valoresEditando[fieldKey] !== undefined;
                              const valorAtual = field.value !== undefined ? field.value : valores?.valor_adicional || 0;
                              
                              return (
                                <Input
                                  type="text"
                                  value={isEditing ? valoresEditando[fieldKey] : formatarMoeda(valorAtual)}
                                  onChange={(e) => {
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: e.target.value });
                                  }}
                                  onFocus={(e) => {
                                    e.target.select();
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: formatarMoeda(valorAtual) });
                                  }}
                                  onBlur={(e) => {
                                    const valor = converterMoedaParaNumero(e.target.value);
                                    field.onChange(valor);
                                    const newValues = { ...valoresEditando };
                                    delete newValues[fieldKey];
                                    setValoresEditando(newValues);
                                  }}
                                  className="text-right text-xs h-8 pr-3"
                                  placeholder="0,00"
                                />
                              );
                            }}
                          />
                        ) : (
                          <div className="text-center text-xs text-gray-700 dark:text-gray-300">
                            R$ {formatarMoeda(valores?.valor_adicional || 0)}
                          </div>
                        )}
                      </td>
                      
                      {/* Valor Stand By - Editável se personalizado */}
                      <td className="px-2 py-2 bg-blue-50 dark:bg-blue-900/20">
                        {personalizado ? (
                          <FormField
                            control={form.control}
                            name={`valores_remota_personalizados.${funcao}.valor_standby`}
                            render={({ field }) => {
                              const fieldKey = `remota_${campoNome}_standby`;
                              const isEditing = valoresEditando[fieldKey] !== undefined;
                              const valorAtual = field.value !== undefined ? field.value : valores?.valor_standby || 0;
                              
                              return (
                                <Input
                                  type="text"
                                  value={isEditing ? valoresEditando[fieldKey] : formatarMoeda(valorAtual)}
                                  onChange={(e) => {
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: e.target.value });
                                  }}
                                  onFocus={(e) => {
                                    e.target.select();
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: formatarMoeda(valorAtual) });
                                  }}
                                  onBlur={(e) => {
                                    const valor = converterMoedaParaNumero(e.target.value);
                                    field.onChange(valor);
                                    const newValues = { ...valoresEditando };
                                    delete newValues[fieldKey];
                                    setValoresEditando(newValues);
                                  }}
                                  className="text-right text-xs h-8 pr-3"
                                  placeholder="0,00"
                                />
                              );
                            }}
                          />
                        ) : (
                          <div className="text-center text-xs text-gray-700 dark:text-gray-300">
                            R$ {formatarMoeda(valores?.valor_standby || 0)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela de Valores Locais */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Valores Hora Local</h3>
          </div>
          
          <div className="rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '200px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '280px' }} />
              </colgroup>
              <thead>
                <tr className="bg-[#0066FF] text-white">
                  <th className="border-r border-white/20 px-3 py-2.5 text-left text-xs font-semibold rounded-tl-lg">Função</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>08h30-17h30</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>17h30-19h30</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>Após 19h30</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold rounded-tr-lg">Sáb/Dom/<br/>Feriados</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {funcoes.map((funcao, index) => {
                  const valores = valoresCalculadosLocal[funcao];
                  const campoNome = funcao === 'Funcional' ? 'funcional' 
                    : (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') ? 'tecnico'
                    : funcao === 'ABAP - PL/SQL' ? 'abap'
                    : (funcao === 'DBA / Basis' || funcao === 'DBA') ? 'dba'
                    : 'gestor';

                  return (
                    <tr key={funcao} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'}>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-900 dark:text-white">{funcao}</td>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-2 py-2">
                        <FormField
                          control={form.control}
                          name={`valores_local.${campoNome}`}
                          render={({ field }) => {
                            const fieldKey = `local_${campoNome}`;
                            const isEditing = valoresEditando[fieldKey] !== undefined;
                            
                            return (
                              <Input
                                type="text"
                                value={isEditing ? valoresEditando[fieldKey] : formatarMoeda(field.value || 0)}
                                onChange={(e) => {
                                  setValoresEditando({ ...valoresEditando, [fieldKey]: e.target.value });
                                }}
                                onFocus={(e) => {
                                  e.target.select();
                                  setValoresEditando({ ...valoresEditando, [fieldKey]: formatarMoeda(field.value || 0) });
                                }}
                                onBlur={(e) => {
                                  const valor = converterMoedaParaNumero(e.target.value);
                                  field.onChange(valor);
                                  const newValues = { ...valoresEditando };
                                  delete newValues[fieldKey];
                                  setValoresEditando(newValues);
                                }}
                                className="text-right text-xs h-8 pr-3"
                                placeholder="0,00"
                              />
                            );
                          }}
                        />
                      </td>
                      {/* Valor 17h30-19h30 - Editável se personalizado */}
                      <td className="border-r border-gray-200 dark:border-gray-700 px-2 py-2 bg-blue-50 dark:bg-blue-900/20">
                        {personalizado ? (
                          <FormField
                            control={form.control}
                            name={`valores_local_personalizados.${funcao}.valor_17h30_19h30`}
                            render={({ field }) => {
                              const fieldKey = `local_${campoNome}_17h30`;
                              const isEditing = valoresEditando[fieldKey] !== undefined;
                              const valorAtual = field.value !== undefined ? field.value : valores?.valor_17h30_19h30 || 0;
                              
                              return (
                                <Input
                                  type="text"
                                  value={isEditing ? valoresEditando[fieldKey] : formatarMoeda(valorAtual)}
                                  onChange={(e) => {
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: e.target.value });
                                  }}
                                  onFocus={(e) => {
                                    e.target.select();
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: formatarMoeda(valorAtual) });
                                  }}
                                  onBlur={(e) => {
                                    const valor = converterMoedaParaNumero(e.target.value);
                                    field.onChange(valor);
                                    const newValues = { ...valoresEditando };
                                    delete newValues[fieldKey];
                                    setValoresEditando(newValues);
                                  }}
                                  className="text-right text-xs h-8 pr-3"
                                  placeholder="0,00"
                                />
                              );
                            }}
                          />
                        ) : (
                          <div className="text-center text-xs text-gray-700 dark:text-gray-300">
                            R$ {formatarMoeda(valores?.valor_17h30_19h30 || 0)}
                          </div>
                        )}
                      </td>
                      
                      {/* Valor Após 19h30 - Editável se personalizado */}
                      <td className="border-r border-gray-200 dark:border-gray-700 px-2 py-2 bg-blue-50 dark:bg-blue-900/20">
                        {personalizado ? (
                          <FormField
                            control={form.control}
                            name={`valores_local_personalizados.${funcao}.valor_apos_19h30`}
                            render={({ field }) => {
                              const fieldKey = `local_${campoNome}_apos19h30`;
                              const isEditing = valoresEditando[fieldKey] !== undefined;
                              const valorAtual = field.value !== undefined ? field.value : valores?.valor_apos_19h30 || 0;
                              
                              return (
                                <Input
                                  type="text"
                                  value={isEditing ? valoresEditando[fieldKey] : formatarMoeda(valorAtual)}
                                  onChange={(e) => {
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: e.target.value });
                                  }}
                                  onFocus={(e) => {
                                    e.target.select();
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: formatarMoeda(valorAtual) });
                                  }}
                                  onBlur={(e) => {
                                    const valor = converterMoedaParaNumero(e.target.value);
                                    field.onChange(valor);
                                    const newValues = { ...valoresEditando };
                                    delete newValues[fieldKey];
                                    setValoresEditando(newValues);
                                  }}
                                  className="text-right text-xs h-8 pr-3"
                                  placeholder="0,00"
                                />
                              );
                            }}
                          />
                        ) : (
                          <div className="text-center text-xs text-gray-700 dark:text-gray-300">
                            R$ {formatarMoeda(valores?.valor_apos_19h30 || 0)}
                          </div>
                        )}
                      </td>
                      
                      {/* Valor Fim de Semana - Editável se personalizado */}
                      <td className={`px-2 py-2 bg-blue-50 dark:bg-blue-900/20 ${index === funcoes.length - 1 ? 'rounded-br-lg' : ''}`}>
                        {personalizado ? (
                          <FormField
                            control={form.control}
                            name={`valores_local_personalizados.${funcao}.valor_fim_semana`}
                            render={({ field }) => {
                              const fieldKey = `local_${campoNome}_fimsemana`;
                              const isEditing = valoresEditando[fieldKey] !== undefined;
                              const valorAtual = field.value !== undefined ? field.value : valores?.valor_fim_semana || 0;
                              
                              return (
                                <Input
                                  type="text"
                                  value={isEditing ? valoresEditando[fieldKey] : formatarMoeda(valorAtual)}
                                  onChange={(e) => {
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: e.target.value });
                                  }}
                                  onFocus={(e) => {
                                    e.target.select();
                                    setValoresEditando({ ...valoresEditando, [fieldKey]: formatarMoeda(valorAtual) });
                                  }}
                                  onBlur={(e) => {
                                    const valor = converterMoedaParaNumero(e.target.value);
                                    field.onChange(valor);
                                    const newValues = { ...valoresEditando };
                                    delete newValues[fieldKey];
                                    setValoresEditando(newValues);
                                  }}
                                  className="text-right text-xs h-8 pr-3"
                                  placeholder="0,00"
                                />
                              );
                            }}
                          />
                        ) : (
                          <div className="text-center text-xs text-gray-700 dark:text-gray-300">
                            R$ {formatarMoeda(valores?.valor_fim_semana || 0)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            onClick={() => {
              console.log('🖱️ [TAXA FORM] Botão clicado!');
              console.log('🔧 [TAXA FORM] Tipo do botão:', taxa ? 'Atualizar' : 'Criar');
              console.log('⚡ [TAXA FORM] Estado isLoading:', isLoading);
              console.log('📋 [TAXA FORM] Formulário válido?', form.formState.isValid);
              console.log('❌ [TAXA FORM] Erros do formulário:', form.formState.errors);
            }}
          >
            {isLoading ? 'Salvando...' : taxa ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
