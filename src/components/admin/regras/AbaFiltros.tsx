// Aba "Filtros" das Regras de contagem: grupos que contam, itens de configuração excluídos, tipos
// de chamado, atividade interna e tickets fechados.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { Chip, DicaDoRotulo, Interruptor } from '@/components/ds/Formulario';
import { campo } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { TIPOS_CHAMADO } from '@/utils/regrasTela';
import type { FiltrosContagem } from '@/types/regrasContagem';

/** Lista de textos com inclusão e remoção (grupos, itens de configuração) */
function ListaDeTextos({
  rotulo,
  itens,
  podeEditar,
  placeholder,
  onChange,
}: {
  rotulo: string;
  itens: string[];
  podeEditar: boolean;
  placeholder: string;
  onChange: (itens: string[]) => void;
}) {
  const { t } = useTranslation();
  const [novo, setNovo] = useState('');
  const repetido = itens.some((i) => i.toLowerCase() === novo.trim().toLowerCase());
  const adicionar = () => {
    if (!novo.trim() || repetido) return;
    onChange([...itens, novo.trim()]);
    setNovo('');
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {itens.map((i) => (
          <Chip
            key={i}
            onRemover={podeEditar ? () => onChange(itens.filter((x) => x !== i)) : undefined}
          >
            {i}
          </Chip>
        ))}
        {!itens.length && (
          <span className="text-sm text-ds-fg-muted">{t('regrasContagem.filtros.nenhum')}</span>
        )}
      </div>
      {podeEditar && (
        <div>
          <div className="flex gap-2">
            <input
              aria-label={t('regrasContagem.filtros.incluirEm', { lista: rotulo })}
              placeholder={placeholder}
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
              aria-invalid={repetido}
              className={cn(campo, repetido && 'border-ds-danger-fg')}
            />
            <Button onClick={adicionar} className="shrink-0">
              <Plus /> {t('regrasContagem.filtros.incluir')}
            </Button>
          </div>
          {repetido && (
            <p className="mt-1.5 text-xs text-ds-danger-fg">
              {t('regrasContagem.filtros.jaNaLista')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TituloRegra({ titulo, aplica }: { titulo: string; aplica: string }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {titulo}
      <DicaDoRotulo rotulo={titulo} />
      <span className="font-normal normal-case tracking-normal text-ds-fg-muted">· {aplica}</span>
    </span>
  );
}

export function AbaFiltros({
  filtros,
  podeEditar,
  onChange,
}: {
  filtros: FiltrosContagem;
  podeEditar: boolean;
  onChange: (f: FiltrosContagem) => void;
}) {
  const { t } = useTranslation();
  const set = <K extends keyof FiltrosContagem>(k: K, v: FiltrosContagem[K]) =>
    onChange({ ...filtros, [k]: v });
  const alternarTipo = (tipo: string) => {
    const marcados = filtros.tiposChamado.includes(tipo)
      ? filtros.tiposChamado.filter((x) => x !== tipo)
      : [...filtros.tiposChamado, tipo];
    // Na ordem conhecida, para a comparação e a gravação não dependerem da ordem do clique
    set(
      'tiposChamado',
      TIPOS_CHAMADO.filter((x) => marcados.includes(x))
    );
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card
        titulo={
          <TituloRegra
            titulo={t('regrasContagem.filtros.grupos')}
            aplica={t('regrasContagem.filtros.aplicaAmbos')}
          />
        }
      >
        <ListaDeTextos
          rotulo={t('regrasContagem.filtros.grupos')}
          itens={filtros.gruposQueContam}
          podeEditar={podeEditar}
          placeholder={t('regrasContagem.filtros.placeholderGrupo')}
          onChange={(v) => set('gruposQueContam', v)}
        />
        {!filtros.gruposQueContam.length && (
          <div className="mt-3">
            <Callout tom="warning">{t('regrasContagem.filtros.semGrupos')}</Callout>
          </div>
        )}
      </Card>

      <Card
        titulo={
          <TituloRegra
            titulo={t('regrasContagem.filtros.itens')}
            aplica={t('regrasContagem.filtros.aplicaAmbos')}
          />
        }
      >
        <ListaDeTextos
          rotulo={t('regrasContagem.filtros.itens')}
          itens={filtros.itensExcluidos}
          podeEditar={podeEditar}
          placeholder={t('regrasContagem.filtros.placeholderItem')}
          onChange={(v) => set('itensExcluidos', v)}
        />
      </Card>

      <Card
        titulo={
          <TituloRegra
            titulo={t('regrasContagem.filtros.tipos')}
            aplica={t('regrasContagem.filtros.aplicaApontamentos')}
          />
        }
      >
        <ul className="space-y-1" aria-label={t('regrasContagem.filtros.tipos')}>
          {TIPOS_CHAMADO.map((tipo) => (
            <li key={tipo}>
              <label className="flex min-h-11 items-center gap-3 text-sm md:min-h-9">
                <input
                  type="checkbox"
                  checked={filtros.tiposChamado.includes(tipo)}
                  disabled={!podeEditar}
                  onChange={() => alternarTipo(tipo)}
                  className="h-4 w-4 accent-ds-accent"
                />
                {t(`regrasContagem.filtros.tipo.${tipo}`)}
              </label>
            </li>
          ))}
        </ul>
        {!filtros.tiposChamado.length && (
          <div className="mt-3">
            <Callout tom="warning">{t('regrasContagem.filtros.semTipos')}</Callout>
          </div>
        )}
      </Card>

      <Card titulo={t('regrasContagem.filtros.atividadeETickets')}>
        <div className="space-y-5">
          <Interruptor
            rotulo={t('regrasContagem.filtros.atividade')}
            ligado={filtros.ignorarAtividadeInterna}
            desabilitado={!podeEditar}
            onChange={(v) => set('ignorarAtividadeInterna', v)}
            descricao={
              filtros.ignorarAtividadeInterna
                ? t('regrasContagem.filtros.atividadeLigada')
                : t('regrasContagem.filtros.atividadeDesligada')
            }
          />
          <Interruptor
            rotulo={t('regrasContagem.filtros.tickets')}
            ligado={filtros.soTicketsFechados}
            desabilitado={!podeEditar}
            onChange={(v) => set('soTicketsFechados', v)}
            descricao={
              filtros.soTicketsFechados
                ? t('regrasContagem.filtros.fechadosLigado')
                : t('regrasContagem.filtros.fechadosDesligado')
            }
          />
        </div>
      </Card>
    </div>
  );
}
