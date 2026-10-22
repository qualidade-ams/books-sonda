import { describe, it, expect, vi, beforeEach } from 'vitest';
import { consultoresCoordenadoresService } from '../consultoresCoordenadoresService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

type Chamada = [string, unknown[]];

/** Fake encadeável: registra as chamadas e resolve com a resposta configurada */
function configurarFrom(resposta: { data: unknown; error: unknown }) {
  const chamadas: Chamada[] = [];
  (supabase.from as any).mockImplementation((tabela: string) => {
    chamadas.push(['from', [tabela]]);
    const q: any = new Proxy(
      {},
      {
        get(_a, prop) {
          if (prop === 'then')
            return (res: any, rej: any) => Promise.resolve(resposta).then(res, rej);
          return (...args: unknown[]) => {
            chamadas.push([String(prop), args]);
            return q;
          };
        },
      }
    );
    return q;
  });
  return chamadas;
}

const argsDe = (chamadas: Chamada[], metodo: string) =>
  chamadas.filter(([m]) => m === metodo).map(([, a]) => a);

describe('consultoresCoordenadoresService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('listarConsultores', () => {
    it('lista os consultores com o coordenador vinculado, aceitando objeto ou array no vínculo', async () => {
      const chamadas = configurarFrom({
        data: [
          {
            id: 'e1',
            nome: 'Ana',
            email: 'ana@sonda.com',
            status: 'ativo',
            especialistas_coordenadores: { coordenador_id: 'c1' },
          },
          {
            id: 'e2',
            nome: 'Bruno',
            email: null,
            status: 'inativo',
            especialistas_coordenadores: [{ coordenador_id: 'c2' }],
          },
          {
            id: 'e3',
            nome: 'Carla',
            email: 'carla@sonda.com',
            status: 'ativo',
            especialistas_coordenadores: null,
          },
        ],
        error: null,
      });

      const lista = await consultoresCoordenadoresService.listarConsultores();

      expect(argsDe(chamadas, 'from')[0]).toEqual(['especialistas']);
      expect(String(argsDe(chamadas, 'select')[0][0])).toContain('especialistas_coordenadores');
      expect(lista).toEqual([
        {
          especialistaId: 'e1',
          nome: 'Ana',
          email: 'ana@sonda.com',
          status: 'ativo',
          coordenadorId: 'c1',
        },
        {
          especialistaId: 'e2',
          nome: 'Bruno',
          email: null,
          status: 'inativo',
          coordenadorId: 'c2',
        },
        {
          especialistaId: 'e3',
          nome: 'Carla',
          email: 'carla@sonda.com',
          status: 'ativo',
          coordenadorId: null,
        },
      ]);
    });

    it('propaga erro com mensagem descritiva', async () => {
      configurarFrom({ data: null, error: { message: 'boom' } });

      await expect(consultoresCoordenadoresService.listarConsultores()).rejects.toThrow(
        'Falha ao listar consultores: boom'
      );
    });
  });

  describe('listarResponsaveis', () => {
    it('chama a função do organograma', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [{ id: 'c1', nome: 'Carlos', cargo: 'Coordenador', email: 'carlos@sonda.com' }],
        error: null,
      });

      const lista = await consultoresCoordenadoresService.listarResponsaveis();

      expect(supabase.rpc).toHaveBeenCalledWith('listar_responsaveis_organograma');
      expect(lista).toEqual([
        { id: 'c1', nome: 'Carlos', cargo: 'Coordenador', email: 'carlos@sonda.com' },
      ]);
    });

    it('propaga erro com mensagem descritiva', async () => {
      (supabase.rpc as any).mockResolvedValue({ data: null, error: { message: 'sem permissão' } });

      await expect(consultoresCoordenadoresService.listarResponsaveis()).rejects.toThrow(
        'Falha ao listar coordenadores do organograma: sem permissão'
      );
    });
  });

  describe('definirCoordenador', () => {
    it('com coordenador, grava o vínculo por upsert no consultor', async () => {
      const chamadas = configurarFrom({ data: null, error: null });

      await consultoresCoordenadoresService.definirCoordenador('e1', 'c1');

      expect(argsDe(chamadas, 'from')[0]).toEqual(['especialistas_coordenadores']);
      expect(argsDe(chamadas, 'upsert')[0]).toEqual([
        { especialista_id: 'e1', coordenador_id: 'c1' },
        { onConflict: 'especialista_id' },
      ]);
    });

    it('sem coordenador (null), remove o vínculo', async () => {
      const chamadas = configurarFrom({ data: null, error: null });

      await consultoresCoordenadoresService.definirCoordenador('e1', null);

      expect(argsDe(chamadas, 'delete')).toHaveLength(1);
      expect(argsDe(chamadas, 'eq')[0]).toEqual(['especialista_id', 'e1']);
      expect(argsDe(chamadas, 'upsert')).toHaveLength(0);
    });

    it('propaga erro com mensagem descritiva', async () => {
      configurarFrom({ data: null, error: { message: 'RLS' } });

      await expect(consultoresCoordenadoresService.definirCoordenador('e1', 'c1')).rejects.toThrow(
        'Falha ao salvar coordenador do consultor: RLS'
      );
    });
  });

  describe('listarEspecialistasParaEmail', () => {
    it('chama a função que traz o email do coordenador', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [{ nome: 'Ana', email: 'ana@sonda.com', email_coordenador: 'carlos@sonda.com' }],
        error: null,
      });

      const lista = await consultoresCoordenadoresService.listarEspecialistasParaEmail();

      expect(supabase.rpc).toHaveBeenCalledWith('listar_especialistas_para_email');
      expect(lista).toEqual([
        { nome: 'Ana', email: 'ana@sonda.com', email_coordenador: 'carlos@sonda.com' },
      ]);
    });

    it('propaga erro com mensagem descritiva', async () => {
      (supabase.rpc as any).mockResolvedValue({ data: null, error: { message: 'x' } });

      await expect(consultoresCoordenadoresService.listarEspecialistasParaEmail()).rejects.toThrow(
        'Falha ao buscar emails de consultores: x'
      );
    });
  });
});
