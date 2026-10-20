import { describe, it, expect } from 'vitest';
import {
  agendamentoSaldoParcialFormSchema,
  valoresIniciaisAgendamentoSaldoParcial,
  formParaAgendamentoSaldoParcialInput,
  agendamentoSaldoParcialParaForm,
  adicionarEmailsCc,
  removerEmailsCc
} from '../envioSaldoParcialSchemas';

const valido = () => ({
  ...valoresIniciaisAgendamentoSaldoParcial(),
  nome: 'Parcial quinzenal',
  empresaIds: ['e1'],
  frequencia: 'mensal' as const,
  dias_mes: [15, 25]
});

const mensagens = (resultado: ReturnType<typeof agendamentoSaldoParcialFormSchema.safeParse>) =>
  resultado.success ? [] : resultado.error.issues.map(i => i.message);

describe('envioSaldoParcialSchemas', () => {
  it('aceita um agendamento válido', () => {
    expect(agendamentoSaldoParcialFormSchema.safeParse(valido()).success).toBe(true);
  });

  it('exige nome e ao menos um cliente', () => {
    const resultado = agendamentoSaldoParcialFormSchema.safeParse({ ...valido(), nome: ' ', empresaIds: [] });
    expect(mensagens(resultado)).toEqual(
      expect.arrayContaining(['envioSaldoParcial.validacao.nomeObrigatorio', 'envioSaldoParcial.validacao.clienteObrigatorio'])
    );
  });

  it('valida os e-mails em cópia (separados por ; ou ,)', () => {
    expect(agendamentoSaldoParcialFormSchema.safeParse({ ...valido(), emailsCcTexto: 'a@sonda.com; b@sonda.com' }).success).toBe(true);
    const resultado = agendamentoSaldoParcialFormSchema.safeParse({ ...valido(), emailsCcTexto: 'a@sonda.com, invalido' });
    expect(mensagens(resultado)).toContain('envioSaldoParcial.validacao.emailCcInvalido');
  });

  it('adiciona e-mails ao CC sem repetir os que já estão (ignorando maiúsculas)', () => {
    expect(adicionarEmailsCc('', ['gestor@sonda.com'])).toBe('gestor@sonda.com');
    expect(adicionarEmailsCc('a@sonda.com, b@sonda.com', ['GESTOR@sonda.com', 'A@sonda.com'])).toBe(
      'a@sonda.com; b@sonda.com; GESTOR@sonda.com'
    );
  });

  it('remove e-mails do CC (ignorando maiúsculas) e mantém os demais', () => {
    expect(removerEmailsCc('a@sonda.com; Gestor@sonda.com; b@sonda.com', ['gestor@sonda.com'])).toBe('a@sonda.com; b@sonda.com');
    expect(removerEmailsCc('gestor@sonda.com', ['gestor@sonda.com'])).toBe('');
  });

  it('reaproveita a validação da recorrência', () => {
    const resultado = agendamentoSaldoParcialFormSchema.safeParse({ ...valido(), dias_mes: [], ultimo_dia_mes: false });
    expect(mensagens(resultado)).toContain('sincronizacaoSql.validacao.diaMesObrigatorio');
  });

  it('converte o formulário no registro gravado', () => {
    const input = formParaAgendamentoSaldoParcialInput({
      ...valido(),
      nome: '  Parcial  ',
      emailsCcTexto: ' a@sonda.com ;b@sonda.com, a@sonda.com '
    });

    expect(input).toMatchObject({
      nome: 'Parcial',
      ativo: true,
      empresaIds: ['e1'],
      emails_cc: ['a@sonda.com', 'b@sonda.com'],
      frequencia: 'mensal',
      dias_mes: [15, 25],
      dias_semana: [],
      horarios: ['07:00']
    });
  });

  it('preenche o formulário a partir de um agendamento salvo', () => {
    const form = agendamentoSaldoParcialParaForm({
      id: 'ag-1',
      nome: 'Parcial',
      ativo: false,
      emails_cc: ['a@sonda.com', 'b@sonda.com'],
      empresas: [{ empresa_id: 'e1' }, { empresa_id: 'e2' }],
      frequencia: 'mensal',
      dias_semana: [],
      dias_mes: [15],
      ultimo_dia_mes: false,
      modo_horario: 'horarios',
      horarios: ['07:00:00'],
      intervalo_horas: null,
      hora_inicio: null,
      hora_fim: null
    } as any);

    expect(form).toMatchObject({
      nome: 'Parcial',
      ativo: false,
      empresaIds: ['e1', 'e2'],
      emailsCcTexto: 'a@sonda.com; b@sonda.com',
      dias_mes: [15],
      horarios: ['07:00']
    });
  });
});
