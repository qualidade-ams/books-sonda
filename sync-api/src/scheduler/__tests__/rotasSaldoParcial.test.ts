import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarHandlersSaldoParcial } from '../rotasSaldoParcial';
import { criarSupabaseFake } from '../../__tests__/helpers/supabaseFake';

function respostaFake() {
  const res: any = { statusCode: 200, corpo: undefined };
  res.status = vi.fn((s: number) => { res.statusCode = s; return res; });
  res.json = vi.fn((c: unknown) => { res.corpo = c; return res; });
  return res;
}

const agendamento = {
  id: 'ag-1',
  ativo: true,
  frequencia: 'diario',
  dias_semana: [],
  dias_mes: [],
  ultimo_dia_mes: false,
  modo_horario: 'horarios',
  horarios: ['07:00'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null,
  empresas: [{ empresa_id: 'emp-1' }]
};

describe('rotasSaldoParcial', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  function criar(encontrado: any = agendamento, renderImagemConfigurado = true) {
    const fake = criarSupabaseFake(tabela =>
      tabela === 'banco_horas_envio_agendamentos' ? { data: encontrado, error: encontrado ? null : { message: 'não encontrado' } } : null
    );
    const agendador = { executarAgendamento: vi.fn(async () => ({ sucesso: 1, erro: 0, semDestinatarios: 0, ignorados: 0 })), ativo: () => true };
    const handlers = criarHandlersSaldoParcial({ supabase: fake.cliente, agendador, renderImagemConfigurado });
    return { handlers, agendador, fake };
  }

  it('executar agora responde 202 na hora e roda em background como execução manual', async () => {
    const { handlers, agendador } = criar();
    const res = respostaFake();

    await handlers.executar({ body: { agendamentoId: 'ag-1' }, usuarioId: 'user-1' } as any, res);

    expect(res.statusCode).toBe(202);
    expect(agendador.executarAgendamento).toHaveBeenCalledWith(agendamento, { origem: 'manual', disparadoPor: 'user-1' });
  });

  it('executar agora exige o agendamento', async () => {
    const { handlers, agendador } = criar();
    const res = respostaFake();

    await handlers.executar({ body: {} } as any, res);

    expect(res.statusCode).toBe(400);
    expect(agendador.executarAgendamento).not.toHaveBeenCalled();
  });

  it('executar agora responde 404 para agendamento inexistente', async () => {
    const { handlers } = criar(null);
    const res = respostaFake();

    await handlers.executar({ body: { agendamentoId: 'x' } } as any, res);

    expect(res.statusCode).toBe(404);
  });

  it('pré-visualiza as próximas execuções da regra', async () => {
    const { handlers } = criar();
    const res = respostaFake();

    await handlers.proximasExecucoes({ body: { regra: agendamento, n: 3 } } as any, res);

    expect(res.corpo.execucoes).toHaveLength(3);
  });

  it('rejeita regra inválida na pré-visualização', async () => {
    const { handlers } = criar();
    const res = respostaFake();

    await handlers.proximasExecucoes({ body: { regra: { ...agendamento, horarios: [] } } } as any, res);

    expect(res.statusCode).toBe(400);
  });

  it('informa se o agendador está ligado e se a renderização da imagem está configurada', () => {
    const { handlers } = criar();
    const res = respostaFake();

    handlers.status({} as any, res);

    expect(res.corpo).toEqual({ agendadorAtivo: true, renderImagemConfigurado: true });
  });

  it('avisa quando falta a RENDER_IMAGE_URL', () => {
    const { handlers } = criar(agendamento, false);
    const res = respostaFake();

    handlers.status({} as any, res);

    expect(res.corpo).toEqual({ agendadorAtivo: true, renderImagemConfigurado: false });
  });
});
