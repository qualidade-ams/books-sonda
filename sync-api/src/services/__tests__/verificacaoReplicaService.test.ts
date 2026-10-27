import { describe, it, expect, vi } from 'vitest';
import {
  SQL_VERIFICACAO_REPLICA,
  LIMITE_ATRASO_MINUTOS,
  avaliarAtrasoReplica,
  criarVerificadorReplica,
} from '../verificacaoReplicaService';
import { criarPoolFake } from '../../__tests__/helpers/poolFake';

const linha = (tabela: string, ultima_atualizacao: string | null, minutos_atraso: number | null) => ({
  tabela,
  ultima_atualizacao,
  minutos_atraso,
});

describe('verificacaoReplicaService', () => {
  describe('SQL_VERIFICACAO_REPLICA', () => {
    it('lê a data mais recente das duas tabelas e calcula o atraso no próprio SQL Server', () => {
      expect(SQL_VERIFICACAO_REPLICA).toContain('FROM AMSapontamento');
      expect(SQL_VERIFICACAO_REPLICA).toContain('[Data_Sistema (Date-Hour-Minute-Second)]');
      expect(SQL_VERIFICACAO_REPLICA).toContain('FROM AMSticketsabertos');
      expect(SQL_VERIFICACAO_REPLICA).toContain('Data_Abertura');
      expect(SQL_VERIFICACAO_REPLICA).toMatch(/DATEDIFF\(MINUTE,[\s\S]*GETDATE\(\)\)/);
    });
  });

  describe('avaliarAtrasoReplica', () => {
    it('limite é de 1 hora', () => {
      expect(LIMITE_ATRASO_MINUTOS).toBe(60);
    });

    it('marca como atrasada a tabela com mais de 60 minutos e monta a mensagem', () => {
      const r = avaliarAtrasoReplica([
        linha('apontamentos', '2026-10-27 08:15', 190),
        linha('tickets', '2026-10-27 11:00', 25),
      ]);

      expect(r.atrasada).toBe(true);
      expect(r.tabelas.map((t) => t.tabela)).toEqual(['apontamentos']);
      expect(r.mensagem).toContain('Apontamentos');
      expect(r.mensagem).toContain('27/10/2026 08:15');
      expect(r.mensagem).toContain('3h10min');
      expect(r.mensagem).not.toContain('Tickets');
    });

    it('lista as duas tabelas quando ambas estão atrasadas', () => {
      const r = avaliarAtrasoReplica([
        linha('apontamentos', '2026-10-27 08:15', 120),
        linha('tickets', '2026-10-26 23:40', 640),
      ]);

      expect(r.tabelas.map((t) => t.tabela)).toEqual(['apontamentos', 'tickets']);
      expect(r.mensagem).toContain('2h)');
      expect(r.mensagem).toContain('Tickets');
      expect(r.mensagem).toContain('26/10/2026 23:40');
      expect(r.mensagem).toContain('10h40min');
    });

    it('exatamente 60 minutos não é atraso (precisa ser superior a 1 hora)', () => {
      const r = avaliarAtrasoReplica([linha('apontamentos', '2026-10-27 10:00', 60), linha('tickets', '2026-10-27 10:30', 30)]);

      expect(r.atrasada).toBe(false);
      expect(r.tabelas).toEqual([]);
      expect(r.mensagem).toBeNull();
    });

    it('ignora tabela sem data (vazia ou com data inválida)', () => {
      const r = avaliarAtrasoReplica([linha('apontamentos', null, null), linha('tickets', '2026-10-27 10:30', 30)]);

      expect(r.atrasada).toBe(false);
    });
  });

  describe('criarVerificadorReplica', () => {
    const criarSupabase = (erro: any = null) => ({ rpc: vi.fn(async () => ({ data: null, error: erro })) });

    it('roda o script no pool e abre a notificação quando há atraso', async () => {
      const { pool, queries } = criarPoolFake(() => [
        linha('apontamentos', '2026-10-27 08:15', 190),
        linha('tickets', '2026-10-27 11:00', 25),
      ]);
      const supabase = criarSupabase();

      const r = await criarVerificadorReplica({ supabase: supabase as any })(pool);

      expect(queries).toEqual([SQL_VERIFICACAO_REPLICA]);
      expect(r.atrasada).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('notificacoes_sync_replica', {
        p_mensagem: r.mensagem,
        p_referencia: {
          tabelas: [{ tabela: 'apontamentos', ultima_atualizacao: '2026-10-27 08:15', minutos_atraso: 190 }],
        },
      });
    });

    it('resolve a notificação (mensagem nula) quando a réplica está em dia', async () => {
      const { pool } = criarPoolFake(() => [linha('apontamentos', '2026-10-27 11:30', 5), linha('tickets', '2026-10-27 11:00', 35)]);
      const supabase = criarSupabase();

      const r = await criarVerificadorReplica({ supabase: supabase as any })(pool);

      expect(r.atrasada).toBe(false);
      expect(supabase.rpc).toHaveBeenCalledWith('notificacoes_sync_replica', { p_mensagem: null, p_referencia: { tabelas: [] } });
    });

    it('propaga a falha ao gravar a notificação', async () => {
      const { pool } = criarPoolFake(() => [linha('apontamentos', '2026-10-27 08:15', 190)]);
      const supabase = criarSupabase({ message: 'permission denied' });

      await expect(criarVerificadorReplica({ supabase: supabase as any })(pool)).rejects.toThrow('permission denied');
    });
  });
});
