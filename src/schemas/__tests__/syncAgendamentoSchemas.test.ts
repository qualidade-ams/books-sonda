import { describe, it, expect } from 'vitest';
import {
  agendamentoFormSchema,
  valoresIniciaisAgendamento,
  formParaAgendamentoInput,
  agendamentoParaForm,
  type AgendamentoFormValues,
} from '../syncAgendamentoSchemas';
import type { SyncAgendamento } from '@/types/syncAgendamentos';

const validos = (extra: Partial<AgendamentoFormValues> = {}): AgendamentoFormValues => ({
  ...valoresIniciaisAgendamento(),
  nome: 'Diário',
  ...extra,
});

const mensagens = (valores: AgendamentoFormValues) => {
  const r = agendamentoFormSchema.safeParse(valores);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe('agendamentoFormSchema', () => {
  it('valores iniciais + nome são válidos', () => {
    expect(mensagens(validos())).toEqual([]);
  });

  it('exige nome', () => {
    expect(mensagens(validos({ nome: '  ' }))).toContain('sincronizacaoSql.validacao.nomeObrigatorio');
  });

  it('exige ao menos uma tabela', () => {
    const tabelas = { pesquisas: false, especialistas: false, apontamentos: false, tickets: false, codigoResolucao: false, detectarInconsistencias: true, ajustesRetroativos: true };
    expect(mensagens(validos({ tabelas }))).toContain('sincronizacaoSql.validacao.tabelaObrigatoria');
  });

  it('semanal exige dia da semana', () => {
    expect(mensagens(validos({ frequencia: 'semanal', dias_semana: [] }))).toContain(
      'sincronizacaoSql.validacao.diaSemanaObrigatorio'
    );
  });

  it('mensal exige dia do mês ou último dia', () => {
    expect(mensagens(validos({ frequencia: 'mensal', dias_mes: [] }))).toContain('sincronizacaoSql.validacao.diaMesObrigatorio');
    expect(mensagens(validos({ frequencia: 'mensal', dias_mes: [], ultimo_dia_mes: true }))).toEqual([]);
  });

  it('horários fixos: exige ao menos um e formato HH:MM', () => {
    expect(mensagens(validos({ horarios: [] }))).toContain('sincronizacaoSql.validacao.horarioObrigatorio');
    expect(mensagens(validos({ horarios: ['7h'] }))).toContain('sincronizacaoSql.validacao.horarioInvalido');
  });

  it('intervalo: valida horas, início e fim', () => {
    const intervalo = { modo_horario: 'intervalo' as const, horarios: [] };
    expect(mensagens(validos({ ...intervalo, intervalo_horas: 0, hora_inicio: '07:00' }))).toContain(
      'sincronizacaoSql.validacao.intervaloInvalido'
    );
    expect(mensagens(validos({ ...intervalo, intervalo_horas: 2, hora_inicio: '' }))).toContain(
      'sincronizacaoSql.validacao.horaInicioObrigatoria'
    );
    expect(mensagens(validos({ ...intervalo, intervalo_horas: 2, hora_inicio: '10:00', hora_fim: '08:00' }))).toContain(
      'sincronizacaoSql.validacao.horaFimAntes'
    );
    expect(mensagens(validos({ ...intervalo, intervalo_horas: 2, hora_inicio: '07:00', hora_fim: '' }))).toEqual([]);
  });
});

describe('formParaAgendamentoInput', () => {
  it('limpa os campos que não se aplicam à regra escolhida', () => {
    const input = formParaAgendamentoInput(
      validos({
        frequencia: 'diario',
        dias_semana: [1],
        dias_mes: [5],
        ultimo_dia_mes: true,
        modo_horario: 'intervalo',
        horarios: ['07:00'],
        intervalo_horas: 2,
        hora_inicio: '07:00',
        hora_fim: '',
      })
    );
    expect(input).toMatchObject({
      dias_semana: [],
      dias_mes: [],
      ultimo_dia_mes: false,
      horarios: [],
      intervalo_horas: 2,
      hora_inicio: '07:00',
      hora_fim: null,
    });
  });

  it('modo horários zera o intervalo e ordena/deduplica', () => {
    const input = formParaAgendamentoInput(
      validos({ horarios: ['12:00', '07:00', '12:00'], intervalo_horas: 3, hora_inicio: '07:00' })
    );
    expect(input).toMatchObject({ horarios: ['07:00', '12:00'], intervalo_horas: null, hora_inicio: null, hora_fim: null });
  });

  it('nome sem espaços nas pontas', () => {
    expect(formParaAgendamentoInput(validos({ nome: '  Diário  ' })).nome).toBe('Diário');
  });
});

describe('agendamentoParaForm', () => {
  it('converte horas do banco (HH:MM:SS) para HH:MM', () => {
    const ag = {
      id: 'a1',
      nome: 'X',
      ativo: false,
      tabelas: { pesquisas: true },
      frequencia: 'semanal',
      dias_semana: [1],
      dias_mes: [],
      ultimo_dia_mes: false,
      modo_horario: 'intervalo',
      horarios: [],
      intervalo_horas: 2,
      hora_inicio: '07:00:00',
      hora_fim: '19:00:00',
    } as unknown as SyncAgendamento;

    const form = agendamentoParaForm(ag);
    expect(form).toMatchObject({ hora_inicio: '07:00', hora_fim: '19:00', ativo: false, frequencia: 'semanal' });
    // tabelas ausentes viram false; pós-processamento ausente vira true (padrão)
    expect(form.tabelas).toEqual({
      pesquisas: true,
      especialistas: false,
      apontamentos: false,
      tickets: false,
      codigoResolucao: false,
      detectarInconsistencias: true,
      ajustesRetroativos: true,
    });
  });
});
