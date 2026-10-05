import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { criarAgendadorSaldoParcial } from '../agendadorSaldoParcial';
import { criarSupabaseFake, chamadasDe, tem, type Chamada } from '../../__tests__/helpers/supabaseFake';

// 15/10/2026 08:00 em São Paulo
const AGORA = new Date('2026-10-15T11:00:00Z');
const VENCIDO = '2026-10-15T10:00:00.000Z'; // 07:00 em São Paulo

const agendamento = (extra: any = {}) => ({
  id: 'ag-1',
  nome: 'Parcial dias 15 e 25',
  ativo: true,
  frequencia: 'mensal',
  dias_semana: [],
  dias_mes: [15, 25],
  ultimo_dia_mes: false,
  modo_horario: 'horarios',
  horarios: ['07:00'],
  intervalo_horas: null,
  hora_inicio: null,
  hora_fim: null,
  emails_cc: ['qualidade@sonda.com'],
  proxima_execucao: VENCIDO,
  empresas: [{ empresa_id: 'emp-1' }, { empresa_id: 'emp-2' }],
  ...extra
});

interface Cenario {
  agendamentos?: any[];
  emailsPorEmpresa?: Record<string, string[]>;
  execucaoJaExiste?: string[]; // empresas cuja reserva da execução viola a chave única
}

function criar(cenario: Cenario, executarEnvio = vi.fn(async () => ({ enviados: 1 }))) {
  const fake = criarSupabaseFake((tabela: string, chamadas: Chamada[]) => {
    const metodo = (m: string) => chamadas.some(([n]) => n === m);
    if (tabela === 'banco_horas_envio_agendamentos' && metodo('select')) {
      return { data: cenario.agendamentos ?? [agendamento()], error: null };
    }
    if (tabela === 'banco_horas_envio_execucoes' && metodo('insert')) {
      const linha = chamadas.find(([m]) => m === 'insert')![1][0];
      if ((cenario.execucaoJaExiste ?? []).includes(linha.empresa_id)) {
        return { data: null, error: { code: '23505', message: 'duplicate key' } };
      }
      return { data: { id: `exec-${linha.empresa_id}` }, error: null };
    }
    if (tabela === 'clientes') {
      const empresa = chamadas.find(([m, a]) => m === 'eq' && a[0] === 'empresa_id')?.[1][1];
      const emails = (cenario.emailsPorEmpresa ?? { 'emp-1': ['a@cliente.com'], 'emp-2': ['b@cliente.com'] })[empresa] ?? [];
      return { data: emails.map(email => ({ email })), error: null };
    }
    return { data: null, error: null };
  });

  const agendador = criarAgendadorSaldoParcial({
    supabase: fake.cliente,
    executarEnvio,
    agora: () => AGORA,
    intervaloEntreEnviosMs: 0
  });
  return { fake, agendador, executarEnvio };
}

/** Atualizações feitas em banco_horas_envio_execucoes, por id */
const atualizacoesExecucao = (fake: ReturnType<typeof criarSupabaseFake>) =>
  fake.consultas
    .filter(c => c.tabela === 'banco_horas_envio_execucoes' && c.chamadas.some(([m]) => m === 'update'))
    .map(c => ({
      id: c.chamadas.find(([m, a]) => m === 'eq' && a[0] === 'id')?.[1][1],
      dados: c.chamadas.find(([m]) => m === 'update')![1][0]
    }));

describe('agendadorSaldoParcial', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it('lê só agendamentos ativos, com os clientes vinculados', async () => {
    const { fake, agendador } = criar({ agendamentos: [] });

    await agendador.ciclo();

    const consulta = fake.consultas.find(c => c.tabela === 'banco_horas_envio_agendamentos')!;
    expect(tem(consulta.chamadas, 'eq', 'ativo', true)).toBe(true);
    expect(String(chamadasDe(fake.consultas, 'banco_horas_envio_agendamentos', 'select')[0][0])).toContain('banco_horas_envio_agendamento_empresas');
  });

  it('agendamento sem próxima execução só recebe o horário calculado', async () => {
    const { fake, agendador, executarEnvio } = criar({ agendamentos: [agendamento({ proxima_execucao: null })] });

    await agendador.ciclo();

    expect(executarEnvio).not.toHaveBeenCalled();
    expect(chamadasDe(fake.consultas, 'banco_horas_envio_agendamentos', 'update')[0][0]).toEqual({
      proxima_execucao: '2026-10-25T10:00:00.000Z'
    });
  });

  it('agendamento vencido envia o Saldo Parcial de cada cliente com os contatos e o CC', async () => {
    const { fake, agendador, executarEnvio } = criar({});

    await agendador.ciclo();

    expect(executarEnvio).toHaveBeenCalledWith('emp-1', ['a@cliente.com'], ['qualidade@sonda.com']);
    expect(executarEnvio).toHaveBeenCalledWith('emp-2', ['b@cliente.com'], ['qualidade@sonda.com']);

    const consultaClientes = fake.consultas.find(c => c.tabela === 'clientes')!;
    expect(tem(consultaClientes.chamadas, 'eq', 'status', 'ativo')).toBe(true);
    expect(tem(consultaClientes.chamadas, 'in', 'finalidade_envio', ['saldo_parcial', 'ambos'])).toBe(true);
  });

  it('reserva a execução com o instante agendado e registra o sucesso só com a contagem de destinatários', async () => {
    const { fake, agendador } = criar({ emailsPorEmpresa: { 'emp-1': ['a@x.com', 'b@x.com'], 'emp-2': ['c@x.com'] } });

    await agendador.ciclo();

    const reservas = chamadasDe(fake.consultas, 'banco_horas_envio_execucoes', 'insert').map(a => a[0]);
    expect(reservas[0]).toMatchObject({
      agendamento_id: 'ag-1',
      empresa_id: 'emp-1',
      origem: 'agendado',
      executado_para: VENCIDO,
      status: 'executando'
    });
    const sucesso = atualizacoesExecucao(fake).find(a => a.id === 'exec-emp-1')!;
    expect(sucesso.dados).toMatchObject({ status: 'sucesso', qtd_destinatarios: 2, qtd_emails: 1 });
    expect(JSON.stringify(atualizacoesExecucao(fake))).not.toContain('@x.com');
  });

  it('agenda a próxima execução antes de enviar e registra o status final no agendamento', async () => {
    const { fake, agendador } = criar({});

    await agendador.ciclo();

    const updates = chamadasDe(fake.consultas, 'banco_horas_envio_agendamentos', 'update').map(a => a[0]);
    expect(updates[0]).toEqual({
      proxima_execucao: '2026-10-25T10:00:00.000Z',
      ultima_execucao: AGORA.toISOString(),
      ultimo_status: 'executando'
    });
    expect(updates[updates.length - 1]).toEqual({ ultimo_status: 'sucesso' });
  });

  it('não envia de novo quando a execução daquele horário já existe (serviço reiniciado)', async () => {
    const { agendador, executarEnvio } = criar({ execucaoJaExiste: ['emp-1'] });

    await agendador.ciclo();

    expect(executarEnvio).toHaveBeenCalledTimes(1);
    expect(executarEnvio).toHaveBeenCalledWith('emp-2', expect.anything(), expect.anything());
  });

  it('cliente sem contatos de Saldo Parcial fica como "sem_destinatarios" e não envia', async () => {
    const { fake, agendador, executarEnvio } = criar({ emailsPorEmpresa: { 'emp-1': [], 'emp-2': ['b@cliente.com'] } });

    await agendador.ciclo();

    expect(executarEnvio).not.toHaveBeenCalledWith('emp-1', expect.anything(), expect.anything());
    expect(atualizacoesExecucao(fake).find(a => a.id === 'exec-emp-1')!.dados).toMatchObject({
      status: 'sem_destinatarios',
      qtd_destinatarios: 0
    });
  });

  it('erro em um cliente não impede os demais e o agendamento fica "parcial"', async () => {
    const executarEnvio = vi.fn(async (empresaId: string) => {
      if (empresaId === 'emp-1') throw new Error('webhook 500');
      return { enviados: 1 };
    });
    const { fake, agendador } = criar({}, executarEnvio as any);

    await agendador.ciclo();

    expect(executarEnvio).toHaveBeenCalledTimes(2);
    expect(atualizacoesExecucao(fake).find(a => a.id === 'exec-emp-1')!.dados).toMatchObject({ status: 'erro', erro: 'webhook 500' });
    const updates = chamadasDe(fake.consultas, 'banco_horas_envio_agendamentos', 'update').map(a => a[0]);
    expect(updates[updates.length - 1]).toEqual({ ultimo_status: 'parcial' });
  });

  it('todos com erro deixam o agendamento como "erro"', async () => {
    const { fake, agendador } = criar({}, vi.fn(async () => { throw new Error('falhou'); }) as any);

    await agendador.ciclo();

    const updates = chamadasDe(fake.consultas, 'banco_horas_envio_agendamentos', 'update').map(a => a[0]);
    expect(updates[updates.length - 1]).toEqual({ ultimo_status: 'erro' });
  });

  it('ignora agendamento com regra inválida', async () => {
    const { agendador, executarEnvio } = criar({ agendamentos: [agendamento({ horarios: [] })] });

    await agendador.ciclo();

    expect(executarEnvio).not.toHaveBeenCalled();
  });

  it('executar agora (manual) registra origem e usuário e não mexe na próxima execução', async () => {
    const { fake, agendador, executarEnvio } = criar({});

    const resumo = await agendador.executarAgendamento(agendamento(), { origem: 'manual', disparadoPor: 'user-1' });

    expect(executarEnvio).toHaveBeenCalledTimes(2);
    expect(resumo).toMatchObject({ sucesso: 2, erro: 0 });
    const reserva = chamadasDe(fake.consultas, 'banco_horas_envio_execucoes', 'insert')[0][0];
    expect(reserva).toMatchObject({ origem: 'manual', disparado_por: 'user-1', executado_para: AGORA.toISOString() });
    const updates = chamadasDe(fake.consultas, 'banco_horas_envio_agendamentos', 'update').map(a => a[0]);
    expect(updates.some(u => 'proxima_execucao' in u)).toBe(false);
  });

  it('na subida marca como interrompidas as execuções que ficaram em andamento', async () => {
    const { fake, agendador } = criar({});

    await agendador.recuperarInterrompidas();

    const consulta = fake.consultas.find(c => c.tabela === 'banco_horas_envio_execucoes')!;
    expect(consulta.chamadas.find(([m]) => m === 'update')![1][0]).toMatchObject({ status: 'interrompida' });
    expect(tem(consulta.chamadas, 'eq', 'status', 'executando')).toBe(true);
  });
});
