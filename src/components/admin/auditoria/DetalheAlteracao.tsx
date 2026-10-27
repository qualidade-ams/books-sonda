// Detalhe de uma alteração da Auditoria (nível a mais na tela): o registro, o motivo e o antes e
// depois de cada campo. Ligado, "todos os campos" mostra também o que não mudou.
import { useState } from 'react';
import { History } from 'lucide-react';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { Interruptor, Secao, TelaEdicao } from '@/components/ds/Formulario';
import { cn } from '@/lib/utils';
import { todosOsCampos } from '@/utils/auditoriaTela';
import type { RegistroAuditoria } from '@/types/auditoria';
import { useRotulosAuditoria } from './rotulos';

export function DetalheAlteracao({
  registro,
  onFechar,
  onVerHistorico,
}: {
  registro: RegistroAuditoria;
  onFechar: () => void;
  onVerHistorico: () => void;
}) {
  const { a, dataHora, quem, registro: nomeDoRegistro, area } = useRotulosAuditoria();
  const [todos, setTodos] = useState(false);
  const campos = todosOsCampos(registro).filter((c) => todos || !c.igual);
  const vazio = <span className="text-ds-fg-muted">—</span>;

  return (
    <TelaEdicao
      voltarPara={a('titulo')}
      titulo={`${a(`acoes.${registro.acao}`)} · ${area(registro.area)}`}
      subtitulo={a('detalhe.subtitulo', {
        em: dataHora(registro.em),
        quem: quem(registro),
        origem: a(`origens.${registro.origem}`),
      })}
      onFechar={onFechar}
    >
      <Secao titulo={a('detalhe.secaoRegistro')}>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ds-fg-muted">{a('detalhe.registro')}</dt>
            <dd className="font-medium">{nomeDoRegistro(registro)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ds-fg-muted">{a('detalhe.empresa')}</dt>
            <dd>{registro.empresa ?? vazio}</dd>
          </div>
          <div>
            <dt className="text-xs text-ds-fg-muted">{a('detalhe.banco')}</dt>
            <dd>{registro.banco ?? vazio}</dd>
          </div>
        </dl>
        {registro.motivo && (
          <Callout tom="info" titulo={a('detalhe.motivo')}>
            {registro.motivo}
          </Callout>
        )}
        <Button tamanho="sm" variante="fantasma" onClick={onVerHistorico}>
          <History /> {a('detalhe.verHistorico')}
        </Button>
      </Secao>

      <Secao titulo={a('detalhe.secaoMudou')}>
        {registro.acao === 'update' && (
          <Interruptor ligado={todos} onChange={setTodos} rotulo={a('detalhe.todos')} />
        )}
        <div className="overflow-x-auto rounded-lg border border-ds-border">
          <table className="w-full text-sm">
            <thead className="bg-ds-bg-subtle text-left text-xs font-medium uppercase tracking-[0.04em] text-ds-fg-muted">
              <tr>
                <th className="px-3 py-2">{a('detalhe.campo')}</th>
                <th className="px-3 py-2">{a('detalhe.antes')}</th>
                <th className="px-3 py-2">{a('detalhe.depois')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ds-border">
              {campos.map((c) => (
                <tr key={c.campo} className={c.igual ? 'text-ds-fg-muted' : undefined}>
                  <td className="px-3 py-2 font-mono text-xs">{c.campo}</td>
                  <td
                    className={cn(
                      'break-words px-3 py-2',
                      !c.igual &&
                        c.antes !== '—' &&
                        'text-ds-danger-fg line-through decoration-ds-danger-fg/40'
                    )}
                  >
                    {c.antes}
                  </td>
                  <td
                    className={cn(
                      'break-words px-3 py-2',
                      !c.igual && c.depois !== '—' && 'font-medium text-ds-success-fg'
                    )}
                  >
                    {c.depois}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>
    </TelaEdicao>
  );
}
