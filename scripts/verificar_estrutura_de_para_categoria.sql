-- Verificar estrutura da tabela de_para_categoria
| column_name   | data_type                | is_nullable |
| ------------- | ------------------------ | ----------- |
| id            | uuid                     | NO          |
| categoria     | text                     | NO          |
| grupo         | text                     | NO          |
| status        | text                     | NO          |
| criado_em     | timestamp with time zone | YES         |
| atualizado_em | timestamp with time zone | YES         |
| criado_por    | uuid                     | YES         |
| grupo_book    | text                     | YES         |
