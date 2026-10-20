# Testes SQL das migrations

Cada arquivo testa uma migration e é **um único bloco `DO`**. Para rodar, cole o arquivo inteiro no SQL Editor do Supabase.

O resultado é sempre um erro, de propósito:

| Mensagem                    | Significado                                                                     |
| --------------------------- | ------------------------------------------------------------------------------- |
| `TESTE OK — tudo revertido` | Todas as verificações passaram, e tudo o que o teste gravou foi desfeito.       |
| Qualquer outra              | Uma verificação falhou. A mensagem diz qual foi. Também aqui nada fica gravado. |

**Por que não `BEGIN`/`ROLLBACK`:** o SQL Editor confirma cada comando separadamente, então um `ROLLBACK` no fim do arquivo não desfaz nada. Em 15/10/2026, três testes rodados assim deixaram dados gravados, um deles numa tabela do legado. Um bloco `DO` é atômico: a exceção do final desfaz tudo, em qualquer ferramenta.

Ao escrever um teste novo:

- use variáveis, não tabelas temporárias;
- troque `%ROWTYPE` de tabela temporária por `record`;
- para testar a RLS, troque o papel com `set_config('role', 'authenticated', true)` e o usuário com `set_config('request.jwt.claims', ...)`.
