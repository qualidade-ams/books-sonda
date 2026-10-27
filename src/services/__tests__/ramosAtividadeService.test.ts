import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria, type SupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { RamosAtividadeService } from '../ramosAtividadeService';

const autoria = { updated_at: '2026-10-22T12:00:00Z', updated_by: 'u1' };

function cenario() {
  return criarSupabaseEmMemoria({
    ramos_atividade: [
      { id: 'r2', nome: 'Energia', ordem: 2, ativo: true, ...autoria },
      { id: 'r1', nome: 'Automotivo', ordem: 1, ativo: true, ...autoria },
      { id: 'r3', nome: 'Têxtil', ordem: 3, ativo: false, ...autoria },
    ],
    empresas_informacoes_contrato: [
      { empresa_id: 'e1', ramo_atividade_id: 'r1', ramo_secundario_id: 'r2' },
      { empresa_id: 'e2', ramo_atividade_id: 'r1', ramo_secundario_id: null },
      { empresa_id: 'e3', ramo_atividade_id: null, ramo_secundario_id: null },
    ],
    empresas: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }, { id: 'e4' }],
  });
}

/** Supabase em que a operação informada na tabela devolve o erro */
function comErro(
  base: SupabaseEmMemoria,
  tabela: string,
  operacao: 'delete' | 'insert' | 'update',
  erro: { message: string; code?: string }
) {
  const falha: any = new Proxy(
    {},
    {
      get: (_alvo, prop) =>
        prop === 'then'
          ? (ok: (r: unknown) => unknown) => Promise.resolve({ data: null, error: erro }).then(ok)
          : () => falha,
    }
  );
  return {
    ...base,
    from: (t: string) => {
      const consulta = base.from(t);
      if (t !== tabela) return consulta;
      return new Proxy(consulta, {
        get: (alvo, prop) => (prop === operacao ? () => falha : alvo[prop].bind(alvo)),
      });
    },
  };
}

describe('RamosAtividadeService.listar', () => {
  it('devolve os ramos na ordem, com as empresas que usam cada um', async () => {
    const r = await new RamosAtividadeService(cenario() as any).listar();
    expect(r.totalEmpresas).toBe(4);
    expect(r.ramos.map((x) => x.nome)).toEqual(['Automotivo', 'Energia', 'Têxtil']);
    expect(r.ramos[0]).toEqual({
      id: 'r1',
      nome: 'Automotivo',
      ordem: 1,
      ativo: true,
      empresasPrincipal: 2,
      empresasSecundario: 0,
      atualizadoEm: '2026-10-22T12:00:00Z',
      atualizadoPor: 'u1',
    });
    expect(r.ramos[1]).toMatchObject({ empresasPrincipal: 0, empresasSecundario: 1 });
  });
});

describe('RamosAtividadeService.salvar', () => {
  it('aplica o rascunho: inclui, renomeia, inativa, reordena e exclui', async () => {
    const fake = cenario();
    await new RamosAtividadeService(fake as any).salvar([
      { id: 'r2', nome: 'Energia e Utilidades', ativo: true },
      { nome: ' Varejo ', ativo: true },
      { id: 'r1', nome: 'Automotivo', ativo: false },
    ]);
    const porNome = Object.fromEntries(fake.tabelas.ramos_atividade.map((r) => [r.nome, r]));
    expect(Object.keys(porNome).sort()).toEqual(['Automotivo', 'Energia e Utilidades', 'Varejo']);
    expect(porNome['Energia e Utilidades']).toMatchObject({ id: 'r2', ordem: 1, ativo: true });
    expect(porNome['Varejo']).toMatchObject({ ordem: 2, ativo: true });
    expect(porNome['Automotivo']).toMatchObject({ id: 'r1', ordem: 3, ativo: false });
  });

  it('não regrava o ramo que não mudou', async () => {
    const fake = cenario();
    const antes = { ...fake.tabelas.ramos_atividade.find((r) => r.id === 'r1') };
    await new RamosAtividadeService(fake as any).salvar([
      { id: 'r1', nome: 'Automotivo', ativo: true },
      { id: 'r2', nome: 'Energia', ativo: true },
      { id: 'r3', nome: 'Têxtil', ativo: false },
    ]);
    expect(fake.tabelas.ramos_atividade.find((r) => r.id === 'r1')).toEqual(antes);
  });

  it('ramo em uso não é excluído: pede para inativar', async () => {
    const s = new RamosAtividadeService(
      comErro(cenario(), 'ramos_atividade', 'delete', {
        code: '23503',
        message: 'update or delete on table "ramos_atividade" violates foreign key constraint',
      }) as any
    );
    await expect(
      s.salvar([
        { id: 'r2', nome: 'Energia', ativo: true },
        { id: 'r3', nome: 'Têxtil', ativo: false },
      ])
    ).rejects.toMatchObject({
      message: 'O ramo Automotivo está em uso nas empresas: inative em vez de excluir.',
      chave: 'erros.ramos.emUso',
      valores: { ramo: 'Automotivo' },
    });
  });

  it('traduz nome repetido', async () => {
    const s = new RamosAtividadeService(
      comErro(cenario(), 'ramos_atividade', 'insert', {
        code: '23505',
        message: 'duplicate key value violates unique constraint "ramos_atividade_nome_uq"',
      }) as any
    );
    await expect(
      s.salvar([
        { id: 'r1', nome: 'Automotivo', ativo: true },
        { id: 'r2', nome: 'Energia', ativo: true },
        { id: 'r3', nome: 'Têxtil', ativo: false },
        { nome: 'energia', ativo: true },
      ])
    ).rejects.toMatchObject({
      message: 'Já existe um ramo com este nome.',
      chave: 'erros.ramos.nomeRepetido',
    });
  });

  it('recusa nome vazio antes de gravar', async () => {
    const fake = cenario();
    await expect(
      new RamosAtividadeService(fake as any).salvar([{ nome: '  ', ativo: true }])
    ).rejects.toMatchObject({ message: 'Digite o nome do ramo.', chave: 'erros.ramos.nomeVazio' });
    expect(fake.tabelas.ramos_atividade).toHaveLength(3);
  });
});
