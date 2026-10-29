import { describe, expect, it, vi } from 'vitest';
import {
  aplicarImagemNoCorpo,
  bancosDoSnapshot,
  imagemBancoHorasDoBook,
} from '../imagemBancoHorasBook';
import type { LinhaConsumoBook } from '../bookConsumoBancosService';
import type { ResultadoBancoMes } from '@/services/bancosHoras/motorBancosHoras';

const SET = { mes: 9, ano: 2026 };

const linha = (banco: string, nome: string): LinhaConsumoBook => ({
  banco_id: banco,
  empresa_id: 'e1',
  ordem: 1,
  nome_banco: nome,
  nome_empresa: 'EMPRESA ALFA',
  fechamento_id: 'f1',
  dados: {
    mes: SET,
    tipoContrato: 'horas',
    meses: [
      {
        mes: { mes: 8, ano: 2026 },
        situacao: 'fechado',
        resultado: { bancoId: banco } as ResultadoBancoMes,
      },
      { mes: SET, situacao: 'fechado', resultado: { bancoId: banco } as ResultadoBancoMes },
    ],
    historico: [],
    requerimentos: [],
    reajustes: [],
    observacoes: [{ mes: SET, texto: 'Observação' }],
    porTipo: { incidente: { minutos: 0, tickets: 0 }, solicitacao: { minutos: 0, tickets: 0 } },
  },
});

function dependencias(
  v: { modeloNovo?: boolean; linhas?: LinhaConsumoBook[]; imagem?: string | null } = {}
) {
  return {
    noModeloNovo: vi.fn(async () => v.modeloNovo ?? true),
    bookDoMes: vi.fn(async () => 'book1'),
    doBook: vi.fn(
      async () => v.linhas ?? [linha('b1', 'Banco COMEX'), linha('b2', 'Banco FISCAL')]
    ),
    tabelas: vi.fn<(bancos: any[], opcoes: any) => string>(
      () => '<table>COMEX</table><table>FISCAL</table>'
    ),
    renderizar: vi.fn(async () => (v.imagem === undefined ? 'PNG64' : v.imagem)),
    subir: vi.fn(async () => 'https://imagens/book.png'),
  };
}

describe('bancosDoSnapshot', () => {
  it('converte o snapshot do Book no formato das tabelas do Saldo Parcial', () => {
    const [b] = bancosDoSnapshot([linha('b1', 'Banco COMEX')]);
    expect(b).toMatchObject({
      bancoId: 'b1',
      nome: 'Banco COMEX',
      tipoContrato: 'horas',
      consomeOutrosBancos: false,
      observacoes: [{ mes: SET, texto: 'Observação' }],
    });
    expect(b.meses.map((m) => [m.chave, m.situacao])).toEqual([
      ['2026-08', 'fechado'],
      ['2026-09', 'fechado'],
    ]);
  });
});

describe('imagemBancoHorasDoBook', () => {
  const entrada = {
    empresaId: 'e1',
    empresaNome: 'EMPRESA ALFA',
    ...SET,
    idioma: 'pt-BR' as const,
  };

  it('empresa liberada: uma tabela por banco na mesma imagem, a partir do snapshot do Book', async () => {
    const d = dependencias();
    const r = await imagemBancoHorasDoBook(entrada, d);

    expect(d.noModeloNovo).toHaveBeenCalledWith('e1', SET);
    expect(d.bookDoMes).toHaveBeenCalledWith('e1', SET);
    expect(d.doBook).toHaveBeenCalledWith('book1');
    const [bancos, opcoes] = d.tabelas.mock.calls[0];
    expect(bancos.map((b: any) => b.nome)).toEqual(['Banco COMEX', 'Banco FISCAL']);
    expect(opcoes.idioma).toBe('pt-BR');
    expect(d.subir).toHaveBeenCalledWith('PNG64', 'EMPRESA ALFA');
    expect(r).toEqual({ url: 'https://imagens/book.png', html: expect.stringContaining('COMEX') });
  });

  it('empresa em Legado: nulo (o e-mail segue com a imagem atual)', async () => {
    const d = dependencias({ modeloNovo: false });
    expect(await imagemBancoHorasDoBook(entrada, d)).toBeNull();
    expect(d.bookDoMes).not.toHaveBeenCalled();
  });

  it('sem a imagem: as tabelas vão em HTML, sem URL', async () => {
    const d = dependencias({ imagem: null });
    const r = await imagemBancoHorasDoBook(entrada, d);
    expect(r).toEqual({ url: null, html: '<table>COMEX</table><table>FISCAL</table>' });
    expect(d.subir).not.toHaveBeenCalled();
  });

  it('Book do mês sem o consumo por banco: erro (não sai o e-mail com o banco errado)', async () => {
    const d = dependencias({ linhas: [] });
    await expect(imagemBancoHorasDoBook(entrada, d)).rejects.toThrow(/consumo por banco/);
  });
});

describe('aplicarImagemNoCorpo', () => {
  const corpo = '<p>Olá</p><a href="{{bancoHoras.imagemUrl}}">ver</a>{{bancoHoras.imagem}}';

  it('com a imagem: a URL e a tag img, como no e-mail atual', () => {
    const r = aplicarImagemNoCorpo(
      corpo,
      { url: 'https://img/b.png', html: '<table/>' },
      'EMPRESA ALFA'
    );
    expect(r).toContain('href="https://img/b.png"');
    expect(r).toContain(
      '<img src="https://img/b.png" alt="Banco de Horas - EMPRESA ALFA" width="700"'
    );
    expect(r).not.toContain('{{bancoHoras');
  });

  it('sem a imagem: as tabelas em HTML no lugar da imagem, e a URL vazia', () => {
    const r = aplicarImagemNoCorpo(
      corpo,
      { url: null, html: '<table>COMEX</table>' },
      'EMPRESA ALFA'
    );
    expect(r).toBe('<p>Olá</p><a href="">ver</a><table>COMEX</table>');
  });
});
