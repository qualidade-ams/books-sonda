// Lançamento de reajuste (nível a mais na tela). Em mês fechado o reajuste fica aguardando a
// retificação do Book daquele mês; no aberto, mostra o efeito no saldo antes de lançar.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Callout } from '@/components/ds/Callout';
import { Select } from '@/components/ds/Select';
import {
  CampoHoras,
  CampoNumero,
  Escolha,
  Rotulo,
  Secao,
  TelaEdicao,
} from '@/components/ds/Formulario';
import { areaTexto } from '@/components/ds/estilos';
import { formatarHoras } from '@/components/ds/horas';
import { converterHorasParaMinutos } from '@/utils/horasUtils';
import { indiceReferencia, rotuloMesLocal, type MesDoQuadro } from '@/utils/controleTela';
import type { MesAno, TipoContrato } from '@/services/bancosHoras/calculo';
import type { NovoReajusteInput } from '@/types/controleBancoHoras';

const LIMITE = 700;
const HORAS = /^\d{1,4}:[0-5]\d$/;

type Efeito = 'abate' | 'soma';

export function LancarReajuste({
  banco,
  meses,
  rotuloPeriodo,
  mesInicial,
  onFechar,
  onLancar,
}: {
  banco: { bancoId: string; nome: string; tipoContrato: TipoContrato };
  meses: MesDoQuadro[];
  rotuloPeriodo: string;
  /** Mês escolhido no quadro; sem ele, o mês de referência do período */
  mesInicial?: MesAno;
  onFechar: () => void;
  /** Sem tratar o erro aqui: o aviso vem do hook e a tela continua aberta */
  onLancar: (input: NovoReajusteInput) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const l = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.lancar.${chave}`, valores);
  const inicial =
    meses.find((m) => mesInicial && m.mes.ano === mesInicial.ano && m.mes.mes === mesInicial.mes) ??
    meses[indiceReferencia(meses)];
  const [chave, setChave] = useState(inicial?.chave ?? '');
  const [efeito, setEfeito] = useState<Efeito>('abate');
  const [horas, setHoras] = useState('');
  const [tickets, setTickets] = useState('');
  const [motivo, setMotivo] = useState('');
  const [anotacao, setAnotacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const escolhido = meses.find((m) => m.chave === chave);
  const rotulo = (m: MesDoQuadro) => rotuloMesLocal(m.mes, i18n.language);
  const comHoras = banco.tipoContrato !== 'tickets';
  const comTickets = banco.tipoContrato !== 'horas';
  const minutos = comHoras && HORAS.test(horas) ? converterHorasParaMinutos(horas) : 0;
  const qtdTickets = comTickets && tickets !== '' ? Number(tickets) : 0;
  const horasInvalidas = comHoras && horas !== '' && !HORAS.test(horas);
  const pode =
    (minutos > 0 || qtdTickets > 0) &&
    !horasInvalidas &&
    !!motivo.trim() &&
    !!escolhido &&
    !salvando;
  // Somar ao consumo diminui o saldo; abater aumenta
  const delta = efeito === 'soma' ? minutos : -minutos;
  const saldo = escolhido?.resultado?.horas?.saldo;

  const lancar = async () => {
    if (!escolhido) return;
    setSalvando(true);
    try {
      await onLancar({
        bancoId: banco.bancoId,
        mes: escolhido.mes,
        tipo: efeito === 'soma' ? 'saida' : 'entrada',
        minutos,
        tickets: qtdTickets,
        justificativa: motivo.trim(),
        anotacaoInterna: anotacao.trim() || null,
      });
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <TelaEdicao
      voltarPara={banco.nome}
      titulo={l('titulo')}
      subtitulo={`${banco.nome} · ${rotuloPeriodo}`}
      podeSalvar={pode}
      rotuloSalvar={l('titulo')}
      onFechar={onFechar}
      onSalvar={lancar}
    >
      <Secao titulo={l('secao')}>
        <div className="space-y-4">
          <div className="grid items-start gap-4 sm:grid-cols-3">
            <div>
              <Rotulo obrigatorio htmlFor="mes-reajuste">
                {l('mes')}
              </Rotulo>
              <Select
                id="mes-reajuste"
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                className="w-full"
              >
                {meses.map((m) => (
                  <option key={m.chave} value={m.chave}>
                    {rotulo(m)}
                    {m.situacao === 'fechado'
                      ? ` (${l('fechado')})`
                      : m.situacao === 'futuro'
                        ? ` (${l('futuro')})`
                        : ''}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Rotulo obrigatorio>{l('efeito')}</Rotulo>
              <Escolha<Efeito>
                rotulo={l('efeito')}
                opcoes={[
                  { valor: 'abate', rotulo: l('abater') },
                  { valor: 'soma', rotulo: l('somar') },
                ]}
                valor={efeito}
                onChange={setEfeito}
              />
            </div>
            {comHoras && (
              <div>
                <Rotulo obrigatorio htmlFor="horas-reajuste">
                  {l('horas')}
                </Rotulo>
                <CampoHoras id="horas-reajuste" valor={horas} onChange={setHoras} sufixo="" />
              </div>
            )}
            {comTickets && (
              <div>
                <Rotulo obrigatorio={!comHoras} htmlFor="tickets-reajuste">
                  {l('tickets')}
                </Rotulo>
                <CampoNumero id="tickets-reajuste" min={0} valor={tickets} onChange={setTickets} />
              </div>
            )}
          </div>
          <div>
            <Rotulo obrigatorio htmlFor="motivo-reajuste">
              {l('motivo')}
            </Rotulo>
            <textarea
              id="motivo-reajuste"
              rows={3}
              maxLength={LIMITE}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={l('motivoPlaceholder')}
              className={areaTexto}
            />
            <p className="mt-1 text-right text-xs tabular-nums text-ds-fg-muted">
              {motivo.length}/{LIMITE}
            </p>
          </div>
          <div>
            <Rotulo htmlFor="anotacao-reajuste">{l('anotacao')}</Rotulo>
            <textarea
              id="anotacao-reajuste"
              rows={3}
              maxLength={LIMITE}
              value={anotacao}
              onChange={(e) => setAnotacao(e.target.value)}
              placeholder={l('anotacaoPlaceholder')}
              className={areaTexto}
            />
            <p className="mt-1 text-right text-xs tabular-nums text-ds-fg-muted">
              {anotacao.length}/{LIMITE}
            </p>
          </div>
          {escolhido && (minutos > 0 || qtdTickets > 0) && (
            <Callout
              tom={escolhido.situacao === 'fechado' ? 'warning' : 'info'}
              titulo={
                escolhido.situacao === 'fechado'
                  ? l('fechadoTitulo', { mes: rotulo(escolhido) })
                  : l('efeitoTitulo')
              }
            >
              {escolhido.situacao === 'fechado'
                ? l('fechadoTexto', { mes: rotulo(escolhido) })
                : escolhido.situacao === 'futuro' || saldo === undefined || !minutos
                  ? l('futuroTexto', { mes: rotulo(escolhido) })
                  : l('efeitoTexto', {
                      mes: rotulo(escolhido),
                      de: formatarHoras(saldo),
                      para: formatarHoras(saldo - delta),
                    })}
            </Callout>
          )}
        </div>
      </Secao>
    </TelaEdicao>
  );
}
