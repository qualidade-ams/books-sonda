// Edição de solução, produto e módulo da tela Produtos e Módulos. A tela de cima grava;
// aqui ficam os campos, a validação e a confirmação de inativar o que um banco usa.
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { Select } from '@/components/ds/Select';
import {
  Ajuda,
  CampoTexto,
  Interruptor,
  Rotulo,
  Secao,
  TelaEdicao,
} from '@/components/ds/Formulario';
import { campo } from '@/components/ds/estilos';
import { useUltimaAlteracao } from '@/hooks/useUltimaAlteracao';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import {
  gruposDaSolucao,
  gruposDoModulo,
  gruposSoDoProduto,
  mudancasDeGrupos,
  usosDoModulo,
  usosQueAlcancamProduto,
} from '@/utils/catalogoTela';
import { EditorGrupos } from './EditorGrupos';
import { UsosNaEdicao } from './Partes';
import type {
  Catalogo,
  Modulo,
  ModuloInput,
  Produto,
  ProdutoInput,
  Solucao,
  SolucaoInput,
  UsoEmBanco,
} from '@/types/catalogo';
import type { MapeamentoGrupo } from '@/types/dePara';

export interface MudancasGrupos {
  vincular: string[];
  desvincular: string[];
}

interface Comuns {
  catalogo: Catalogo;
  mapeamentos: MapeamentoGrupo[];
  usos: UsoEmBanco[];
  /** Vincular grupos grava no De-para: só com Edição nele */
  podeEditarGrupos: boolean;
  onFechar: () => void;
}

/** Salva e fecha; sem tratar o erro aqui: o aviso vem do hook e a tela continua aberta */
function useSalvar<T>(onSalvar: (dados: T, grupos: MudancasGrupos) => Promise<void>) {
  const [salvando, setSalvando] = useState(false);
  const salvar = async (dados: T, grupos: MudancasGrupos) => {
    setSalvando(true);
    try {
      await onSalvar(dados, grupos);
    } catch {
      // O hook já avisou; a edição continua aberta para corrigir
    } finally {
      setSalvando(false);
    }
  };
  return { salvando, salvar };
}

/** Bloco comum: confirmação de inativar quando algum banco ativo usa o item */
function ConfirmarInativar({
  aberto,
  onOpenChange,
  nome,
  usos,
  extra,
  onConfirmar,
}: {
  aberto: boolean;
  onOpenChange: (v: boolean) => void;
  nome: string;
  usos: number;
  extra?: string[];
  onConfirmar: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ConfirmDialog
      aberto={aberto}
      onOpenChange={onOpenChange}
      titulo={t('produtosModulos.edicao.inativarTitulo', { nome })}
      descricao={t('produtosModulos.edicao.noEscopoDescricao', {
        bancos: plural(t, 'fase3Comum.bancosAtivos', usos),
      })}
      consequencias={[
        t('produtosModulos.edicao.semEscopoNovo'),
        t('produtosModulos.edicao.bancosNaoMudam'),
        ...(extra ?? []),
      ]}
      rotuloConfirmar={t('fase3Comum.inativar')}
      tom="perigo"
      onConfirmar={onConfirmar}
    />
  );
}

/** Seção de grupos: só na edição de um item que já existe */
function SecaoGrupos({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <Secao titulo={titulo}>{children}</Secao>;
}

/* ------------------------------------------------------------------ */
/* Solução                                                              */
/* ------------------------------------------------------------------ */

export function EdicaoSolucao({
  solucao,
  catalogo,
  mapeamentos,
  podeEditarGrupos,
  onFechar,
  onSalvar,
  onExcluir,
}: Comuns & {
  solucao: Solucao | null;
  onSalvar: (dados: SolucaoInput, grupos: MudancasGrupos) => Promise<void>;
  /** Só para a solução que nunca foi usada */
  onExcluir?: () => void;
}) {
  const { t } = useTranslation();
  const novo = solucao === null;
  const ultimaAlteracao = useUltimaAlteracao(solucao?.atualizadoEm, solucao?.atualizadoPor);
  const [codigo, setCodigo] = useState(solucao?.codigo ?? '');
  const [nome, setNome] = useState(solucao?.nome ?? '');
  const [ativo, setAtivo] = useState(solucao?.ativo ?? true);
  const inicial = solucao ? gruposDaSolucao(mapeamentos, solucao.id) : [];
  const [grupos, setGrupos] = useState(inicial);
  const { salvando, salvar } = useSalvar(onSalvar);

  const outras = catalogo.solucoes.filter((s) => s.id !== solucao?.id);
  const erroCodigo = !codigo.trim()
    ? t('fase3Comum.obrigatorio')
    : outras.some((s) => s.codigo === codigo.trim())
      ? t('produtosModulos.edicao.solucao.codigoRepetido')
      : null;
  const erroNome = !nome.trim()
    ? t('fase3Comum.obrigatorio')
    : outras.some((s) => s.nome.toLowerCase() === nome.trim().toLowerCase())
      ? t('produtosModulos.edicao.solucao.nomeRepetido')
      : null;

  return (
    <TelaEdicao
      voltarPara={t('produtosModulos.titulo')}
      titulo={
        novo
          ? t('produtosModulos.edicao.solucao.nova')
          : t('produtosModulos.edicao.editar', { nome: solucao.nome })
      }
      subtitulo={ultimaAlteracao}
      podeSalvar={(novo ? !erroCodigo : true) && !erroNome && !salvando}
      rotuloSalvar={novo ? t('produtosModulos.edicao.solucao.criar') : undefined}
      onFechar={onFechar}
      onSalvar={() =>
        salvar(
          {
            ...(solucao ? { id: solucao.id } : { codigo: codigo.trim() }),
            nome: nome.trim(),
            ativo,
          },
          mudancasDeGrupos(inicial, grupos, mapeamentos)
        )
      }
    >
      <Secao titulo={t('produtosModulos.edicao.identificacao')}>
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <Rotulo obrigatorio htmlFor="codigo-solucao">
              {t('produtosModulos.edicao.solucao.codigo')}
            </Rotulo>
            <input
              id="codigo-solucao"
              value={codigo}
              disabled={!novo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/\s/g, ''))}
              aria-invalid={!!(codigo && erroCodigo)}
              className={cn(campo, novo && codigo && erroCodigo && 'border-ds-danger-fg')}
            />
            {novo && codigo && erroCodigo && (
              <p className="mt-1.5 text-xs text-ds-danger-fg">{erroCodigo}</p>
            )}
            {!novo && <Ajuda>{t('produtosModulos.edicao.solucao.codigoNaoMuda')}</Ajuda>}
          </div>
          <CampoTexto
            id="nome-solucao"
            rotulo={t('produtosModulos.edicao.solucao.nome')}
            obrigatorio
            maiusculas
            valor={nome}
            onChange={setNome}
            erro={nome || !novo ? erroNome : null}
          />
        </div>
        {!novo && (
          <Interruptor
            ligado={ativo}
            onChange={setAtivo}
            rotulo={t('produtosModulos.edicao.solucao.ativa')}
          />
        )}
      </Secao>
      {!novo && (
        <SecaoGrupos titulo={t('produtosModulos.solucao.gruposServico')}>
          <EditorGrupos
            alvo={{ tipo: 'solucao', id: solucao.id }}
            catalogo={catalogo}
            mapeamentos={mapeamentos}
            inicial={inicial}
            grupos={grupos}
            onChange={setGrupos}
            vazioTexto={t('produtosModulos.solucao.nenhumGrupoServico')}
            ajuda={t('produtosModulos.edicao.solucao.ajudaServico')}
            somenteLeitura={!podeEditarGrupos}
          />
        </SecaoGrupos>
      )}
      {!novo && onExcluir && (
        <Secao titulo={t('produtosModulos.edicao.solucao.excluirTitulo')}>
          <Ajuda>{t('produtosModulos.edicao.solucao.excluirAjuda')}</Ajuda>
          <div className="mt-3">
            <Button variante="perigo" onClick={onExcluir}>
              <Trash2 /> {t('produtosModulos.edicao.solucao.excluir')}
            </Button>
          </div>
        </Secao>
      )}
    </TelaEdicao>
  );
}

/* ------------------------------------------------------------------ */
/* Produto                                                              */
/* ------------------------------------------------------------------ */

export function EdicaoProduto({
  produto,
  solucaoId,
  catalogo,
  mapeamentos,
  usos,
  podeEditarGrupos,
  onFechar,
  onSalvar,
}: Comuns & {
  produto: Produto | null;
  solucaoId: string;
  onSalvar: (dados: ProdutoInput, grupos: MudancasGrupos) => Promise<void>;
}) {
  const { t } = useTranslation();
  const novo = produto === null;
  const ultimaAlteracao = useUltimaAlteracao(produto?.atualizadoEm, produto?.atualizadoPor);
  const [solucao, setSolucao] = useState(produto?.solucaoId ?? solucaoId);
  const [nome, setNome] = useState(produto?.nome ?? '');
  const [descricao, setDescricao] = useState(produto?.descricao ?? '');
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [confirmar, setConfirmar] = useState(false);
  const inicial = produto ? gruposSoDoProduto(mapeamentos, produto.id) : [];
  const [grupos, setGrupos] = useState(inicial);
  const { salvando, salvar } = useSalvar(onSalvar);

  const nomeSolucao = catalogo.solucoes.find((s) => s.id === solucao)?.nome ?? '';
  const erroNome = !nome.trim()
    ? t('fase3Comum.obrigatorio')
    : catalogo.produtos.some(
          (p) =>
            p.id !== produto?.id &&
            p.solucaoId === solucao &&
            p.nome.toLowerCase() === nome.trim().toLowerCase()
        )
      ? t('produtosModulos.edicao.produto.nomeRepetido', {
          nome: nome.trim(),
          solucao: nomeSolucao,
        })
      : null;
  const usosDoProduto = produto ? usosQueAlcancamProduto(usos, produto.id) : [];
  const inativando = !!produto?.ativo && !ativo;
  const dados = (): ProdutoInput => ({
    ...(produto ? { id: produto.id } : {}),
    solucaoId: solucao,
    nome: nome.trim(),
    descricao: descricao.trim() || null,
    ativo,
  });
  const gravar = () => salvar(dados(), mudancasDeGrupos(inicial, grupos, mapeamentos));

  return (
    <TelaEdicao
      voltarPara={t('produtosModulos.titulo')}
      titulo={
        novo
          ? t('produtosModulos.edicao.produto.novo')
          : t('produtosModulos.edicao.editar', { nome: produto.nome })
      }
      subtitulo={ultimaAlteracao}
      podeSalvar={!erroNome && !salvando}
      rotuloSalvar={novo ? t('produtosModulos.edicao.produto.criar') : undefined}
      onFechar={onFechar}
      onSalvar={() => (inativando && usosDoProduto.length ? setConfirmar(true) : gravar())}
    >
      <Secao titulo={t('produtosModulos.edicao.identificacao')}>
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <Rotulo obrigatorio htmlFor="solucao-produto">
              {t('produtosModulos.edicao.produto.solucao')}
            </Rotulo>
            <Select
              id="solucao-produto"
              value={solucao}
              disabled={!novo}
              onChange={(e) => setSolucao(e.target.value)}
              className="w-full"
            >
              {catalogo.solucoes
                .filter((s) => s.ativo || s.id === solucao)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
            </Select>
            {!novo && <Ajuda>{t('produtosModulos.edicao.produto.solucaoNaoMuda')}</Ajuda>}
          </div>
          <CampoTexto
            id="nome-produto"
            rotulo={t('produtosModulos.edicao.produto.nome')}
            obrigatorio
            valor={nome}
            onChange={setNome}
            erro={nome || !novo ? erroNome : null}
          />
        </div>
        <CampoTexto
          id="descricao-produto"
          rotulo={t('produtosModulos.edicao.produto.descricao')}
          valor={descricao}
          onChange={setDescricao}
          placeholder={t('fase3Comum.opcional')}
        />
        {!novo && (
          <Interruptor
            ligado={ativo}
            onChange={setAtivo}
            rotulo={t('produtosModulos.edicao.produto.ativo')}
            descricao={
              inativando && usosDoProduto.length
                ? t('produtosModulos.edicao.noEscopo', {
                    bancos: plural(t, 'fase3Comum.bancosAtivos', usosDoProduto.length),
                  })
                : undefined
            }
          />
        )}
      </Secao>

      {novo ? (
        <Secao titulo={t('produtosModulos.edicao.produto.grupos')}>
          <Ajuda>{t('produtosModulos.edicao.gruposDepoisDeCriar')}</Ajuda>
        </Secao>
      ) : (
        <SecaoGrupos titulo={t('produtosModulos.edicao.produto.grupos')}>
          <EditorGrupos
            alvo={{ tipo: 'produto', id: produto.id }}
            catalogo={catalogo}
            mapeamentos={mapeamentos}
            inicial={inicial}
            grupos={grupos}
            onChange={setGrupos}
            vazioTexto={t('produtosModulos.edicao.produto.semGrupo')}
            ajuda={t('produtosModulos.edicao.produto.ajudaGrupos')}
            somenteLeitura={!podeEditarGrupos}
          />
        </SecaoGrupos>
      )}

      {!novo && (
        <Secao titulo={t('produtosModulos.edicao.usadoNosBancos')}>
          <UsosNaEdicao usos={usosDoProduto} nenhum={t('produtosModulos.usos.nenhumProduto')} />
        </Secao>
      )}

      <ConfirmarInativar
        aberto={confirmar}
        onOpenChange={setConfirmar}
        nome={produto?.nome ?? ''}
        usos={usosDoProduto.length}
        onConfirmar={() => {
          setConfirmar(false);
          gravar();
        }}
      />
    </TelaEdicao>
  );
}

/* ------------------------------------------------------------------ */
/* Módulo                                                               */
/* ------------------------------------------------------------------ */

export function EdicaoModulo({
  modulo,
  produtoId,
  catalogo,
  mapeamentos,
  usos,
  podeEditarGrupos,
  onFechar,
  onSalvar,
}: Comuns & {
  modulo: Modulo | null;
  produtoId: string;
  onSalvar: (dados: ModuloInput, grupos: MudancasGrupos) => Promise<void>;
}) {
  const { t } = useTranslation();
  const novo = modulo === null;
  const ultimaAlteracao = useUltimaAlteracao(modulo?.atualizadoEm, modulo?.atualizadoPor);
  const [produto, setProduto] = useState(modulo?.produtoId ?? produtoId);
  const [nome, setNome] = useState(modulo?.nome ?? '');
  const [descricao, setDescricao] = useState(modulo?.descricao ?? '');
  const [ativo, setAtivo] = useState(modulo?.ativo ?? true);
  const [confirmar, setConfirmar] = useState(false);
  const inicial = modulo ? gruposDoModulo(mapeamentos, modulo.id) : [];
  const [grupos, setGrupos] = useState(inicial);
  const { salvando, salvar } = useSalvar(onSalvar);

  const nomeProduto = catalogo.produtos.find((p) => p.id === produto)?.nome ?? '';
  const repetido = catalogo.modulos.some(
    (m) =>
      m.produtoId === produto &&
      m.id !== modulo?.id &&
      m.nome.toLowerCase() === nome.trim().toLowerCase()
  );
  const erroNome = !nome.trim()
    ? t('fase3Comum.obrigatorio')
    : repetido
      ? t('produtosModulos.edicao.modulo.nomeRepetido', { nome: nome.trim(), produto: nomeProduto })
      : null;
  const usosDoItem = modulo ? usosDoModulo(usos, modulo) : [];
  const inativando = !!modulo?.ativo && !ativo;
  const dados = (): ModuloInput => ({
    ...(modulo ? { id: modulo.id } : {}),
    produtoId: produto,
    nome: nome.trim(),
    descricao: descricao.trim() || null,
    ativo,
  });
  const gravar = () => salvar(dados(), mudancasDeGrupos(inicial, grupos, mapeamentos));

  return (
    <TelaEdicao
      voltarPara={t('produtosModulos.titulo')}
      titulo={
        novo
          ? t('produtosModulos.edicao.modulo.novo')
          : t('produtosModulos.edicao.editar', { nome: modulo.nome })
      }
      subtitulo={ultimaAlteracao}
      podeSalvar={!erroNome && !salvando}
      rotuloSalvar={novo ? t('produtosModulos.edicao.modulo.criar') : undefined}
      onFechar={onFechar}
      onSalvar={() => (inativando && usosDoItem.length ? setConfirmar(true) : gravar())}
    >
      <Secao titulo={t('produtosModulos.edicao.identificacao')}>
        <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div>
            <Rotulo obrigatorio htmlFor="produto-modulo">
              {t('produtosModulos.edicao.modulo.produto')}
            </Rotulo>
            <Select
              id="produto-modulo"
              value={produto}
              disabled={!novo}
              onChange={(e) => setProduto(e.target.value)}
              className="w-full"
            >
              {catalogo.solucoes.map((s) => (
                <optgroup key={s.id} label={s.nome}>
                  {catalogo.produtos
                    .filter(
                      (p) =>
                        p.solucaoId === s.id && (p.ativo || p.id === produto) && !p.aClassificar
                    )
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
            {!novo && <Ajuda>{t('produtosModulos.edicao.modulo.produtoNaoMuda')}</Ajuda>}
          </div>
          <CampoTexto
            id="nome-modulo"
            rotulo={t('produtosModulos.edicao.modulo.nome')}
            obrigatorio
            valor={nome}
            onChange={setNome}
            erro={nome || !novo ? erroNome : null}
          />
        </div>
        <CampoTexto
          id="descricao-modulo"
          rotulo={t('produtosModulos.edicao.modulo.descricao')}
          valor={descricao}
          onChange={setDescricao}
          placeholder={t('fase3Comum.opcional')}
        />
        {!novo && (
          <Interruptor
            ligado={ativo}
            onChange={setAtivo}
            rotulo={t('produtosModulos.edicao.modulo.ativo')}
            descricao={
              inativando && usosDoItem.length
                ? t('produtosModulos.edicao.noEscopo', {
                    bancos: plural(t, 'fase3Comum.bancosAtivos', usosDoItem.length),
                  })
                : undefined
            }
          />
        )}
      </Secao>

      {!novo && (
        <SecaoGrupos titulo={t('produtosModulos.edicao.modulo.grupos')}>
          <EditorGrupos
            alvo={{ tipo: 'modulo', id: modulo.id }}
            catalogo={catalogo}
            mapeamentos={mapeamentos}
            inicial={inicial}
            grupos={grupos}
            onChange={setGrupos}
            vazioTexto={t('produtosModulos.edicao.modulo.semGrupo')}
            ajuda={t('produtosModulos.edicao.modulo.ajudaGrupos')}
            somenteLeitura={!podeEditarGrupos}
          />
        </SecaoGrupos>
      )}

      {!novo && (
        <Secao titulo={t('produtosModulos.edicao.usadoNosBancos')}>
          <UsosNaEdicao usos={usosDoItem} nenhum={t('produtosModulos.usos.nenhumModulo')} />
        </Secao>
      )}

      <ConfirmarInativar
        aberto={confirmar}
        onOpenChange={setConfirmar}
        nome={modulo?.nome ?? ''}
        usos={usosDoItem.length}
        extra={[t('produtosModulos.edicao.gruposContinuam')]}
        onConfirmar={() => {
          setConfirmar(false);
          gravar();
        }}
      />
    </TelaEdicao>
  );
}
