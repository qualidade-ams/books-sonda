import { describe, expect, it } from 'vitest';
import { ErroTraduzivel, chaveDaFalha, falhaDoBanco, textoDoErro } from '../erroTraduzivel';

const t = (chave: string, valores?: Record<string, unknown>) =>
  valores ? `${chave} ${JSON.stringify(valores)}` : chave;

describe('ErroTraduzivel', () => {
  it('é um Error com a mensagem em português de reserva, a chave e os valores', () => {
    const erro = new ErroTraduzivel('erros.bancos.nome', {}, 'Informe o nome do banco.');
    expect(erro).toBeInstanceOf(Error);
    expect(erro.message).toBe('Informe o nome do banco.');
    expect(erro.chave).toBe('erros.bancos.nome');
  });
});

describe('textoDoErro', () => {
  it('traduz pela chave; erro comum mostra a mensagem como veio', () => {
    expect(textoDoErro(new ErroTraduzivel('erros.x', { n: 1 }, 'x'), t)).toBe('erros.x {"n":1}');
    expect(textoDoErro(new Error('do banco'), t)).toBe('do banco');
    expect(textoDoErro('texto solto', t)).toBe('texto solto');
  });

  it('erro dentro dos valores também é traduzido (ex.: a linha da importação)', () => {
    const interno = new ErroTraduzivel('erros.bancos.nome', {}, 'Informe o nome do banco.');
    const erro = new ErroTraduzivel('erros.daLinha', { linha: 'G1', erro: interno }, 'G1: ...');
    expect(textoDoErro(erro, t)).toBe('erros.daLinha {"linha":"G1","erro":"erros.bancos.nome {}"}');
  });
});

describe('falhaDoBanco', () => {
  it('"Falha ao <ação>": a ação vira chave e o detalhe do banco vai como veio', () => {
    const erro = falhaDoBanco('salvar o banco', { message: 'violates check' });
    expect(erro.message).toBe('Falha ao salvar o banco: violates check');
    expect(erro.chave).toBe('erros.falhas.salvarOBanco');
    expect(erro.valores).toEqual({ detalhe: 'violates check' });
  });

  it('a chave sai da ação, sem acentos', () => {
    expect(chaveDaFalha('registrar a vigência')).toBe('registrarAVigencia');
    expect(chaveDaFalha('salvar AMS e projetos')).toBe('salvarAmsEProjetos');
  });
});
