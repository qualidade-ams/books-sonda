import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarOrquestradorSync, EtapasSync, TabelasSync } from '../orquestradorSync';
import { criarSupabaseFake, chamadasDe } from '../../__tests__/helpers/supabaseFake';

const ok = (extra: any = {}) => ({
  sucesso: true,
  total_processados: 10,
  inseridos: 2,
  atualizados: 3,
  erros: 0,
  mensagens: ['ok'],
  ...extra,
});

function criarEtapas(sobrescrever: Partial<EtapasSync> = {}): EtapasSync {
  return {
    pesquisas: vi.fn(async () => ok()),
    especialistas: vi.fn(async () => ({ ...ok(), novos: 1, inseridos: undefined })),
    apontamentos: vi.fn(async () => ok()),
    tickets: vi.fn(async () => ok()),
    codigoResolucao: vi.fn(async () => ({ sucesso: true, total_processados: 4, sincronizados: 4, erros: 0, mensagens: [] })),
    validacao: vi.fn(async () => ({ resumo: { tabelas_ok: 4, tabelas_com_diferenca: 0, tabelas_com_erro: 0 }, tabelas: {} })),
    inconsistencias: vi.fn(async () => ({ sucesso: true, total_detectadas: 1, novas: 1, resolvidas: 0, mantidas: 0, atualizadas: 2, mensagens: [] })),
    ajustesRetroativos: vi.fn(async () => [{ id: 'aj' }]),
    ...sobrescrever,
  };
}

const TODAS: TabelasSync = {
  pesquisas: true,
  especialistas: true,
  apontamentos: true,
  tickets: true,
  codigoResolucao: true,
};

describe('orquestradorSync', () => {
  let fechar: ReturnType<typeof vi.fn>;
  let fake: ReturnType<typeof criarSupabaseFake>;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fechar = vi.fn(async () => {});
    fake = criarSupabaseFake((tabela, chamadas) => {
      if (tabela === 'sync_execucoes' && chamadas.some(([m]) => m === 'insert')) {
        return { data: { id: 'exec-1' }, error: null };
      }
      return { data: null, error: null };
    });
  });

  afterEach(() => vi.restoreAllMocks());

  function criar(etapas = criarEtapas()) {
    return {
      etapas,
      orq: criarOrquestradorSync({
        supabase: fake.cliente,
        abrirPool: async () => ({ pool: {} as any, fechar }),
        etapas,
        intervaloGravacaoLogsMs: 0,
      }),
    };
  }

  it('executa as etapas selecionadas e registra sucesso', async () => {
    const { orq, etapas } = criar();
    const inicio = await orq.iniciar({ tabelas: TODAS, origem: 'manual', usuarioId: 'u1' });

    expect(inicio.status).toBe('iniciada');
    expect(inicio.execucaoId).toBe('exec-1');
    await inicio.conclusao;

    for (const etapa of Object.values(etapas)) expect(etapa).toHaveBeenCalledTimes(1);

    const [insert] = chamadasDe(fake.consultas, 'sync_execucoes', 'insert')[0];
    expect(insert).toMatchObject({ origem: 'manual', disparado_por: 'u1', status: 'executando', tabelas: TODAS });

    const updates = chamadasDe(fake.consultas, 'sync_execucoes', 'update').map(([u]) => u);
    const final = updates[updates.length - 1];
    expect(final.status).toBe('sucesso');
    expect(final.finalizado_em).toBeTruthy();
    expect(final.resultado.pesquisas).toMatchObject({ sucesso: true, processados: 10, novos: 2, atualizados: 3, erros: 0 });
    expect(final.resultado.especialistas).toMatchObject({ novos: 1 });
    expect(final.resultado.inconsistencias).toMatchObject({ novas: 1, mantidas: 0, atualizadas: 2 });
    expect(final.resultado.ajustesRetroativos).toMatchObject({ sucesso: true, total: 1 });
    expect(fechar).toHaveBeenCalled();
  });

  it('pula etapas não selecionadas', async () => {
    const { orq, etapas } = criar();
    const inicio = await orq.iniciar({ tabelas: { pesquisas: true }, origem: 'manual' });
    await inicio.conclusao;

    expect(etapas.pesquisas).toHaveBeenCalled();
    expect(etapas.especialistas).not.toHaveBeenCalled();
    expect(etapas.apontamentos).not.toHaveBeenCalled();
    // retroativos só roda junto com apontamentos
    expect(etapas.ajustesRetroativos).not.toHaveBeenCalled();
    // validação e inconsistências rodam por padrão
    expect(etapas.validacao).toHaveBeenCalled();
    expect(etapas.inconsistencias).toHaveBeenCalled();
  });

  it('respeita detectarInconsistencias=false quando nenhuma tabela de origem das inconsistências é sincronizada', async () => {
    const { orq, etapas } = criar();
    const inicio = await orq.iniciar({
      tabelas: { pesquisas: true, especialistas: true, detectarInconsistencias: false },
      origem: 'manual',
    });
    await inicio.conclusao;

    expect(etapas.inconsistencias).not.toHaveBeenCalled();
  });

  it('respeita ajustesRetroativos=false', async () => {
    const { orq, etapas } = criar();
    const inicio = await orq.iniciar({
      tabelas: { apontamentos: true, ajustesRetroativos: false },
      origem: 'manual',
    });
    await inicio.conclusao;

    expect(etapas.ajustesRetroativos).not.toHaveBeenCalled();
  });

  // As inconsistências guardam dados de apontamentos, tickets e código de resolução:
  // sincronizar qualquer uma dessas tabelas sem detectar deixaria a auditoria desatualizada.
  it.each(['apontamentos', 'tickets', 'codigoResolucao'] as const)(
    'detecta inconsistências sempre que %s é sincronizado, mesmo com detectarInconsistencias=false',
    async (tabela) => {
      const { orq, etapas } = criar();
      const inicio = await orq.iniciar({
        tabelas: { [tabela]: true, detectarInconsistencias: false },
        origem: 'manual',
      });
      await inicio.conclusao;

      expect(etapas.inconsistencias).toHaveBeenCalledTimes(1);
    }
  );

  it('detecta inconsistências depois de sincronizar as tabelas de origem', async () => {
    const ordem: string[] = [];
    const etapas = criarEtapas({
      tickets: vi.fn(async () => { ordem.push('tickets'); return ok(); }),
      inconsistencias: vi.fn(async () => { ordem.push('inconsistencias'); return ok(); }),
    });
    const { orq } = criar(etapas);
    const inicio = await orq.iniciar({ tabelas: { tickets: true, detectarInconsistencias: false }, origem: 'manual' });
    await inicio.conclusao;

    expect(ordem).toEqual(['tickets', 'inconsistencias']);
  });

  it('passa dataInicial para a etapa de pesquisas', async () => {
    const { orq, etapas } = criar();
    const inicio = await orq.iniciar({ tabelas: { pesquisas: true, dataInicial: '2026-09-01' }, origem: 'manual' });
    await inicio.conclusao;
    expect(etapas.pesquisas).toHaveBeenCalledWith(expect.anything(), '2026-09-01');
  });

  it('passa dataInicial para a etapa de tickets', async () => {
    const { orq, etapas } = criar();
    const inicio = await orq.iniciar({ tabelas: { tickets: true, dataInicial: '2026-09-18' }, origem: 'manual' });
    await inicio.conclusao;
    expect(etapas.tickets).toHaveBeenCalledWith(expect.anything(), '2026-09-18');
  });

  it('sem dataInicial, tickets roda no incremental automático', async () => {
    const { orq, etapas } = criar();
    const inicio = await orq.iniciar({ tabelas: { tickets: true }, origem: 'manual' });
    await inicio.conclusao;
    expect(etapas.tickets).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it('continua após falha de uma etapa e marca como parcial', async () => {
    const etapas = criarEtapas({ especialistas: vi.fn(async () => { throw new Error('timeout'); }) });
    const { orq } = criar(etapas);
    const inicio = await orq.iniciar({ tabelas: TODAS, origem: 'agendado', agendamentoId: 'ag-1' });
    await inicio.conclusao;

    expect(etapas.apontamentos).toHaveBeenCalled();
    const updates = chamadasDe(fake.consultas, 'sync_execucoes', 'update').map(([u]) => u);
    const final = updates[updates.length - 1];
    expect(final.status).toBe('parcial');
    expect(final.resultado.especialistas).toMatchObject({ sucesso: false, erro: 'timeout' });
  });

  it('registra no log e no resultado o motivo de uma etapa que termina com erro', async () => {
    const etapas = criarEtapas({
      inconsistencias: vi.fn(async () => ({
        sucesso: false,
        total_detectadas: 0,
        mensagens: ['Erro RPC: canceling statement due to statement timeout'],
      })),
    });
    const { orq } = criar(etapas);
    const inicio = await orq.iniciar({ tabelas: { pesquisas: true }, origem: 'manual' });
    await inicio.conclusao;

    const updates = chamadasDe(fake.consultas, 'sync_execucoes', 'update').map(([u]) => u);
    const final = updates[updates.length - 1];
    expect(final.status).toBe('parcial');
    expect(final.resultado.inconsistencias).toMatchObject({
      sucesso: false,
      erro: 'Erro RPC: canceling statement due to statement timeout',
    });
    expect(final.logs.map((l: any) => l.mensagem)).toContain(
      'Detecção de inconsistências: concluído com erros — Erro RPC: canceling statement due to statement timeout'
    );
  });

  it('marca erro quando todas as etapas de sincronização falham', async () => {
    const falha = vi.fn(async () => ({ sucesso: false, erros: 1, mensagens: [] }));
    const { orq } = criar(criarEtapas({ pesquisas: falha }));
    const inicio = await orq.iniciar({ tabelas: { pesquisas: true }, origem: 'manual' });
    await inicio.conclusao;

    const updates = chamadasDe(fake.consultas, 'sync_execucoes', 'update').map(([u]) => u);
    expect(updates[updates.length - 1].status).toBe('erro');
  });

  it('marca erro e fecha o pool quando a conexão falha', async () => {
    const orq = criarOrquestradorSync({
      supabase: fake.cliente,
      abrirPool: async () => { throw new Error('sem rede'); },
      etapas: criarEtapas(),
      intervaloGravacaoLogsMs: 0,
    });
    const inicio = await orq.iniciar({ tabelas: TODAS, origem: 'manual' });
    await inicio.conclusao;

    const updates = chamadasDe(fake.consultas, 'sync_execucoes', 'update').map(([u]) => u);
    const final = updates[updates.length - 1];
    expect(final.status).toBe('erro');
    expect(final.resultado.erro).toBe('sem rede');
    expect(orq.emExecucao()).toBe(false);
  });

  it('atualiza sync_metadata das tabelas sincronizadas', async () => {
    const { orq } = criar();
    const inicio = await orq.iniciar({ tabelas: { pesquisas: true, tickets: true }, origem: 'manual' });
    await inicio.conclusao;

    const upserts = chamadasDe(fake.consultas, 'sync_metadata', 'upsert').map(([u]) => u);
    expect(upserts.map((u) => u.tabela).sort()).toEqual(['pesquisas', 'tickets']);
    expect(upserts[0]).toMatchObject({ resultado: 'sucesso', registros_processados: 10, registros_novos: 2 });
  });

  describe('trava de execução simultânea', () => {
    it('manual durante execução retorna ocupado sem criar registro', async () => {
      let liberar: () => void = () => {};
      const etapas = criarEtapas({ pesquisas: vi.fn(() => new Promise<any>((r) => { liberar = () => r(ok()); })) });
      const { orq } = criar(etapas);

      const primeira = await orq.iniciar({ tabelas: { pesquisas: true }, origem: 'manual' });
      const segunda = await orq.iniciar({ tabelas: { pesquisas: true }, origem: 'manual' });

      expect(segunda.status).toBe('ocupado');
      expect(chamadasDe(fake.consultas, 'sync_execucoes', 'insert')).toHaveLength(1);
      expect(orq.emExecucao()).toBe(true);

      await vi.waitFor(() => expect(etapas.pesquisas).toHaveBeenCalled());
      liberar();
      await primeira.conclusao;
      expect(orq.emExecucao()).toBe(false);
    });

    it('agendado durante execução é registrado como ignorada', async () => {
      let liberar: () => void = () => {};
      const etapas = criarEtapas({ pesquisas: vi.fn(() => new Promise<any>((r) => { liberar = () => r(ok()); })) });
      const { orq } = criar(etapas);

      const primeira = await orq.iniciar({ tabelas: { pesquisas: true }, origem: 'manual' });
      const agendada = await orq.iniciar({ tabelas: { pesquisas: true }, origem: 'agendado', agendamentoId: 'ag-1' });

      expect(agendada.status).toBe('ignorada');
      const inserts = chamadasDe(fake.consultas, 'sync_execucoes', 'insert').map(([i]) => i);
      expect(inserts[1]).toMatchObject({ status: 'ignorada', agendamento_id: 'ag-1', origem: 'agendado' });

      await vi.waitFor(() => expect(etapas.pesquisas).toHaveBeenCalled());
      liberar();
      await primeira.conclusao;
    });
  });

  describe('geração de books (tipo books)', () => {
    const resumo = (extra: any = {}) => ({
      mes: 9,
      ano: 2026,
      total: 3,
      gerados: 3,
      erros: 0,
      pulados: 1,
      empresas: [],
      ...extra,
    });

    function criarComBooks(gerarBooks: any) {
      const etapas = criarEtapas();
      const abrirPool = vi.fn(async () => ({ pool: {} as any, fechar }));
      const orq = criarOrquestradorSync({
        supabase: fake.cliente,
        abrirPool,
        etapas,
        gerarBooks,
        intervaloGravacaoLogsMs: 0,
      });
      return { orq, etapas, abrirPool };
    }

    const ultimoUpdate = () => {
      const updates = chamadasDe(fake.consultas, 'sync_execucoes', 'update').map(([u]) => u);
      return updates[updates.length - 1];
    };

    it('roda só a geração de books, sem abrir o SQL Server, e registra o tipo', async () => {
      const gerarBooks = vi.fn(async (ctx: any) => {
        ctx.log('ABBOTT: gerado e enviado');
        return resumo();
      });
      const { orq, etapas, abrirPool } = criarComBooks(gerarBooks);

      const inicio = await orq.iniciar({ tipo: 'books', tabelas: {}, origem: 'manual', usuarioId: 'u1' });
      expect(inicio.status).toBe('iniciada');
      if (inicio.status === 'iniciada') await expect(inicio.conclusao).resolves.toBe('sucesso');

      expect(abrirPool).not.toHaveBeenCalled();
      for (const etapa of Object.values(etapas)) expect(etapa).not.toHaveBeenCalled();
      expect(gerarBooks).toHaveBeenCalledWith(expect.objectContaining({ responsavelId: 'u1' }));

      const [insert] = chamadasDe(fake.consultas, 'sync_execucoes', 'insert')[0];
      expect(insert).toMatchObject({ tipo: 'books', origem: 'manual', disparado_por: 'u1', status: 'executando' });

      const final = ultimoUpdate();
      expect(final.status).toBe('sucesso');
      expect(final.resultado.gerarBooks).toMatchObject({ sucesso: true, total: 3, gerados: 3, erros: 0, pulados: 1 });
      expect(final.logs.map((l: any) => l.mensagem)).toContain('ABBOTT: gerado e enviado');
    });

    it('agendado usa o responsável informado (criador do agendamento) para registrar o envio', async () => {
      const gerarBooks = vi.fn(async () => resumo());
      const { orq } = criarComBooks(gerarBooks);

      const inicio = await orq.iniciar({ tipo: 'books', tabelas: {}, origem: 'agendado', agendamentoId: 'ag-1', responsavelId: 'criador' });
      if (inicio.status === 'iniciada') await inicio.conclusao;

      expect(gerarBooks).toHaveBeenCalledWith(expect.objectContaining({ responsavelId: 'criador' }));
    });

    it('parcial quando algumas empresas falham; erro quando todas falham', async () => {
      const parcial = criarComBooks(vi.fn(async () => resumo({ gerados: 2, erros: 1 })));
      const p = await parcial.orq.iniciar({ tipo: 'books', tabelas: {}, origem: 'manual' });
      if (p.status === 'iniciada') await expect(p.conclusao).resolves.toBe('parcial');
      expect(ultimoUpdate().resultado.gerarBooks.sucesso).toBe(false);

      const todas = criarComBooks(vi.fn(async () => resumo({ gerados: 0, erros: 3 })));
      const e = await todas.orq.iniciar({ tipo: 'books', tabelas: {}, origem: 'manual' });
      if (e.status === 'iniciada') await expect(e.conclusao).resolves.toBe('erro');
    });

    it('sucesso quando não há nenhum book pendente', async () => {
      const { orq } = criarComBooks(vi.fn(async () => resumo({ total: 0, gerados: 0, pulados: 130 })));
      const inicio = await orq.iniciar({ tipo: 'books', tabelas: {}, origem: 'manual' });
      if (inicio.status === 'iniciada') await expect(inicio.conclusao).resolves.toBe('sucesso');
    });

    it('registra erro quando a geração lança exceção', async () => {
      const { orq } = criarComBooks(vi.fn(async () => { throw new Error('falha ao listar books'); }));
      const inicio = await orq.iniciar({ tipo: 'books', tabelas: {}, origem: 'manual' });
      if (inicio.status === 'iniciada') await expect(inicio.conclusao).resolves.toBe('erro');

      expect(ultimoUpdate().resultado.gerarBooks).toMatchObject({ sucesso: false, erro: 'falha ao listar books' });
    });

    it('registra erro quando a geração não está configurada neste servidor', async () => {
      const { orq } = criarComBooks(undefined);
      const inicio = await orq.iniciar({ tipo: 'books', tabelas: {}, origem: 'manual' });
      if (inicio.status === 'iniciada') await expect(inicio.conclusao).resolves.toBe('erro');

      expect(ultimoUpdate().resultado.gerarBooks.erro).toMatch(/não configurada/);
    });

    it('sincronização registra o tipo sincronizacao', async () => {
      const { orq } = criarComBooks(vi.fn());
      const inicio = await orq.iniciar({ tabelas: { pesquisas: true }, origem: 'manual' });
      if (inicio.status === 'iniciada') await inicio.conclusao;

      const [insert] = chamadasDe(fake.consultas, 'sync_execucoes', 'insert')[0];
      expect(insert.tipo).toBe('sincronizacao');
    });

    it('compartilha a trava: sincronização manual durante a geração de books volta ocupado', async () => {
      let liberar: () => void = () => {};
      const gerarBooks = vi.fn(() => new Promise<any>((r) => { liberar = () => r(resumo()); }));
      const { orq } = criarComBooks(gerarBooks);

      const books = await orq.iniciar({ tipo: 'books', tabelas: {}, origem: 'manual' });
      const sync = await orq.iniciar({ tabelas: { pesquisas: true }, origem: 'manual' });

      expect(sync.status).toBe('ocupado');
      expect(orq.emExecucao()).toBe(true);

      await vi.waitFor(() => expect(gerarBooks).toHaveBeenCalled());
      liberar();
      if (books.status === 'iniciada') await books.conclusao;
      expect(orq.emExecucao()).toBe(false);
    });
  });
});
