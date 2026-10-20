// Painel lateral do editor: documenta o processo (nada selecionado), a etapa ou a conexão selecionada.
import { useRef, useState, type ReactNode } from 'react';
import { ExternalLink, FileText, Info, Paperclip, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  ArestaFluxo,
  CargoProcesso,
  DadosNo,
  DocumentacaoEtapa,
  NoFluxo,
  PapelRaci,
  Processo,
  TipoNo,
} from '../mocks/fluxosProcessos';
import { CLASSE_PAPEL, PAPEIS_RACI, ROTULO_TIPO, validarRaci } from './utils';

const FOCO = 'focus:ring-sonda-blue focus:border-sonda-blue';

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{titulo}</h4>
      {children}
    </div>
  );
}

function ListaEditavel({
  itens,
  onChange,
  placeholder,
  disabled,
}: {
  itens: string[];
  onChange: (itens: string[]) => void;
  placeholder: string;
  disabled: boolean;
}) {
  const [novo, setNovo] = useState('');
  const adicionar = () => {
    const valor = novo.trim();
    if (!valor || itens.includes(valor)) return;
    onChange([...itens, valor]);
    setNovo('');
  };

  return (
    <div className="space-y-2">
      {itens.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {itens.map((item) => (
            <Badge
              key={item}
              variant="outline"
              className="gap-1 bg-white text-xs font-normal text-gray-700"
            >
              {item}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(itens.filter((i) => i !== item))}
                  aria-label={`Remover ${item}`}
                >
                  <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}
      {!disabled && (
        <Input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionar())}
          onBlur={adicionar}
          placeholder={placeholder}
          className={cn('h-8 text-sm', FOCO)}
        />
      )}
    </div>
  );
}

function EditorRaci({
  cargos,
  raci,
  onChange,
  disabled,
}: {
  cargos: CargoProcesso[];
  raci: Record<string, PapelRaci>;
  onChange: (raci: Record<string, PapelRaci>) => void;
  disabled: boolean;
}) {
  const alternar = (cargoId: string, papel: PapelRaci) => {
    const proximo = { ...raci };
    if (proximo[cargoId] === papel) delete proximo[cargoId];
    else proximo[cargoId] = papel;
    onChange(proximo);
  };

  return (
    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
      {cargos.map((cargo) => (
        <div key={cargo.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
          <span className="truncate text-sm text-gray-700">{cargo.nome}</span>
          <div className="flex shrink-0 gap-1">
            {PAPEIS_RACI.map(({ papel, rotulo }) => {
              const ativo = raci[cargo.id] === papel;
              return (
                <button
                  key={papel}
                  type="button"
                  title={rotulo}
                  disabled={disabled}
                  onClick={() => alternar(cargo.id, papel)}
                  className={cn(
                    'h-6 w-6 rounded border text-xs font-semibold transition-colors disabled:cursor-not-allowed',
                    ativo
                      ? CLASSE_PAPEL[papel]
                      : 'border-gray-200 text-gray-300 hover:border-gray-300 hover:text-gray-500'
                  )}
                >
                  {papel}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Anexos({
  doc,
  onChange,
  disabled,
}: {
  doc: DocumentacaoEtapa;
  onChange: (anexos: DocumentacaoEtapa['anexos']) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      {doc.anexos.map((anexo) => (
        <div
          key={anexo.id}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2"
        >
          <FileText className="h-4 w-4 shrink-0 text-sonda-blue" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{anexo.nome}</p>
            <p className="text-xs text-gray-500">{anexo.tamanho}</p>
          </div>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onChange(doc.anexos.filter((a) => a.id !== anexo.id))}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (!arquivo) return;
              const tamanho = `${Math.max(1, Math.round(arquivo.size / 1024))} KB`;
              onChange([...doc.anexos, { id: crypto.randomUUID(), nome: arquivo.name, tamanho }]);
              e.target.value = '';
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4 mr-2" />
            Anexar arquivo
          </Button>
        </>
      )}
    </div>
  );
}

interface PainelPropriedadesProps {
  processo: Processo;
  processos: Processo[];
  cargos: CargoProcesso[];
  noSelecionado?: NoFluxo;
  arestaSelecionada?: ArestaFluxo;
  somenteLeitura: boolean;
  onAlterarNo: (id: string, dados: Partial<DadosNo>) => void;
  onAlterarDoc: (id: string, doc: Partial<DocumentacaoEtapa>) => void;
  onAlterarAresta: (id: string, rotulo: string) => void;
  onExcluirSelecionado: () => void;
  onAlterarProcesso: (campos: Partial<Processo>) => void;
  onAbrirProcesso: (id: string) => void;
}

export function PainelPropriedades(props: PainelPropriedadesProps) {
  const { noSelecionado, arestaSelecionada, somenteLeitura } = props;

  if (arestaSelecionada) {
    return (
      <div className="space-y-6 p-4">
        <Cabecalho
          titulo="Conexão"
          onExcluir={somenteLeitura ? undefined : props.onExcluirSelecionado}
        />
        <div className="space-y-2">
          <Label>Rótulo da conexão</Label>
          <Input
            value={String(arestaSelecionada.label ?? '')}
            disabled={somenteLeitura}
            onChange={(e) => props.onAlterarAresta(arestaSelecionada.id, e.target.value)}
            placeholder="Ex.: Sim, Não, Aprovado"
            className={FOCO}
          />
          {!somenteLeitura && (
            <div className="flex gap-2">
              {['Sim', 'Não'].map((r) => (
                <Button
                  key={r}
                  variant="outline"
                  size="sm"
                  onClick={() => props.onAlterarAresta(arestaSelecionada.id, r)}
                >
                  {r}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (noSelecionado) return <PainelEtapa {...props} no={noSelecionado} />;

  return <PainelProcesso {...props} />;
}

function Cabecalho({
  titulo,
  subtitulo,
  onExcluir,
}: {
  titulo: string;
  subtitulo?: string;
  onExcluir?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{titulo}</h3>
        {subtitulo && <p className="text-xs text-gray-500">{subtitulo}</p>}
      </div>
      {onExcluir && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title="Excluir (Delete)"
          onClick={onExcluir}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      )}
    </div>
  );
}

function PainelEtapa({
  no,
  processos,
  processo,
  cargos,
  somenteLeitura,
  onAlterarNo,
  onAlterarDoc,
  onExcluirSelecionado,
  onAbrirProcesso,
}: PainelPropriedadesProps & { no: NoFluxo }) {
  const tipo = no.type as TipoNo;
  const doc = no.data.doc;
  const pendencia = tipo === 'tarefa' ? validarRaci(no) : null;

  return (
    <div className="space-y-6 p-4">
      <Cabecalho
        titulo={ROTULO_TIPO[tipo]}
        subtitulo="Etapa selecionada"
        onExcluir={somenteLeitura ? undefined : onExcluirSelecionado}
      />

      {tipo === 'raia' ? (
        <div className="space-y-2">
          <Label>Cargo da raia</Label>
          <Select
            value={no.data.cargoId}
            disabled={somenteLeitura}
            onValueChange={(cargoId) =>
              onAlterarNo(no.id, { cargoId, rotulo: cargos.find((c) => c.id === cargoId)?.nome })
            }
          >
            <SelectTrigger className={FOCO}>
              <SelectValue placeholder="Selecione o cargo" />
            </SelectTrigger>
            <SelectContent>
              {cargos.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Arraste as bordas da raia para redimensioná-la.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>{tipo === 'decisao' ? 'Pergunta da decisão' : 'Nome'}</Label>
          <Textarea
            rows={2}
            value={no.data.rotulo}
            disabled={somenteLeitura}
            onChange={(e) => onAlterarNo(no.id, { rotulo: e.target.value })}
            className={cn('resize-none', FOCO)}
          />
        </div>
      )}

      {tipo === 'link' && (
        <div className="space-y-2">
          <Label>Processo vinculado</Label>
          <Select
            value={no.data.processoVinculadoId}
            disabled={somenteLeitura}
            onValueChange={(id) => onAlterarNo(no.id, { processoVinculadoId: id })}
          >
            <SelectTrigger className={FOCO}>
              <SelectValue placeholder="Selecione o processo" />
            </SelectTrigger>
            <SelectContent>
              {processos
                .filter((p) => p.id !== processo.id)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.codigo} {p.nome}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {no.data.processoVinculadoId && (
            <Button
              variant="outline"
              size="sm"
              className="w-full border-sonda-blue text-sonda-blue hover:bg-sonda-light-blue/10"
              onClick={() => onAbrirProcesso(no.data.processoVinculadoId!)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir processo vinculado
            </Button>
          )}
        </div>
      )}

      {doc && tipo !== 'raia' && (
        <div className="space-y-2">
          <Label>{tipo === 'decisao' ? 'Critério de decisão' : 'Descrição'}</Label>
          <Textarea
            rows={4}
            value={doc.descricao}
            disabled={somenteLeitura}
            onChange={(e) => onAlterarDoc(no.id, { descricao: e.target.value })}
            placeholder={
              tipo === 'tarefa' ? 'Como a etapa deve ser executada…' : 'Detalhes adicionais…'
            }
            className={FOCO}
          />
        </div>
      )}

      {tipo === 'tarefa' && doc && (
        <>
          <Secao titulo="Responsabilidades (RACI)">
            {pendencia && (
              <p className="flex items-center gap-1 text-sm text-red-500">
                <Info className="h-3.5 w-3.5" />
                {pendencia}
              </p>
            )}
            <EditorRaci
              cargos={cargos}
              raci={doc.raci}
              disabled={somenteLeitura}
              onChange={(raci) => onAlterarDoc(no.id, { raci })}
            />
          </Secao>

          <div className="space-y-2">
            <Label>Prazo / SLA</Label>
            <Input
              value={doc.prazo}
              disabled={somenteLeitura}
              onChange={(e) => onAlterarDoc(no.id, { prazo: e.target.value })}
              placeholder="Ex.: 2 dias úteis"
              className={FOCO}
            />
          </div>

          <Secao titulo="Entradas">
            <ListaEditavel
              itens={doc.entradas}
              disabled={somenteLeitura}
              placeholder="Adicionar entrada e Enter"
              onChange={(entradas) => onAlterarDoc(no.id, { entradas })}
            />
          </Secao>
          <Secao titulo="Saídas">
            <ListaEditavel
              itens={doc.saidas}
              disabled={somenteLeitura}
              placeholder="Adicionar saída e Enter"
              onChange={(saidas) => onAlterarDoc(no.id, { saidas })}
            />
          </Secao>
          <Secao titulo="Sistemas utilizados">
            <ListaEditavel
              itens={doc.sistemas}
              disabled={somenteLeitura}
              placeholder="Adicionar sistema e Enter"
              onChange={(sistemas) => onAlterarDoc(no.id, { sistemas })}
            />
          </Secao>
          <Secao titulo="Anexos">
            <Anexos
              doc={doc}
              disabled={somenteLeitura}
              onChange={(anexos) => onAlterarDoc(no.id, { anexos })}
            />
          </Secao>
        </>
      )}
    </div>
  );
}

function PainelProcesso({
  processo,
  cargos,
  somenteLeitura,
  onAlterarProcesso,
}: PainelPropriedadesProps) {
  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Documentação do processo
        </h3>
        <p className="text-xs text-gray-500">Selecione uma etapa no diagrama para documentá-la.</p>
      </div>

      <div className="space-y-2">
        <Label>Dono do processo</Label>
        <Select
          value={processo.donoCargoId}
          disabled={somenteLeitura}
          onValueChange={(donoCargoId) => onAlterarProcesso({ donoCargoId })}
        >
          <SelectTrigger className={FOCO}>
            <SelectValue placeholder="Selecione o cargo" />
          </SelectTrigger>
          <SelectContent>
            {cargos.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(
        [
          ['objetivo', 'Objetivo', 'Para que o processo existe…'],
          ['escopo', 'Escopo', 'O que está dentro e fora do processo…'],
          ['gatilho', 'Gatilho (quando começa)', 'Evento que inicia o processo…'],
        ] as const
      ).map(([campo, rotulo, placeholder]) => (
        <div key={campo} className="space-y-2">
          <Label>{rotulo}</Label>
          <Textarea
            rows={3}
            value={processo[campo]}
            disabled={somenteLeitura}
            onChange={(e) => onAlterarProcesso({ [campo]: e.target.value })}
            placeholder={placeholder}
            className={FOCO}
          />
        </div>
      ))}

      <Secao titulo="Regras de negócio">
        <ListaEditavel
          itens={processo.regras}
          disabled={somenteLeitura}
          placeholder="Adicionar regra e Enter"
          onChange={(regras) => onAlterarProcesso({ regras })}
        />
      </Secao>
      <Secao titulo="Indicadores">
        <ListaEditavel
          itens={processo.indicadores}
          disabled={somenteLeitura}
          placeholder="Adicionar indicador e Enter"
          onChange={(indicadores) => onAlterarProcesso({ indicadores })}
        />
      </Secao>
    </div>
  );
}
