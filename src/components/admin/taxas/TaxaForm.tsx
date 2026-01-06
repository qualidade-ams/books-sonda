import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useEmpresas } from '@/hooks/useEmpresas';
import type { TaxaClienteCompleta, TaxaFormData, TipoProduto } from '@/types/taxasClientes';
import { calcularValores, getFuncoesPorProduto, calcularValoresLocaisAutomaticos, getCamposEspecificosPorCliente, clienteTemCamposEspecificos } from '@/types/taxasClientes';

interface TaxaFormProps {
  taxa?: TaxaClienteCompleta | null;
  onSubmit: (dados: TaxaFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TaxaForm({ taxa, onSubmit, onCancel, isLoading }: TaxaFormProps) {
  const { empresas } = useEmpresas();
  const [tipoProdutoSelecionado, setTipoProdutoSelecionado] = useState<TipoProduto | ''>(taxa?.tipo_produto || '');
  const [tipoCalculoAdicional, setTipoCalculoAdicional] = useState<'normal' | 'media'>(taxa?.tipo_calculo_adicional || 'media');
  const [produtosCliente, setProdutosCliente] = useState<string[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [valoresEditando, setValoresEditando] = useState<Record<string, string>>({});
  const [valoresOriginais, setValoresOriginais] = useState<any>(null);
  const [personalizado, setPersonalizado] = useState<boolean>(taxa?.personalizado || false);
  
  // Função para formatar valor como moeda
  const formatarMoeda = (valor: number): string => {
    console.log(`💰 [FORMATAR] Formatando valor:`, valor, 'tipo:', typeof valor);
    const resultado = valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    console.log(`💰 [FORMATAR] Resultado:`, resultado);
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

        // Se cliente não tem AMS, preencher com taxa padrão
        if (empresa.tem_ams === false) {
          import('@/services/taxaPadraoService').then(async ({ buscarTaxaPadrao }) => {
            // Determinar tipo de produto baseado nos produtos do cliente
            let tipoProduto: 'GALLERY' | 'OUTROS' = 'GALLERY';
            if (produtos.includes('GALLERY')) {
              tipoProduto = 'GALLERY';
            } else if (produtos.length > 0) {
              tipoProduto = 'OUTROS';
            }

            const taxaPadrao = await buscarTaxaPadrao(tipoProduto);
            if (taxaPadrao) {
              form.setValue('tipo_produto', taxaPadrao.tipo_produto);
              form.setValue('valores_remota', taxaPadrao.valores_remota);
              form.setValue('valores_local', taxaPadrao.valores_local);
              setTipoProdutoSelecionado(taxaPadrao.tipo_produto);
            }
          });
        }
      } else {
        setProdutosCliente([]);
      }
    }
  }, [clienteSelecionado, empresas, form, taxa]);

  // Preencher formulário ao editar
  useEffect(() => {
    if (taxa && empresas.length > 0) {
      console.log('🔄 [DEBUG] Preenchendo formulário com taxa:', taxa);
      console.log('🔄 [DEBUG] Taxa personalizada:', taxa.personalizado);
      console.log('🔄 [DEBUG] Valores remota da taxa:', taxa.valores_remota);
      console.log('🔄 [DEBUG] Valores local da taxa:', taxa.valores_local);
      
      const empresa = empresas.find(e => e.id === taxa.cliente_id);
      
      if (empresa) {
        // Carregar produtos do cliente PRIMEIRO
        if (empresa.produtos) {
          const produtos = empresa.produtos.map((p: any) => p.produto);
          setProdutosCliente(produtos);
        }
        setClienteSelecionado(empresa.nome_abreviado);
        
        // Aguardar um tick para garantir que os estados foram atualizados
        setTimeout(() => {
          const valoresIniciais = {
            cliente_id: empresa.nome_abreviado,
            vigencia_inicio: taxa.vigencia_inicio ? new Date(taxa.vigencia_inicio + 'T00:00:00') : undefined,
            vigencia_fim: taxa.vigencia_fim ? new Date(taxa.vigencia_fim + 'T00:00:00') : undefined,
            tipo_produto: taxa.tipo_produto,
            tipo_calculo_adicional: taxa.tipo_calculo_adicional || 'media',
            personalizado: taxa.personalizado || false,
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
          
          console.log('🔄 [DEBUG] Valores iniciais mapeados:', valoresIniciais);
          console.log('🔄 [DEBUG] Mapeamento valores remota:', {
            funcional: taxa.valores_remota?.find(v => v.funcao === 'Funcional'),
            tecnico: taxa.valores_remota?.find(v => v.funcao === 'Técnico / ABAP' || v.funcao === 'Técnico (Instalação / Atualização)'),
            abap: taxa.valores_remota?.find(v => v.funcao === 'ABAP - PL/SQL'),
            dba: taxa.valores_remota?.find(v => v.funcao === 'DBA / Basis' || v.funcao === 'DBA'),
            gestor: taxa.valores_remota?.find(v => v.funcao === 'Gestor')
          });
          console.log('🔄 [DEBUG] Mapeamento valores local:', {
            funcional: taxa.valores_local?.find(v => v.funcao === 'Funcional'),
            tecnico: taxa.valores_local?.find(v => v.funcao === 'Técnico / ABAP' || v.funcao === 'Técnico (Instalação / Atualização)'),
            abap: taxa.valores_local?.find(v => v.funcao === 'ABAP - PL/SQL'),
            dba: taxa.valores_local?.find(v => v.funcao === 'DBA / Basis' || v.funcao === 'DBA'),
            gestor: taxa.valores_local?.find(v => v.funcao === 'Gestor')
          });
          
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
          setPersonalizado(taxa.personalizado || false);
        }, 0);
      }
    }
  }, [taxa, empresas, form]);

  const handleSubmit = (data: any) => {
    // Encontrar ID da empresa pelo nome abreviado
    const empresa = empresas.find(e => e.nome_abreviado === data.cliente_id);
    
    if (!empresa) {
      form.setError('cliente_id', { message: 'Cliente não encontrado' });
      return;
    }

    // Validar campos obrigatórios
    if (!data.vigencia_inicio) {
      form.setError('vigencia_inicio', { message: 'Vigência início é obrigatória' });
      return;
    }

    if (!data.tipo_produto) {
      form.setError('tipo_produto', { message: 'Tipo de produto é obrigatório' });
      return;
    }

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

    onSubmit(dadosFormatados);
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
  
  // Debug: Log dos valores observados
  console.log('🔍 [DEBUG] Valores observados:', {
    funcionalRemoto,
    tecnicoRemoto,
    abapRemoto,
    dbaRemoto,
    gestorRemoto,
    personalizado,
    valoresRemota
  });

  // NOVO: Calcular automaticamente valores locais quando valores remotos mudarem (10% a mais)
  useEffect(() => {
    // BLOQUEIO TOTAL: Se for personalizado, NÃO calcular NADA
    if (personalizado) {
      console.log('🚫 [CALC BLOCK] Taxa personalizada - bloqueando cálculo automático de valores locais');
      return;
    }
    
    if (valoresRemota) {
      // Verificar se há valores válidos
      const temValores = valoresRemota.funcional > 0 || valoresRemota.tecnico > 0 || 
                        valoresRemota.dba > 0 || valoresRemota.gestor > 0 ||
                        (valoresRemota.abap && valoresRemota.abap > 0);
      
      if (temValores) {
        console.log('🔄 [CALC AUTO] Calculando valores locais automaticamente (taxa não-personalizada)');
        const valoresLocaisCalculados = calcularValoresLocaisAutomaticos(valoresRemota);
        
        // Atualizar valores locais no formulário
        form.setValue('valores_local', valoresLocaisCalculados);
      }
    }
  }, [valoresRemota, personalizado, form]);

  // ADICIONAL: Monitorar campos específicos para garantir cálculo em tempo real
  useEffect(() => {
    // BLOQUEIO TOTAL: Se for personalizado, NÃO calcular NADA
    if (personalizado) {
      console.log('🚫 [CALC BLOCK] Taxa personalizada - bloqueando cálculo por campos específicos');
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
        console.log('🔄 [CALC AUTO] Recalculando valores locais por mudança de campo (taxa não-personalizada)');
        const valoresLocaisCalculados = calcularValoresLocaisAutomaticos(valoresAtuais);
        form.setValue('valores_local', valoresLocaisCalculados);
      }
    }
  }, [funcionalRemoto, tecnicoRemoto, abapRemoto, dbaRemoto, gestorRemoto, personalizado, form]);

  // Recalcular valores e vigências quando taxa de reajuste mudar (apenas em edição e não personalizado)
  useEffect(() => {
    // BLOQUEIO TOTAL: Se for personalizado, NÃO calcular NADA
    if (personalizado) {
      console.log('🚫 [CALC BLOCK] Taxa personalizada - bloqueando cálculo de reajuste');
      return;
    }
    
    if (taxa && valoresOriginais && taxaReajuste && taxaReajuste > 0) {
      console.log('🔄 [CALC AUTO] Aplicando reajuste (taxa não-personalizada)');
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
      console.log('🔄 [CALC AUTO] Restaurando valores originais (taxa não-personalizada)');
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

    console.log(`🔍 [DEBUG CALC] Iniciando calcularValoresExibicao - tipo: ${tipo}, personalizado: ${personalizado}, taxa existe: ${!!taxa}`);
    console.log(`🔍 [DEBUG CALC] Valores recebidos:`, valores);
    console.log(`🔍 [DEBUG CALC] Funções para produto:`, funcoes);
    
    if (taxa) {
      console.log(`🔍 [DEBUG CALC] Taxa dados:`, {
        id: taxa.id,
        personalizado: taxa.personalizado,
        valores_remota_count: taxa.valores_remota?.length,
        valores_local_count: taxa.valores_local?.length,
        valores_remota_sample: taxa.valores_remota?.[0],
        valores_local_sample: taxa.valores_local?.[0]
      });
    }

    funcoes.forEach(funcao => {
      console.log(`🔍 [DEBUG CALC] Processando função: ${funcao}`);
      
      // PRIORIDADE ABSOLUTA: Se for taxa personalizada, SEMPRE usar valores salvos no banco
      if (personalizado && taxa) {
        const valoresSalvos = tipo === 'remota' ? taxa.valores_remota : taxa.valores_local;
        console.log(`🔍 [DEBUG CALC] Valores salvos para ${tipo}:`, valoresSalvos);
        
        const valorSalvo = valoresSalvos?.find(v => v.funcao === funcao);
        
        console.log(`🔍 [DEBUG CALC] Função ${funcao} (${tipo}) - valorSalvo:`, valorSalvo);
        
        if (valorSalvo) {
          // Para taxas personalizadas, usar EXATAMENTE os valores do banco
          const valoresSalvosNoBanco = {
            funcao: valorSalvo.funcao,
            valor_base: valorSalvo.valor_base,
            valor_17h30_19h30: valorSalvo.valor_17h30_19h30 ?? 0,
            valor_apos_19h30: valorSalvo.valor_apos_19h30 ?? 0,
            valor_fim_semana: valorSalvo.valor_fim_semana ?? 0,
            valor_adicional: tipo === 'remota' ? (valorSalvo.valor_adicional ?? 0) : 0,
            valor_standby: tipo === 'remota' ? (valorSalvo.valor_standby ?? 0) : 0
          };
          
          console.log(`✅ [DEBUG CALC] Usando valores EXATOS do banco para ${funcao} (${tipo}):`, valoresSalvosNoBanco);
          console.log(`🔍 [DEBUG CALC] Valores originais do banco:`, {
            valor_17h30_19h30: valorSalvo.valor_17h30_19h30,
            valor_apos_19h30: valorSalvo.valor_apos_19h30,
            valor_fim_semana: valorSalvo.valor_fim_semana,
            valor_adicional: valorSalvo.valor_adicional,
            valor_standby: valorSalvo.valor_standby
          });
          resultado[funcao] = valoresSalvosNoBanco;
          console.log(`🚫 [DEBUG CALC] PULANDO cálculo automático para ${funcao} (personalizado)`);
          return; // IMPORTANTE: Este return só pula para próxima iteração do forEach, NÃO sai da função!
        } else {
          console.log(`❌ [DEBUG CALC] ERRO: Valor salvo não encontrado para ${funcao} (${tipo})`);
          // Se não encontrar valor salvo, criar um valor zerado para evitar erro
          resultado[funcao] = {
            funcao: funcao,
            valor_base: 0,
            valor_17h30_19h30: 0,
            valor_apos_19h30: 0,
            valor_fim_semana: 0,
            valor_adicional: 0,
            valor_standby: 0
          };
          return;
        }
      }

      // ATENÇÃO: Se chegou aqui para taxa personalizada, há um erro!
      if (personalizado && taxa) {
        console.log(`🚨 [DEBUG CALC] ERRO CRÍTICO: Taxa personalizada chegou no cálculo automático para ${funcao} (${tipo})`);
      }

      // Cálculo automático APENAS para taxas não-personalizadas
      if (!personalizado) {
        console.log(`🔄 [DEBUG CALC] Calculando automaticamente para ${funcao} (${tipo})`);
        let valorBase = 0;
        
        if (funcao === 'Funcional') {
          valorBase = valores.funcional || 0;
        } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
          valorBase = valores.tecnico || 0;
        } else if (funcao === 'ABAP - PL/SQL') {
          valorBase = valores.abap || 0;
        } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
          valorBase = valores.dba || 0;
        } else if (funcao === 'Gestor') {
          valorBase = valores.gestor || 0;
        }

        // Preparar array com todas as funções para cálculo da média
        const todasFuncoes = funcoes.map(f => {
          let vb = 0;
          if (f === 'Funcional') vb = valores.funcional || 0;
          else if (f === 'Técnico / ABAP' || f === 'Técnico (Instalação / Atualização)') vb = valores.tecnico || 0;
          else if (f === 'ABAP - PL/SQL') vb = valores.abap || 0;
          else if (f === 'DBA / Basis' || f === 'DBA') vb = valores.dba || 0;
          else if (f === 'Gestor') vb = valores.gestor || 0;
          return { funcao: f, valor_base: vb };
        });

        // Usar parâmetro isLocal para aplicar 10% a mais nos valores locais
        const isLocal = tipo === 'local';
        resultado[funcao] = calcularValores(valorBase, funcao, todasFuncoes, tipoCalculoAdicional, tipoProdutoSelecionado || 'GALLERY', isLocal);
        console.log(`✅ [DEBUG CALC] Valor calculado para ${funcao} (${tipo}):`, resultado[funcao]);
      } else {
        console.log(`🚫 [DEBUG CALC] Pulando cálculo para taxa personalizada ${funcao} (${tipo})`);
      }
    });

    console.log(`🔍 [DEBUG CALC] Resultado final calcularValoresExibicao (${tipo}):`, resultado);
    return resultado;
  };

  const valoresCalculadosRemota = calcularValoresExibicao(valoresRemota, 'remota');
  const valoresCalculadosLocal = calcularValoresExibicao(valoresLocal, 'local');

  console.log(`🎯 [VALORES CALCULADOS] valoresCalculadosRemota:`, valoresCalculadosRemota);
  console.log(`🎯 [VALORES CALCULADOS] valoresCalculadosLocal:`, valoresCalculadosLocal);

  const funcoes = getFuncoesPorProduto(tipoProdutoSelecionado || 'GALLERY');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                  console.log(`🎯 [RENDER MAP] Função: ${funcao}, valores:`, valores);
                  
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
                                  
                                  // BLOQUEIO: Só calcular valores locais se NÃO for personalizado
                                  if (!personalizado) {
                                    console.log('🔄 [ON BLUR] Recalculando valores locais (taxa não-personalizada)');
                                    setTimeout(() => {
                                      const valoresRemotosAtuais = form.getValues('valores_remota');
                                      if (valoresRemotosAtuais) {
                                        const valoresLocaisCalculados = calcularValoresLocaisAutomaticos(valoresRemotosAtuais);
                                        form.setValue('valores_local', valoresLocaisCalculados);
                                      }
                                    }, 100);
                                  } else {
                                    console.log('🚫 [ON BLUR] Taxa personalizada - bloqueando recálculo de valores locais');
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
                            {console.log(`🔍 [RENDER REMOTA] ${funcao} - valor_17h30_19h30:`, valores?.valor_17h30_19h30, 'valores completos:', valores)}
                            {console.log(`🔍 [RENDER REMOTA] ${funcao} - formatarMoeda(${valores?.valor_17h30_19h30}):`, formatarMoeda(valores?.valor_17h30_19h30 || 0))}
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
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : taxa ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
