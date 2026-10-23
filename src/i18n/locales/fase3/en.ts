/**
 * Traduções das telas novas da Fase 3 (en), um arquivo por tela em ./en/. Ficam
 * fora do arquivo principal do idioma para ele não crescer; o i18n/index.ts junta os dois.
 * O teste src/i18n/__tests__/paridade.test.ts exige as mesmas chaves nos três idiomas.
 */
import fase3Comum from './en/comum';
import produtosModulos from './en/produtosModulos';
import deParaGrupos from './en/deParaGrupos';

const fase3 = { fase3Comum, produtosModulos, deParaGrupos };

export default fase3;
