import React, { useEffect, useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputHoras } from '@/components/ui/input-horas';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { cn } from '@/lib/utils';
import { TIPO_COBRANCA_OPTIONS, TIPO_HORA_EXTRA_OPTIONS } from '@/types/requerimentos';
import { formatarHorasParaExibicao, converterParaHorasDecimal, somarHoras } from '@/utils/horasUtils';
import { buscarTaxaVigente } from '@/services/taxasClientesService';
import type { TaxaClienteCompleta, TipoFuncao } from '@/types/taxasClientes';
import { calcularValores } from '@/types/taxasClientes';

export interface TipoCobrancaBlocoData {
  id: string;
  tipo_cobranca: string;
  horas_funcional: string | number;
  horas_tecnico: string | number;
  valor_hora_funcional?: number;
  valor_hora_tecnico?: number;
  tipo_hora_extra?: string;
  quantidade_tickets?: number;
  horas_analise_ef?: string | number;
  mes_cobranca?: string;
  atendimento_presencial?: boolean;
  linguagem?: string;
}

interface TipoCobrancaBlocoProps {
  bloco: TipoCobrancaBlocoData;
  index: number;
  tiposDisponiveis: typeof TIPO_COBRANCA_OPTIONS;
  onUpdate: (id: string, campo: string, valor: any) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  empresaTipoCobranca?: string;
  clienteId?: string; // NOVO: ID do cliente para buscar taxa
  tentouSubmeter?: boolean; // NOVO: Flag para mostrar erros visuais
}

export function TipoCobrancaBloco({
  bloco,
  index,
  tiposDisponiveis,
  onUpdate,
  onRemove,
  canRemove,
  empresaTipoCobranca,
  clienteId,
  tentouSubmeter = false
}: TipoCobrancaBlocoProps) {
  const { t } = useTranslation();
  console.log('🎨🎨🎨 TipoCobrancaBloco RENDERIZADO 🎨🎨🎨', { 
    index, 
    clienteId, 
    linguagem: bloco.linguagem, 
    tipoCobranca: bloco.tipo_cobranca,
    valorHoraFuncional: bloco.valor_hora_funcional,
    valorHoraTecnico: bloco.valor_hora_tecnico
  });

  // Função helper para obter classes de erro para campos obrigatórios
  const getErrorClasses = (fieldValue: any, isRequired: boolean = true) => {
    if (!tentouSubmeter || !isRequired) return '';
    const isEmpty = !fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '');
    return isEmpty ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';
  };

  // Estado para taxa vigente do cliente
  const [taxaVigente, setTaxaVigente] = useState<TaxaClienteCompleta | null>(null);
  const [carregandoTaxa, setCarregandoTaxa] = useState(false);
  
  // Ref para controlar se valores foram editados manualmente (não causa re-render)
  const valoresEditadosManualmenteRef = useRef({
    funcional: false,
    tecnico: false
  });
  
  // Estado para controlar indicadores visuais de edição manual
  const [valoresEditadosManualmente, setValoresEditadosManualmente] = useState({
    funcional: false,
    tecnico: false
  });
  
  // Ref para rastrear valores anteriores e evitar loop infinito
  const valoresAnterioresRef = useRef<{
    funcional: number | undefined;
    tecnico: number | undefined;
  }>({
    funcional: undefined,
    tecnico: undefined
  });

  // useEffect para buscar taxa vigente quando cliente ou tipo de cobrança mudar
  useEffect(() => {
    console.log('🚀🚀🚀 useEffect de busca de taxa EXECUTADO (TipoCobrancaBloco) 🚀🚀🚀');
    
    const tiposComValorHora = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];
    const precisaTaxa = bloco.tipo_cobranca && tiposComValorHora.includes(bloco.tipo_cobranca);
    
    console.log('🔍 Verificando necessidade de buscar taxa:', {
      clienteId,
      tipoCobranca: bloco.tipo_cobranca,
      precisaTaxa
    });
    
    if (!clienteId || !precisaTaxa) {
      console.log('❌ Não precisa buscar taxa - limpando estado');
      setTaxaVigente(null);
      setCarregandoTaxa(false);
      return;
    }

    console.log('✅ Iniciando busca de taxa vigente para cliente:', clienteId);
    const buscarTaxa = async () => {
      setCarregandoTaxa(true);
      try {
        const taxa = await buscarTaxaVigente(clienteId);
        console.log('✅ Taxa encontrada com sucesso!');
        console.log('📋 Taxa completa:', JSON.stringify(taxa, null, 2));
        setTaxaVigente(taxa);
      } catch (error) {
        console.error('❌ Erro ao buscar taxa vigente:', error);
        setTaxaVigente(null);
      } finally {
        setCarregandoTaxa(false);
      }
    };

    buscarTaxa();
  }, [clienteId, bloco.tipo_cobranca]);

  // useEffect para preencher valores automaticamente baseado na taxa vigente
  useEffect(() => {
    // Usar setTimeout para garantir que a edição manual seja processada primeiro
    const timeoutId = setTimeout(() => {
      console.log('='.repeat(80));
      console.log('🔄 INÍCIO DO PREENCHIMENTO AUTOMÁTICO (TipoCobrancaBloco)');
      console.log('='.repeat(80));
      console.log('📊 Estado atual:', {
        taxaVigente: !!taxaVigente,
        linguagem: bloco.linguagem,
        tipoCobranca: bloco.tipo_cobranca,
        tipoHoraExtra: bloco.tipo_hora_extra,
        valorAtualFuncional: bloco.valor_hora_funcional,
        valorAtualTecnico: bloco.valor_hora_tecnico,
        horasTecnicoDecimal,
        refFuncional: valoresAnterioresRef.current.funcional,
        refTecnico: valoresAnterioresRef.current.tecnico,
        editadoManualmenteFuncional: valoresEditadosManualmenteRef.current.funcional,
        editadoManualmenteTecnico: valoresEditadosManualmenteRef.current.tecnico
      });
      
      // CORREÇÃO: Permitir preenchimento mesmo sem linguagem quando não há horas técnicas
      if (!taxaVigente || !bloco.tipo_cobranca) {
        console.log('❌ Faltam dados para preencher valores automaticamente (taxa ou tipo de cobrança)');
        // Resetar ref quando não há dados
        valoresAnterioresRef.current = { funcional: undefined, tecnico: undefined };
        return;
      }
      
      // Se há horas técnicas, linguagem é obrigatória
      if (horasTecnicoDecimal > 0 && !bloco.linguagem) {
        console.log('❌ Há horas técnicas mas linguagem não foi selecionada');
        return;
      }
      
      if (!['Faturado', 'Hora Extra', 'Sobreaviso'].includes(bloco.tipo_cobranca)) {
        console.log('❌ Tipo de cobrança não requer preenchimento automático:', bloco.tipo_cobranca);
        return;
      }

      // Verificar se algum valor foi editado manualmente
      if (valoresEditadosManualmenteRef.current.funcional && valoresEditadosManualmenteRef.current.tecnico) {
        console.log('⏭️ Ambos os valores foram editados manualmente, pulando preenchimento automático');
        return;
      }

      console.log('✅ Iniciando preenchimento automático de valores');
    
      const tipoProduto = taxaVigente.tipo_produto;
    console.log('📦 Tipo de produto:', tipoProduto);
    
    // REGRA CORRETA:
    // Valor/Hora Funcional: SEMPRE usar linha "Funcional"
    // Valor/Hora Técnico: 
    //   - Se NÃO há horas técnicas: usar linha "Funcional" também
    //   - Se HÁ horas técnicas: usar linha correspondente à LINGUAGEM selecionada
    
    const funcaoFuncional: TipoFuncao = 'Funcional';
    
    const mapearLinguagemParaFuncao = (ling: string | undefined): TipoFuncao => {
      // Se não há linguagem (não há horas técnicas), usar Funcional
      if (!ling) {
        console.log('⚠️ Sem linguagem técnica - usando Funcional para ambos os valores');
        return 'Funcional';
      }
      
      // Mapear linguagem para a linha correspondente na tabela de taxas
      if (ling === 'Técnico') {
        // Se linguagem é Técnico, usar linha Técnico (Instalação / Atualização) ou Técnico / ABAP
        return tipoProduto === 'GALLERY' ? 'Técnico / ABAP' : 'Técnico (Instalação / Atualização)';
      }
      if (ling === 'ABAP' || ling === 'PL/SQL') {
        // Se linguagem é ABAP ou PL/SQL, usar linha ABAP - PL/SQL ou Técnico / ABAP
        return tipoProduto === 'GALLERY' ? 'Técnico / ABAP' : 'ABAP - PL/SQL';
      }
      if (ling === 'DBA') {
        // Se linguagem é DBA, usar linha DBA ou DBA / Basis
        return tipoProduto === 'GALLERY' ? 'DBA / Basis' : 'DBA';
      }
      // Fallback para Funcional se linguagem não reconhecida
      return 'Funcional';
    };

    const funcaoTecnico = mapearLinguagemParaFuncao(bloco.linguagem);
    console.log('🎯 Funções mapeadas:', { 
      funcaoFuncional, 
      funcaoTecnico, 
      linguagem: bloco.linguagem || 'N/A (sem horas técnicas)',
      horasTecnicoDecimal,
      explicacao: horasTecnicoDecimal > 0 
        ? `Valor/Hora Funcional usa linha "${funcaoFuncional}", Valor/Hora Técnico usa linha "${funcaoTecnico}"`
        : `Sem horas técnicas - ambos os valores usam linha "${funcaoFuncional}"`
    });

    // Determinar se deve usar valores locais ou remotos
    const usarValoresLocais = bloco.atendimento_presencial || false;
    const valoresParaUsar = usarValoresLocais ? taxaVigente.valores_local : taxaVigente.valores_remota;
    const tipoValor = usarValoresLocais ? 'locais' : 'remotos';
    
    console.log('🔍 Buscando valores na taxa...');
    console.log('📊 Tipo de atendimento:', usarValoresLocais ? 'PRESENCIAL (valores locais)' : 'REMOTO (valores remotos)');
    console.log('📊 Valores disponíveis:', valoresParaUsar);
    console.log('📊 Funções disponíveis na taxa:', valoresParaUsar?.map(v => v.funcao));
    
    const valorFuncaoFuncional = valoresParaUsar?.find(v => v.funcao === funcaoFuncional);
    const valorFuncaoTecnico = valoresParaUsar?.find(v => v.funcao === funcaoTecnico);

    console.log('🔍 Procurando por:', { funcaoFuncional, funcaoTecnico });
    console.log('💰 Valor encontrado para Funcional:', valorFuncaoFuncional);
    console.log('💰 Valor encontrado para Técnico:', valorFuncaoTecnico);

    if (!valorFuncaoFuncional || !valorFuncaoTecnico) {
      console.log('❌ ERRO: Valores não encontrados na taxa!');
      console.log('❌ Tipo de valor:', tipoValor);
      console.log('❌ Funções procuradas:', { funcaoFuncional, funcaoTecnico });
      console.log('❌ Funções disponíveis:', valoresParaUsar?.map(v => v.funcao));
      return;
    }
    
    console.log('✅ SUCESSO: Valores encontrados!');
    console.log('✅ Estrutura do valor Funcional:', JSON.stringify(valorFuncaoFuncional, null, 2));
    console.log('✅ Estrutura do valor Técnico:', JSON.stringify(valorFuncaoTecnico, null, 2));

    let valorHoraFuncional = 0;
    let valorHoraTecnico = 0;

    if (bloco.tipo_cobranca === 'Faturado') {
      valorHoraFuncional = valorFuncaoFuncional.valor_base;
      valorHoraTecnico = valorFuncaoTecnico.valor_base;
      console.log('📊 Usando valores de Hora Normal (Seg-Sex 08h30-17h30)');
      console.log('📊 valorFuncaoFuncional.valor_base:', valorFuncaoFuncional.valor_base);
      console.log('📊 valorFuncaoTecnico.valor_base:', valorFuncaoTecnico.valor_base);
    } else if (bloco.tipo_cobranca === 'Hora Extra') {
      if (!bloco.tipo_hora_extra) {
        console.log('⚠️ Tipo de hora extra não selecionado - limpando campos');
        console.log('   Valor Funcional atual:', bloco.valor_hora_funcional);
        console.log('   Valor Técnico atual:', bloco.valor_hora_tecnico);
        
        // Sempre limpar valores quando tipo de hora extra não está selecionado
        // Verificar se há algum valor diferente de 0 ou undefined
        const temValorFuncional = bloco.valor_hora_funcional && bloco.valor_hora_funcional !== 0;
        const temValorTecnico = bloco.valor_hora_tecnico && bloco.valor_hora_tecnico !== 0;
        
        if (temValorFuncional || temValorTecnico) {
          console.log('🧹 LIMPANDO VALORES DOS CAMPOS');
          console.log('   Funcional:', bloco.valor_hora_funcional, '→ 0');
          console.log('   Técnico:', bloco.valor_hora_tecnico, '→ 0');
          
          // Resetar ref para permitir novo preenchimento
          valoresAnterioresRef.current = { funcional: 0, tecnico: 0 };
          
          // Limpar ambos os campos para 0 (sempre limpar ambos juntos)
          onUpdate(bloco.id, 'valor_hora_funcional', 0);
          onUpdate(bloco.id, 'valor_hora_tecnico', 0);
        } else {
          console.log('✅ Campos já estão limpos (0 ou undefined)');
        }
        return;
      }
      
      if (bloco.tipo_hora_extra === '17h30-19h30') {
        valorHoraFuncional = valorFuncaoFuncional.valor_17h30_19h30;
        valorHoraTecnico = valorFuncaoTecnico.valor_17h30_19h30;
        console.log('📊 Usando valores de Hora Extra (Seg-Sex 17h30-19h30)');
      } else if (bloco.tipo_hora_extra === 'apos_19h30') {
        valorHoraFuncional = valorFuncaoFuncional.valor_apos_19h30;
        valorHoraTecnico = valorFuncaoTecnico.valor_apos_19h30;
        console.log('📊 Usando valores de Hora Extra (Seg-Sex Após 19h30)');
      } else if (bloco.tipo_hora_extra === 'fim_semana') {
        valorHoraFuncional = valorFuncaoFuncional.valor_fim_semana;
        valorHoraTecnico = valorFuncaoTecnico.valor_fim_semana;
        console.log('📊 Usando valores de Hora Extra (Sáb/Dom/Feriados)');
      }
    } else if (bloco.tipo_cobranca === 'Sobreaviso') {
      valorHoraFuncional = valorFuncaoFuncional.valor_standby;
      valorHoraTecnico = valorFuncaoTecnico.valor_standby;
      console.log('📊 Usando valores de Sobreaviso (Stand By)');
    }

    const valorHoraFuncionalArredondado = Math.round(valorHoraFuncional * 100) / 100;
    const valorHoraTecnicoArredondado = Math.round(valorHoraTecnico * 100) / 100;

    console.log('💵 Valores calculados:', {
      valorHoraFuncional: valorHoraFuncionalArredondado,
      valorHoraTecnico: valorHoraTecnicoArredondado
    });

    // Preencher os campos apenas se não foram editados manualmente
    const valorAtualFuncional = bloco.valor_hora_funcional;
    const valorAtualTecnico = bloco.valor_hora_tecnico;
    
    console.log('📝 Valores atuais no bloco:', {
      valorAtualFuncional,
      valorAtualTecnico,
      editadoManualmenteFuncional: valoresEditadosManualmenteRef.current.funcional,
      editadoManualmenteTecnico: valoresEditadosManualmenteRef.current.tecnico
    });
    
      // Preencher valor funcional se não foi editado manualmente
      if (!valoresEditadosManualmenteRef.current.funcional) {
        console.log('✅ PREENCHENDO valor_hora_funcional (automático):', valorHoraFuncionalArredondado);
        console.log('🔧 Chamando onUpdate com:', { id: bloco.id, campo: 'valor_hora_funcional', valor: valorHoraFuncionalArredondado });
        onUpdate(bloco.id, 'valor_hora_funcional', valorHoraFuncionalArredondado);
        console.log('✅ Valor funcional preenchido com sucesso!');
        console.log('📊 Valor atual no bloco após preenchimento:', bloco.valor_hora_funcional);
      } else {
        console.log('⏭️ Valor funcional editado manualmente, mantendo:', valorAtualFuncional);
      }
      
      // Preencher valor técnico se não foi editado manualmente
      if (!valoresEditadosManualmenteRef.current.tecnico) {
        console.log('✅ PREENCHENDO valor_hora_tecnico (automático):', valorHoraTecnicoArredondado);
        onUpdate(bloco.id, 'valor_hora_tecnico', valorHoraTecnicoArredondado);
        console.log('✅ Valor técnico preenchido com sucesso!');
      } else {
        console.log('⏭️ Valor técnico editado manualmente, mantendo:', valorAtualTecnico);
      }
    
      console.log('='.repeat(80));
      console.log('🏁 FIM DO PREENCHIMENTO AUTOMÁTICO (TipoCobrancaBloco)');
      console.log('='.repeat(80));
    }, 100); // Delay de 100ms para garantir que edição manual seja processada primeiro

    // Cleanup do timeout
    return () => clearTimeout(timeoutId);
  }, [taxaVigente, bloco.linguagem, bloco.tipo_cobranca, bloco.tipo_hora_extra, bloco.atendimento_presencial]); // Removido bloco.id e onUpdate das dependências

  // Função para marcar valor como editado manualmente
  const handleValorEditadoManualmente = (campo: 'funcional' | 'tecnico') => {
    console.log('🔥🔥🔥 VALOR EDITADO MANUALMENTE NO BLOCO 🔥🔥🔥');
    console.log('   Campo:', campo);
    console.log('   Bloco ID:', bloco.id);
    console.log('   Estado anterior da ref:', valoresEditadosManualmenteRef.current);
    
    // Atualizar ref IMEDIATAMENTE (não causa re-render)
    valoresEditadosManualmenteRef.current = {
      ...valoresEditadosManualmenteRef.current,
      [campo]: true
    };
    
    console.log('   Estado novo da ref:', valoresEditadosManualmenteRef.current);
    console.log('   🚨 BLOQUEANDO PREENCHIMENTO AUTOMÁTICO PARA:', campo);
    
    // Atualizar estado para indicadores visuais
    setValoresEditadosManualmente(prev => {
      const novoEstado = {
        ...prev,
        [campo]: true
      };
      console.log('   Estado visual atualizado:', novoEstado);
      return novoEstado;
    });
  };

  // CORREÇÃO APRIMORADA: Reset inteligente de flags - só resetar quando contexto principal mudar
  useEffect(() => {
    console.log('🔄 Avaliando necessidade de reset de flags de edição manual');
    console.log('   Cliente ID:', clienteId);
    console.log('   Linguagem:', bloco.linguagem);
    console.log('   Tipo de cobrança:', bloco.tipo_cobranca);
    console.log('   Valores atuais:', {
      funcional: bloco.valor_hora_funcional,
      tecnico: bloco.valor_hora_tecnico
    });
    console.log('   Flags atuais:', valoresEditadosManualmenteRef.current);
    
    // Só resetar se há mudança significativa no contexto E não há valores significativos preenchidos
    const temValorFuncionalSignificativo = bloco.valor_hora_funcional && bloco.valor_hora_funcional > 1;
    const temValorTecnicoSignificativo = bloco.valor_hora_tecnico && bloco.valor_hora_tecnico > 1;
    
    // Reset mais conservador: só resetar se realmente não há valores ou se são valores muito baixos (provavelmente automáticos)
    if (!temValorFuncionalSignificativo && !temValorTecnicoSignificativo) {
      console.log('✅ RESETANDO FLAGS - Contexto mudou e não há valores significativos preenchidos');
      // Resetar ref
      valoresEditadosManualmenteRef.current = {
        funcional: false,
        tecnico: false
      };
      // Resetar estado para indicadores visuais
      setValoresEditadosManualmente({
        funcional: false,
        tecnico: false
      });
    } else {
      console.log('⏭️ MANTENDO FLAGS - Há valores significativos preenchidos, preservando estado de edição manual');
      console.log('   Valor funcional significativo:', temValorFuncionalSignificativo, '(valor:', bloco.valor_hora_funcional, ')');
      console.log('   Valor técnico significativo:', temValorTecnicoSignificativo, '(valor:', bloco.valor_hora_tecnico, ')');
    }
  }, [clienteId, bloco.linguagem, bloco.tipo_cobranca]); // Removido bloco.tipo_hora_extra para evitar reset desnecessário

  // CORREÇÃO: Forçar sobrescrita de valores manuais quando tipo de hora extra mudar em "Hora Extra"
  useEffect(() => {
    if (bloco.tipo_cobranca === 'Hora Extra' && bloco.tipo_hora_extra) {
      console.log('🔄 FORÇANDO SOBRESCRITA - Tipo de hora extra mudou:', bloco.tipo_hora_extra);
      // Resetar flags para permitir preenchimento automático
      valoresEditadosManualmenteRef.current = {
        funcional: false,
        tecnico: false
      };
      // Resetar estado visual
      setValoresEditadosManualmente({
        funcional: false,
        tecnico: false
      });
    }
  }, [bloco.tipo_hora_extra]); // Só dispara quando tipo_hora_extra mudar

  // Verificar se tipo de cobrança requer valores/hora
  const mostrarCamposValor = bloco.tipo_cobranca && 
    ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'].includes(bloco.tipo_cobranca);

  // Verificar se deve mostrar campo de atendimento presencial
  // Não exibir para "Sobreaviso"
  const mostrarAtendimentoPresencial = mostrarCamposValor && bloco.tipo_cobranca !== 'Sobreaviso';

  // Verificar se deve mostrar campo de tipo de hora extra
  const mostrarTipoHoraExtra = bloco.tipo_cobranca === 'Hora Extra';

  // Verificar se deve mostrar campo de tickets
  const mostrarCampoTickets = bloco.tipo_cobranca === 'Banco de Horas' && 
    empresaTipoCobranca === 'ticket';

  // Verificar se deve mostrar campo de horas de análise EF
  const mostrarCampoAnaliseEF = bloco.tipo_cobranca === 'Reprovado';

  // Calcular horas total
  const horasFuncionalDecimal = typeof bloco.horas_funcional === 'string' 
    ? converterParaHorasDecimal(bloco.horas_funcional)
    : bloco.horas_funcional || 0;
  
  const horasTecnicoDecimal = typeof bloco.horas_tecnico === 'string'
    ? converterParaHorasDecimal(bloco.horas_tecnico)
    : bloco.horas_tecnico || 0;

  const horasTotalDecimal = horasFuncionalDecimal + horasTecnicoDecimal;
  
  // Converter para string HH:MM para exibição
  const horasFuncionalStr = typeof bloco.horas_funcional === 'string' 
    ? bloco.horas_funcional 
    : bloco.horas_funcional.toString();
  
  const horasTecnicoStr = typeof bloco.horas_tecnico === 'string'
    ? bloco.horas_tecnico
    : bloco.horas_tecnico.toString();
  
  const horasTotalStr = somarHoras(horasFuncionalStr, horasTecnicoStr);

  // Calcular valor total
  const valorTotal = mostrarCamposValor
    ? (horasFuncionalDecimal * (bloco.valor_hora_funcional || 0)) +
      (horasTecnicoDecimal * (bloco.valor_hora_tecnico || 0))
    : 0;

  // Cores para tipos de cobrança
  const getCorTipoCobranca = (tipo: string) => {
    const cores = {
      'Banco de Horas': 'bg-blue-500',
      'Cobro Interno': 'bg-green-500',
      'Contrato': 'bg-gray-500',
      'Faturado': 'bg-orange-500',
      'Hora Extra': 'bg-red-500',
      'Sobreaviso': 'bg-purple-500',
      'Reprovado': 'bg-slate-500',
      'Bolsão Enel': 'bg-yellow-500'
    };
    return cores[tipo as keyof typeof cores] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho com botão remover */}
      {canRemove && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">
            📋 {t('reqForm.billingType')} {index + 1}
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(bloco.id)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Controle de Horas */}
      <div>
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          📊 {t('reqForm.hoursControl')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>
              {t('reqForm.functionalHours')} <span className="text-red-500">*</span>
            </Label>
            <InputHoras
              value={bloco.horas_funcional}
              onChange={(valorString) => onUpdate(bloco.id, 'horas_funcional', valorString)}
              placeholder="Ex: 10:30"
            />
          </div>

          <div className="space-y-2">
            <Label>
              {t('reqForm.technicalHours')} <span className="text-red-500">*</span>
            </Label>
            <InputHoras
              value={bloco.horas_tecnico}
              onChange={(valorString) => onUpdate(bloco.id, 'horas_tecnico', valorString)}
              placeholder="Ex: 20:00"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('reqForm.totalHours')}</Label>
            <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
              <span className="font-semibold">
                {formatarHorasParaExibicao(horasTotalStr, 'completo')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{t('reqForm.calculatedAuto')}</p>
          </div>
        </div>
      </div>

      {/* Informações de Cobrança */}
      <div>
        <h4 className="text-sm font-semibold mb-3">{t('reqForm.billingInfo')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              {t('reqForm.billingType')} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={bloco.tipo_cobranca}
              onValueChange={(valor) => onUpdate(bloco.id, 'tipo_cobranca', valor)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de cobrança" />
              </SelectTrigger>
              <SelectContent>
                {tiposDisponiveis.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("h-3 w-3 rounded-full", getCorTipoCobranca(tipo.value))} />
                      <span>{tipo.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Atendimento Presencial (condicional - apenas para tipos que requerem valores, exceto Sobreaviso) */}
          {mostrarAtendimentoPresencial && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`atendimento-presencial-${bloco.id}`}
                  checked={bloco.atendimento_presencial || false}
                  onCheckedChange={(checked) => onUpdate(bloco.id, 'atendimento_presencial', checked)}
                />
                <Label 
                  htmlFor={`atendimento-presencial-${bloco.id}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {t('reqForm.onSiteService')}
                </Label>
              </div>
            </div>
          )}
          </div>

          

          <div className="space-y-2">
            <Label>{t('reqForm.billingMonthYear')}</Label>
            <MonthYearPicker
              value={bloco.mes_cobranca || ''}
              onChange={(valor) => onUpdate(bloco.id, 'mes_cobranca', valor)}
              placeholder={t('reqForm.billingMonthYearPlaceholder')}
              format="MM/YYYY"
              allowFuture={true}
              confirmDifferentPeriod={true}
            />
          </div>



          {/* Tipo de Hora Extra (condicional) */}
          {mostrarTipoHoraExtra && (
            <div className="space-y-2">
              <Label>
                Tipo de Hora Extra <span className="text-red-500">*</span>
              </Label>
              <Select
                value={bloco.tipo_hora_extra || ''}
                onValueChange={(valor) => onUpdate(bloco.id, 'tipo_hora_extra', valor)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de hora extra" />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_HORA_EXTRA_OPTIONS.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Linguagem Técnica - Só aparece quando há Horas Técnicas */}
          {horasTecnicoDecimal > 0 && (
            <div className="space-y-2">
              <Label>
                Linguagem Técnica <span className="text-red-500">*</span>
              </Label>
              <Select value={bloco.linguagem || ''} onValueChange={(valor) => onUpdate(bloco.id, 'linguagem', valor)}>
                <SelectTrigger className={cn(getErrorClasses(bloco.linguagem))}>
                  <SelectValue placeholder="Selecione uma linguagem técnica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABAP">ABAP</SelectItem>
                  <SelectItem value="DBA">DBA</SelectItem>
                  <SelectItem value="PL/SQL">PL/SQL</SelectItem>
                  <SelectItem value="Técnico">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantidade de Tickets (condicional) */}
          {mostrarCampoTickets && (
            <div className="space-y-2">
              <Label>
                Quantidade de Tickets <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                placeholder="Digite a quantidade"
                value={bloco.quantidade_tickets || ''}
                onChange={(e) => onUpdate(bloco.id, 'quantidade_tickets', parseInt(e.target.value) || undefined)}
              />
            </div>
          )}

          {/* Horas de Análise EF (condicional) */}
          {mostrarCampoAnaliseEF && (
            <div className="space-y-2">
              <Label>Horas de Análise EF</Label>
              <InputHoras
                value={bloco.horas_analise_ef || 0}
                onChange={(valorString) => onUpdate(bloco.id, 'horas_analise_ef', valorString)}
                placeholder="Ex: 8:00"
              />
            </div>
          )}
        </div>
      </div>

      {/* Valores por Hora (condicional) */}
      {mostrarCamposValor && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            💰 Valores por Hora
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>
                Valor/Hora Funcional <span className="text-red-500">*</span>
                {valoresEditadosManualmente.funcional && (
                  <span className="ml-1 text-xs text-blue-600" title="Editado manualmente">✏️</span>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  R$
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="pl-8"
                  value={(() => {
                    const valor = bloco.valor_hora_funcional;
                    console.log('🔍 INPUT FUNCIONAL - Valor bruto:', valor, 'Tipo:', typeof valor);
                    const valorFormatado = valor === undefined || valor === null ? '' : valor.toString();
                    console.log('🔍 INPUT FUNCIONAL - Valor formatado:', valorFormatado);
                    return valorFormatado;
                  })()}
                  onChange={(e) => {
                    // Marcar como editado manualmente PRIMEIRO
                    handleValorEditadoManualmente('funcional');
                    // Depois atualizar o valor
                    onUpdate(bloco.id, 'valor_hora_funcional', parseFloat(e.target.value) || 0);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Valor/Hora Técnico <span className="text-red-500">*</span>
                {valoresEditadosManualmente.tecnico && (
                  <span className="ml-1 text-xs text-blue-600" title="Editado manualmente">✏️</span>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  R$
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="pl-8"
                  value={(() => {
                    const valor = bloco.valor_hora_tecnico;
                    console.log('🔍 INPUT TÉCNICO - Valor bruto:', valor, 'Tipo:', typeof valor);
                    const valorFormatado = valor === undefined || valor === null ? '' : valor.toString();
                    console.log('🔍 INPUT TÉCNICO - Valor formatado:', valorFormatado);
                    return valorFormatado;
                  })()}
                  onChange={(e) => {
                    // Marcar como editado manualmente PRIMEIRO
                    handleValorEditadoManualmente('tecnico');
                    // Depois atualizar o valor
                    onUpdate(bloco.id, 'valor_hora_tecnico', parseFloat(e.target.value) || 0);
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor Total Estimado</Label>
              <div className="flex items-center h-10 px-3 py-2 border border-input bg-green-50 rounded-md">
                <span className="font-semibold text-green-600">
                  R$ {valorTotal.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Calculado automaticamente</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
