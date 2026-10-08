import { describe, it, expect } from 'vitest';
import {
  COLUNA_DATA_ULTIMA_NOTA_PUBLICA,
  CONDICAO_TICKET_ALTERADO_DESDE,
  dataInicioCustomizada,
  dataUltimaAtualizacaoTicket,
  deveAtualizarTicket,
  faltaNotaPublicaNoSupabase,
} from '../atualizacaoTicket';

describe('dataInicioCustomizada', () => {
  it('converte a data do modal (YYYY-MM-DD) na meia-noite do dia, como no sync de pesquisas', () => {
    expect(dataInicioCustomizada('2026-09-18')).toEqual(new Date('2026-09-18T00:00:00.000Z'));
  });

  it('retorna null sem data ou com data inválida (usa o incremental automático)', () => {
    expect(dataInicioCustomizada(undefined)).toBeNull();
    expect(dataInicioCustomizada(null)).toBeNull();
    expect(dataInicioCustomizada('')).toBeNull();
    expect(dataInicioCustomizada('18/09/2026')).toBeNull();
    expect(dataInicioCustomizada('2026-13-45')).toBeNull();
  });
});

describe('faltaNotaPublicaNoSupabase', () => {
  const notaSql = new Date(2026, 8, 28, 9, 17, 38);

  it('é true quando o SQL Server tem nota pública e o Supabase ainda não', () => {
    expect(faltaNotaPublicaNoSupabase(notaSql, null)).toBe(true);
  });

  it('é false quando o Supabase já tem a nota pública', () => {
    expect(faltaNotaPublicaNoSupabase(notaSql, '2026-09-28T09:17:38-03:00')).toBe(false);
  });

  it('é false quando o chamado não tem nota pública no SQL Server', () => {
    expect(faltaNotaPublicaNoSupabase(null, null)).toBe(false);
  });
});

describe('dataUltimaAtualizacaoTicket', () => {
  const modificacao = new Date(2026, 9, 1, 10, 0, 0);
  const notaPublica = new Date(2026, 9, 5, 14, 30, 0);

  it('usa a nota pública quando ela é mais recente que a última modificação', () => {
    expect(dataUltimaAtualizacaoTicket(modificacao, notaPublica)).toEqual(notaPublica);
  });

  it('usa a última modificação quando ela é mais recente que a nota pública', () => {
    expect(dataUltimaAtualizacaoTicket(notaPublica, modificacao)).toEqual(notaPublica);
  });

  it('usa a nota pública quando o chamado não tem data de última modificação', () => {
    expect(dataUltimaAtualizacaoTicket(null, notaPublica)).toEqual(notaPublica);
  });

  it('usa a última modificação quando o chamado não tem nota pública', () => {
    expect(dataUltimaAtualizacaoTicket(modificacao, null)).toEqual(modificacao);
  });

  it('retorna null quando não há nenhuma das duas datas', () => {
    expect(dataUltimaAtualizacaoTicket(null, null)).toBeNull();
  });
});

describe('deveAtualizarTicket', () => {
  const supabase = new Date(2026, 9, 1, 10, 0, 0);

  it('atualiza quando a data do SQL Server é mais recente que a do Supabase', () => {
    expect(deveAtualizarTicket(new Date(2026, 9, 2), supabase)).toBe(true);
  });

  it('ignora quando a data do SQL Server é igual ou anterior à do Supabase', () => {
    expect(deveAtualizarTicket(new Date(supabase), supabase)).toBe(false);
    expect(deveAtualizarTicket(new Date(2026, 8, 30), supabase)).toBe(false);
  });

  it('atualiza quando o Supabase não tem data e ignora quando o SQL Server não tem', () => {
    expect(deveAtualizarTicket(new Date(2026, 9, 2), null)).toBe(true);
    expect(deveAtualizarTicket(null, supabase)).toBe(false);
  });

  it('atualiza o chamado que só recebeu nota pública depois da última sincronização', () => {
    const modificacao = new Date(2026, 8, 25);
    const notaPublica = new Date(2026, 9, 3);

    expect(deveAtualizarTicket(dataUltimaAtualizacaoTicket(modificacao, notaPublica), supabase)).toBe(true);
  });
});

describe('CONDICAO_TICKET_ALTERADO_DESDE', () => {
  it('lê a coluna de nota pública com o nome exato da AMSticketsabertos', () => {
    expect(COLUNA_DATA_ULTIMA_NOTA_PUBLICA).toBe('[data_ultima_nota_publica (Date-Hour-Minute-Second)]');
  });

  it('busca chamados com última modificação OU nota pública a partir de @dataInicio', () => {
    expect(CONDICAO_TICKET_ALTERADO_DESDE).toContain('CAST(Data_Ultima_Modificacao AS DATETIME) >= @dataInicio');
    expect(CONDICAO_TICKET_ALTERADO_DESDE).toContain(
      `CAST(${COLUNA_DATA_ULTIMA_NOTA_PUBLICA} AS DATETIME) >= @dataInicio`
    );
    expect(CONDICAO_TICKET_ALTERADO_DESDE).toMatch(/^\(.+ OR .+\)$/);
  });
});
