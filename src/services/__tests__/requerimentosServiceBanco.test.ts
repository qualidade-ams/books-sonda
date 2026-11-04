/**
 * Banco escolhido no lançamento do requerimento (empresa liberada):
 * criarRequerimento e atualizarRequerimento gravam a escolha pelo
 * requerimentoBancoService.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequerimentosService } from '../requerimentosService';
import { supabase } from '@/integrations/supabase/client';
import { requerimentoBancoService } from '@/services/requerimentoBancoService';
import type { RequerimentoFormData } from '@/types/requerimentos';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/services/requerimentoBancoService', () => ({
  requerimentoBancoService: { definirBanco: vi.fn() },
}));

const from = vi.mocked(supabase.from);
const definirBanco = vi.mocked(requerimentoBancoService.definirBanco);

let idsCriados: string[];
let inseridos: any[];
let apagados: string[];

function montarBanco() {
  inseridos = [];
  apagados = [];
  from.mockImplementation(((tabela: string) => {
    if (tabela === 'empresas_clientes') {
      const cadeia: any = {
        eq: () => cadeia,
        single: async () => ({ data: { id: 'empresa-1' }, error: null }),
      };
      return { select: () => cadeia };
    }
    // requerimentos
    const duplicidade: any = {
      eq: () => duplicidade,
      is: () => duplicidade,
      limit: async () => ({ data: [], error: null }),
    };
    return {
      select: () => duplicidade,
      insert: (linha: any) => ({
        select: () => ({
          single: async () => {
            const criado = { ...linha, id: idsCriados.shift() };
            inseridos.push(criado);
            return { data: criado, error: null };
          },
        }),
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
      delete: () => ({
        eq: async (_coluna: string, id: string) => {
          apagados.push(id);
          return { error: null };
        },
      }),
    };
  }) as any);
}

const base: RequerimentoFormData = {
  chamado: 'RF-123',
  cliente_id: 'empresa-1',
  modulo: 'Comex',
  descricao: 'Ajuste no relatório',
  data_envio: '2026-10-01',
  horas_funcional: 2,
  horas_tecnico: 0,
  tipo_cobranca: 'Banco de Horas',
  mes_cobranca: '10/2026',
} as RequerimentoFormData;

describe('RequerimentosService — banco escolhido no lançamento', () => {
  let service: RequerimentosService;

  beforeEach(() => {
    vi.clearAllMocks();
    idsCriados = ['req-principal', 'req-analise-ef'];
    definirBanco.mockResolvedValue(undefined);
    montarBanco();
    service = new RequerimentosService();
  });

  describe('criarRequerimento', () => {
    it('Banco de Horas com banco escolhido grava a escolha no requerimento criado', async () => {
      await service.criarRequerimento({ ...base, banco_horas_id: 'banco-fiscal' });

      expect(definirBanco).toHaveBeenCalledTimes(1);
      expect(definirBanco).toHaveBeenCalledWith('req-principal', 'banco-fiscal');
    });

    it('o banco não vai para a tabela de requerimentos', async () => {
      await service.criarRequerimento({ ...base, banco_horas_id: 'banco-fiscal' });

      expect(inseridos[0]).not.toHaveProperty('banco_horas_id');
    });

    it('sem banco escolhido (empresa no legado), nada é gravado', async () => {
      await service.criarRequerimento(base);

      expect(definirBanco).not.toHaveBeenCalled();
    });

    it('tipo que não desconta do banco ignora o banco', async () => {
      await service.criarRequerimento({
        ...base,
        tipo_cobranca: 'Faturado',
        valor_hora_funcional: 100,
        banco_horas_id: 'banco-fiscal',
      });

      expect(definirBanco).not.toHaveBeenCalled();
    });

    it('Reprovado com análise EF grava o banco só no requerimento de Banco de Horas da EF', async () => {
      await service.criarRequerimento({
        ...base,
        tipo_cobranca: 'Reprovado',
        horas_analise_ef: '3:00',
        banco_horas_id: 'banco-fiscal',
      });

      expect(inseridos.map((r) => r.tipo_cobranca)).toEqual(['Reprovado', 'Banco de Horas']);
      expect(definirBanco).toHaveBeenCalledTimes(1);
      expect(definirBanco).toHaveBeenCalledWith('req-analise-ef', 'banco-fiscal');
    });

    it('se o banco for recusado, desfaz o requerimento criado e avisa o motivo', async () => {
      definirBanco.mockRejectedValue(
        new Error('Erro ao gravar o banco do requerimento: O banco escolhido está inativo.')
      );

      await expect(
        service.criarRequerimento({ ...base, banco_horas_id: 'banco-inativo' })
      ).rejects.toThrow('O banco escolhido está inativo.');
      expect(apagados).toEqual(['req-principal']);
    });
  });

  describe('atualizarRequerimento', () => {
    it('Banco de Horas com banco escolhido grava a escolha depois de salvar', async () => {
      await service.atualizarRequerimento('req-1', { ...base, banco_horas_id: 'banco-padrao' });

      expect(definirBanco).toHaveBeenCalledWith('req-1', 'banco-padrao');
    });

    it('sem banco escolhido, nada é gravado', async () => {
      await service.atualizarRequerimento('req-1', base);

      expect(definirBanco).not.toHaveBeenCalled();
    });

    it('tipo que não desconta do banco ignora o banco', async () => {
      await service.atualizarRequerimento('req-1', {
        ...base,
        tipo_cobranca: 'Reprovado',
        horas_analise_ef: '3:00',
        banco_horas_id: 'banco-padrao',
      });

      expect(definirBanco).not.toHaveBeenCalled();
    });

    it('se o banco for recusado, avisa que o requerimento foi salvo sem o banco', async () => {
      definirBanco.mockRejectedValue(
        new Error('Erro ao gravar o banco do requerimento: O banco escolhido está inativo.')
      );

      await expect(
        service.atualizarRequerimento('req-1', { ...base, banco_horas_id: 'banco-inativo' })
      ).rejects.toThrow(
        'Requerimento salvo, mas o banco não foi gravado: Erro ao gravar o banco do requerimento: O banco escolhido está inativo.'
      );
    });
  });
});
