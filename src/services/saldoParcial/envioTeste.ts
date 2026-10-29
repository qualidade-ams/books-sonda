/**
 * Saldo Parcial de teste da liberação (Fase 5, P7): o e-mail do Controle novo, com um bloco por
 * banco, enviado só para quem pediu, antes de liberar a empresa. O cliente não recebe nada e o
 * envio não entra no histórico da empresa.
 */

import { supabase } from '@/integrations/supabase/client';
import { ErroTraduzivel } from '@/errors/erroTraduzivel';
import type { MesAno } from '@/services/bancosHoras/calculo';
import { mesAtual } from '@/services/bancosHoras/periodos';
import {
  controleSaldoParcialService,
  type SaldoParcialBanco,
} from '@/services/controleSaldoParcialService';
import { criarTradutor } from '@/i18n/tradutor';
import {
  PADRAO,
  enviarSaldoParcialControle,
  semHistorico,
  type EnvioControleInput,
} from './envioControle';
import { gerarAssuntoSaldoParcial, getTextoPadraoParcial } from './emailSaldoParcial';

export interface DependenciasTeste {
  emailDoUsuario: () => Promise<string | null>;
  bancos: (empresaId: string, mes: MesAno) => Promise<SaldoParcialBanco[]>;
  idioma: (empresaId: string) => Promise<'pt-BR' | 'en'>;
  enviar: (entrada: EnvioControleInput) => Promise<void>;
}

const PADRAO_TESTE: DependenciasTeste = {
  emailDoUsuario: async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.email ?? null;
  },
  bancos: (empresaId, mes) => controleSaldoParcialService.bancos(empresaId, mes),
  idioma: (empresaId) => controleSaldoParcialService.idiomaDoEmail(empresaId),
  enviar: (entrada) => enviarSaldoParcialControle(entrada, semHistorico(PADRAO)),
};

export async function enviarSaldoParcialDeTeste(
  empresaId: string,
  empresaNome: string,
  dependencias: DependenciasTeste = PADRAO_TESTE,
  agora: Date = new Date()
): Promise<void> {
  const email = await dependencias.emailDoUsuario();
  if (!email)
    throw new ErroTraduzivel(
      'erros.saldoParcial.semEmailDoUsuario',
      {},
      'Não foi possível ler o seu e-mail para enviar o teste.'
    );

  const mes = mesAtual(agora);
  const [bancos, idioma] = await Promise.all([
    dependencias.bancos(empresaId, mes),
    dependencias.idioma(empresaId),
  ]);
  if (bancos.length === 0)
    throw new ErroTraduzivel(
      'erros.saldoParcial.semBancos',
      {},
      'A empresa não tem banco que o cliente vê.'
    );

  const isEnglish = idioma === 'en';
  await dependencias.enviar({
    empresaId,
    empresaNome,
    bancos,
    destinatarios: [email],
    copia: [],
    assunto: `${isEnglish ? '[TEST]' : '[TESTE]'} ${gerarAssuntoSaldoParcial(empresaNome, mes, agora)}`,
    texto: getTextoPadraoParcial(isEnglish, agora),
    idioma,
    t: criarTradutor(idioma),
    agora,
  });
}
