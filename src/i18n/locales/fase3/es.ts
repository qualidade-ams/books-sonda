/**
 * Traduções das telas novas da Fase 3 (es), um arquivo por tela em ./es/. Ficam
 * fora do arquivo principal do idioma para ele não crescer; o i18n/index.ts junta os dois.
 * O teste src/i18n/__tests__/paridade.test.ts exige as mesmas chaves nos três idiomas.
 */
import fase3Comum from './es/comum';
import produtosModulos from './es/produtosModulos';
import deParaGrupos from './es/deParaGrupos';
import ramosAtividade from './es/ramosAtividade';
import regrasContagem from './es/regrasContagem';
import empresasCadastro from './es/empresasCadastro';
import controleBancoHoras from './es/controleBancoHoras';
import apontamentosRetroativos from './es/apontamentosRetroativos';
import auditoriaBancosHoras from './es/auditoriaBancosHoras';
import comparacaoBancosHoras from './es/comparacaoBancosHoras';
import rotinasSaldoParcial from './es/rotinasSaldoParcial';
import organizarMenu from './es/organizarMenu';
import avisos from './es/avisos';
import erros from './es/erros';

const fase3 = {
  fase3Comum,
  produtosModulos,
  deParaGrupos,
  ramosAtividade,
  regrasContagem,
  empresasCadastro,
  controleBancoHoras,
  apontamentosRetroativos,
  auditoriaBancosHoras,
  comparacaoBancosHoras,
  rotinasSaldoParcial,
  organizarMenu,
  avisos,
  erros,
};

export default fase3;
