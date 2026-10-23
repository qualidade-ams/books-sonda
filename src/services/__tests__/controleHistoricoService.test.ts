import { describe, it, expect } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { ControleHistoricoService } from '../controleHistoricoService';

function cenario(rpcs: Record<string, (args: any) => any> = {}) {
  return criarSupabaseEmMemoria(
    {
      auditoria_alteracoes: [
        {
          id: 1,
          banco_id: 'b1',
          tabela: 'bancos_horas_reajustes',
          registro_id: 'rj1',
          acao: 'update',
          campos_alterados: ['ativo', 'motivo_inativacao'],
          dados_antes: { ativo: true },
          dados_depois: { ativo: false },
          usuario_id: 'u1',
          origem: 'app',
          motivo: null,
          created_at: '2026-10-05T10:00:00Z',
        },
        {
          id: 2,
          banco_id: 'b1',
          tabela: 'bancos_horas_baseline',
          registro_id: 'v2',
          acao: 'insert',
          campos_alterados: null,
          dados_antes: null,
          dados_depois: { baseline_minutos: 3000 },
          usuario_id: 'u2',
          origem: 'app',
          motivo: 'Renovação',
          created_at: '2026-10-02T09:00:00Z',
        },
        // A linha do fechamento entra como versão, não como alteração
        {
          id: 3,
          banco_id: 'b1',
          tabela: 'bancos_horas_fechamentos',
          registro_id: 'f-jun',
          acao: 'insert',
          usuario_id: 'u1',
          origem: 'app',
          created_at: '2026-07-03T08:00:00Z',
        },
        {
          id: 4,
          banco_id: 'b9',
          tabela: 'bancos_horas_reajustes',
          acao: 'insert',
          created_at: '2026-10-06T00:00:00Z',
        },
      ],
      bancos_horas_fechamentos: [
        {
          id: 'f-jun',
          banco_id: 'b1',
          nome_banco: 'FISCAL – e-DOCS',
          mes: 6,
          ano: 2026,
          versao: 1,
          vigente: true,
          motivo: 'geracao_book',
          fechado_em: '2026-07-03T08:00:00Z',
          fechado_por: 'u1',
          saldo_final_minutos: 0,
          saldo_final_tickets: null,
          excedente_minutos: 120,
        },
        {
          id: 'f-fiscal-jun',
          banco_id: 'b2',
          nome_banco: 'Banco FISCAL',
          mes: 6,
          ano: 2026,
          versao: 1,
          vigente: true,
          motivo: 'geracao_book',
          fechado_em: '2026-07-03T08:00:00Z',
        },
      ],
      bancos_horas_transferencias: [
        {
          id: 't1',
          fechamento_cedente_id: 'f-fiscal-jun',
          fechamento_consumidor_id: 'f-jun',
          unidade: 'horas',
          quantidade: 390,
          created_at: '2026-07-03T08:00:01Z',
        },
      ],
    },
    {
      perfis_resumo: ({ p_ids }: { p_ids: string[] }) =>
        [
          { id: 'u1', email: 'a@sonda.com', full_name: 'Pessoa A' },
          { id: 'u2', email: 'b@sonda.com', full_name: 'Pessoa B' },
        ].filter((p) => p_ids.includes(p.id)),
      ...rpcs,
    }
  );
}

describe('ControleHistoricoService.historico', () => {
  it('junta alterações, versões e consumo entre bancos, das mais recentes', async () => {
    const eventos = await new ControleHistoricoService(cenario() as any).historico('b1');
    expect(eventos.map((e) => `${e.tipo}:${e.id}`)).toEqual([
      'alteracao:1',
      'alteracao:2',
      'transferencia:t1',
      'versao:f-jun',
    ]);
    expect(eventos[0]).toEqual({
      tipo: 'alteracao',
      id: '1',
      em: '2026-10-05T10:00:00Z',
      usuarioId: 'u1',
      usuario: 'Pessoa A',
      tabela: 'bancos_horas_reajustes',
      acao: 'update',
      campos: ['ativo', 'motivo_inativacao'],
      antes: { ativo: true },
      depois: { ativo: false },
      motivo: null,
      origem: 'app',
    });
    expect(eventos[1]).toMatchObject({ usuario: 'Pessoa B', motivo: 'Renovação', campos: [] });
    expect(eventos[2]).toEqual({
      tipo: 'transferencia',
      id: 't1',
      em: '2026-07-03T08:00:01Z',
      mes: { mes: 6, ano: 2026 },
      unidade: 'horas',
      quantidade: 390,
      papel: 'consumiu',
      outroBanco: 'Banco FISCAL',
    });
    expect(eventos[3]).toEqual({
      tipo: 'versao',
      id: 'f-jun',
      em: '2026-07-03T08:00:00Z',
      usuarioId: 'u1',
      usuario: 'Pessoa A',
      mes: { mes: 6, ano: 2026 },
      versao: 1,
      vigente: true,
      motivo: 'geracao_book',
      saldoFinalMinutos: 0,
      saldoFinalTickets: null,
      excedenteMinutos: 120,
    });
  });

  it('do lado de quem cedeu, a transferência aparece como cedida', async () => {
    const eventos = await new ControleHistoricoService(cenario() as any).historico('b2');
    expect(eventos.find((e) => e.tipo === 'transferencia')).toMatchObject({
      papel: 'cedeu',
      outroBanco: 'FISCAL – e-DOCS',
    });
  });

  it('sem permissão para os nomes, mostra só o histórico', async () => {
    const fake = cenario();
    fake.rpc = async () => ({ data: null, error: { message: 'Sem permissão', code: '42501' } });
    const eventos = await new ControleHistoricoService(fake as any).historico('b1');
    expect(eventos[0]).toMatchObject({ usuarioId: 'u1', usuario: null });
  });
});
