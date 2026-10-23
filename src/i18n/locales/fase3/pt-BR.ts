/**
 * Traduções das telas novas da Fase 3 (pt-BR), um arquivo por tela em ./pt-BR/. Ficam
 * fora do arquivo principal do idioma para ele não crescer; o i18n/index.ts junta os dois.
 * O teste src/i18n/__tests__/paridade.test.ts exige as mesmas chaves nos três idiomas.
 */
import fase3Comum from './pt-BR/comum';
import produtosModulos from './pt-BR/produtosModulos';
import deParaGrupos from './pt-BR/deParaGrupos';
import ramosAtividade from './pt-BR/ramosAtividade';
import regrasContagem from './pt-BR/regrasContagem';

const fase3 = { fase3Comum, produtosModulos, deParaGrupos, ramosAtividade, regrasContagem };

export default fase3;
