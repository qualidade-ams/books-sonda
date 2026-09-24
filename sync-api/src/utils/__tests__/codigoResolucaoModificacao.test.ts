import { describe, it, expect } from 'vitest';
import { mapearModificacaoCodigoResolucao } from '../codigoResolucaoModificacao';

describe('mapearModificacaoCodigoResolucao', () => {
  // created vem do SQL Server como Date no horário local (mesmo padrão dos outros syncs)
  const created = new Date(2026, 8, 22, 17, 49, 28);

  it('mapeia a linha de AMScodigoresolucao_Modificacao para a tabela do Supabase', () => {
    const resultado = mapearModificacaoCodigoResolucao({
      item_id: 9329182,
      old_value: 'Manutenção de Específico (Banco=N |SLA=N)',
      new_value: 'Parametrização / Funcionalidade (Banco=S |SLA=N)',
      created,
    });

    expect(resultado).toEqual({
      id_externo: 'AMScodigoresolucao_Modificacao|9329182|2026-09-22T17:49:28',
      item_id: '9329182',
      old_value: 'Manutenção de Específico (Banco=N |SLA=N)',
      new_value: 'Parametrização / Funcionalidade (Banco=S |SLA=N)',
      created: '2026-09-22T17:49:28',
    });
  });

  it('remove espaços do item_id e converte valores vazios em null', () => {
    const resultado = mapearModificacaoCodigoResolucao({
      item_id: ' 9329182 ',
      old_value: '   ',
      new_value: 'Consultoria (Banco=S |SLA=N)',
      created,
    });

    expect(resultado?.item_id).toBe('9329182');
    expect(resultado?.old_value).toBeNull();
  });

  it('retorna null quando falta item_id ou created (linha não pode ser identificada)', () => {
    expect(mapearModificacaoCodigoResolucao({ item_id: null, old_value: null, new_value: 'X', created })).toBeNull();
    expect(mapearModificacaoCodigoResolucao({ item_id: '1', old_value: null, new_value: 'X', created: null })).toBeNull();
  });
});
