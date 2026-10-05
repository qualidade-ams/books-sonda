import { describe, it, expect } from 'vitest';
import {
  getSaudacao,
  getTextoPadraoParcial,
  gerarAssuntoSaldoParcial,
  gerarHtmlTabelasSaldoParcial,
  gerarHtmlCorpoSaldoParcial,
  gerarHtmlRenderizacaoTabelas,
  gerarHtmlEnvioComImagem,
  type DadosEmailSaldoParcial
} from '../emailSaldoParcial';
import {
  calculosFixture,
  requerimentosFixture,
  observacoesFixture
} from '@/components/admin/banco-horas/__tests__/fixturesSaldoParcial';

const dados: DadosEmailSaldoParcial = {
  calculos: calculosFixture,
  tipoCobranca: 'horas',
  percentualRepasse: 50,
  nomePeriodo: '4º Trimestre',
  requerimentos: requerimentosFixture,
  requerimentosEmDesenvolvimento: [],
  observacoes: observacoesFixture,
  diaInicioApuracao: 1,
  diaFimApuracao: 0,
  isEnglish: false
};

/** Cria um instante a partir do horário de São Paulo (UTC-3) */
const emSaoPaulo = (ano: number, mes: number, dia: number, hora: number) =>
  new Date(Date.UTC(ano, mes - 1, dia, hora + 3, 0, 0));

describe('emailSaldoParcial', () => {
  describe('getSaudacao (horário de São Paulo)', () => {
    it('usa bom dia / boa tarde / boa noite conforme a hora local de São Paulo', () => {
      expect(getSaudacao(false, emSaoPaulo(2026, 10, 2, 8))).toBe('Bom dia!');
      expect(getSaudacao(false, emSaoPaulo(2026, 10, 2, 14))).toBe('Boa tarde!');
      expect(getSaudacao(false, emSaoPaulo(2026, 10, 2, 20))).toBe('Boa noite!');
      expect(getSaudacao(true, emSaoPaulo(2026, 10, 2, 8))).toBe('Good morning!');
      expect(getSaudacao(true, emSaoPaulo(2026, 10, 2, 14))).toBe('Good afternoon!');
      expect(getSaudacao(true, emSaoPaulo(2026, 10, 2, 20))).toBe('Good evening!');
    });

    it('não depende do fuso da máquina (23h em SP já é dia seguinte em UTC)', () => {
      expect(getSaudacao(false, emSaoPaulo(2026, 10, 2, 23))).toBe('Boa noite!');
    });
  });

  describe('getTextoPadraoParcial', () => {
    it('começa pela saudação e lista o que o demonstrativo contempla', () => {
      const texto = getTextoPadraoParcial(false, emSaoPaulo(2026, 10, 2, 9));
      expect(texto.startsWith('Bom dia!\n\nSegue abaixo a previsão parcial')).toBe(true);
      expect(texto).toContain('• Apontamentos automáticos;');
      expect(texto).toContain('• Requerimentos em desenvolvimento, ainda não contabilizados no quadro de consumo;');
    });

    it('tem versão em inglês', () => {
      const texto = getTextoPadraoParcial(true, emSaoPaulo(2026, 10, 2, 9));
      expect(texto.startsWith('Good morning!\n\nBelow is the partial forecast')).toBe(true);
    });
  });

  describe('gerarAssuntoSaldoParcial', () => {
    it('no mês corrente usa a data de ontem', () => {
      expect(gerarAssuntoSaldoParcial('EMPRESA', { mes: 10, ano: 2026 }, emSaoPaulo(2026, 10, 15, 9)))
        .toBe('EMPRESA - Saldo Parcial 14.10');
    });

    it('no dia 1 do mês corrente a data de ontem é do mês anterior', () => {
      expect(gerarAssuntoSaldoParcial('EMPRESA', { mes: 10, ano: 2026 }, emSaoPaulo(2026, 10, 1, 9)))
        .toBe('EMPRESA - Saldo Parcial 30.09');
    });

    it('em outro mês usa o último dia daquele mês', () => {
      expect(gerarAssuntoSaldoParcial('EMPRESA', { mes: 9, ano: 2026 }, emSaoPaulo(2026, 10, 15, 9)))
        .toBe('EMPRESA - Saldo Parcial 30.09');
      expect(gerarAssuntoSaldoParcial('EMPRESA', { mes: 2, ano: 2028 }, emSaoPaulo(2026, 10, 15, 9)))
        .toBe('EMPRESA - Saldo Parcial 29.02');
    });
  });

  describe('montagem do HTML', () => {
    it('as tabelas incluem banco de horas, requerimentos e observações', () => {
      const html = gerarHtmlTabelasSaldoParcial(dados);
      expect(html).toContain('4º Trimestre');
      expect(html).toContain('RF-0001');
      expect(html).toContain('Observação de teste do período');
    });

    it('o corpo combina o texto, as tabelas, o encerramento e a assinatura', () => {
      const html = gerarHtmlCorpoSaldoParcial('Bom dia!\n\nTexto livre\n• item', dados, emSaoPaulo(2026, 10, 2, 9));
      expect(html).toContain('font-weight:700;">Bom dia!</p>');
      expect(html).toContain('<ul');
      expect(html).toContain('<li style="margin-bottom:4px;font-size:12pt;font-family:Calibri,sans-serif;color:#1F497D;">item</li>');
      expect(html).toContain('RF-0001');
      expect(html).toContain('Ficamos à disposição em caso de dúvidas.');
      expect(html).toContain('assinatura_nova.png');
    });

    it('o HTML para renderizar envolve as tabelas em uma página com fundo branco', () => {
      const html = gerarHtmlRenderizacaoTabelas('<table>x</table>');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('max-width:1200px');
      expect(html).toContain('<table>x</table>');
    });

    it('o e-mail com imagem usa a imagem no lugar das tabelas', () => {
      const html = gerarHtmlEnvioComImagem('Bom dia!\n\nTexto', false, 'https://exemplo.test/img.png');
      expect(html).toContain('<img src="https://exemplo.test/img.png"');
      expect(html).not.toContain('RF-0001');
      expect(html).toContain('Ficamos à disposição em caso de dúvidas.');
    });
  });
});
