import { useState, useEffect } from 'react';
import { executarVerificacaoVigencia, VigenciaResult } from '@/services/vigenciaService';
import { toast } from 'sonner';

interface UseVigenciaMonitorOptions {
  intervaloMinutos?: number;
  diasAlerta?: number;
  inativarAutomaticamente?: boolean;
  executarAoIniciar?: boolean;
}

export function useVigenciaMonitor({
  intervaloMinutos = 60, // Verificar a cada 1 hora por padrão
  diasAlerta = 30,
  inativarAutomaticamente = true,
  executarAoIniciar = false
}: UseVigenciaMonitorOptions = {}) {
  const [ultimaVerificacao, setUltimaVerificacao] = useState<Date | null>(null);
  const [ultimoResultado, setUltimoResultado] = useState<VigenciaResult | null>(null);
  const [verificandoAgora, setVerificandoAgora] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const executarVerificacao = async () => {
    if (verificandoAgora) return;

    try {
      setVerificandoAgora(true);
      setErro(null);

      const resultado = await executarVerificacaoVigencia(diasAlerta, inativarAutomaticamente);
      
      setUltimoResultado(resultado);
      setUltimaVerificacao(new Date());

      // Notificar sobre empresas inativadas
      if (resultado.totalInativadas > 0) {
        toast.warning(
          `${resultado.totalInativadas} empresa(s) foram inativadas automaticamente por vigência vencida`,
          { duration: 10000 }
        );
      }

      // Notificar sobre empresas próximas do vencimento
      if (resultado.empresasProximasVencimento.length > 0) {
        toast.info(
          `${resultado.empresasProximasVencimento.length} empresa(s) estão próximas do vencimento da vigência`,
          { duration: 8000 }
        );
      }

      console.log('Verificação de vigência concluída:', resultado);

    } catch (error) {
      const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
      setErro(mensagemErro);
      console.error('Erro na verificação de vigência:', error);
      
      toast.error(`Erro na verificação de vigência: ${mensagemErro}`);
    } finally {
      setVerificandoAgora(false);
    }
  };

  // Configurar intervalo automático
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (intervaloMinutos > 0) {
      intervalId = setInterval(() => {
        executarVerificacao();
      }, intervaloMinutos * 60 * 1000);
    }

    // Executar verificação inicial se solicitado
    if (executarAoIniciar) {
      executarVerificacao();
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervaloMinutos, diasAlerta, inativarAutomaticamente, executarAoIniciar]);

  return {
    ultimaVerificacao,
    ultimoResultado,
    verificandoAgora,
    erro,
    executarVerificacao
  };
}
