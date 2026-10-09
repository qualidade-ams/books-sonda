import type sql from 'mssql';

/**
 * Limite por consulta ao SQL Server Aranda.
 * As queries de sync filtram tabelas grandes sem índice utilizável, e 30s
 * estourava em horário de carga (etapa de apontamentos às 07:30). O
 * orquestrador roda em background, então o corte de 100s da Cloudflare
 * não se aplica aqui.
 */
export const SQL_REQUEST_TIMEOUT_MS = 120_000;
export const SQL_CONNECT_TIMEOUT_MS = 30_000;

const requireEnv = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente obrigatória ausente: ${name}. Configure-a antes de iniciar o serviço.`
    );
  }
  return value;
};

export function criarSqlConfig(env: NodeJS.ProcessEnv = process.env): sql.config {
  return {
    server: requireEnv(env, 'SQL_SERVER'),
    port: parseInt(env.SQL_PORT || '10443'),
    database: requireEnv(env, 'SQL_DATABASE'),
    user: requireEnv(env, 'SQL_USER'),
    password: requireEnv(env, 'SQL_PASSWORD'),
    options: {
      encrypt: false, // Para SQL Server local
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: SQL_CONNECT_TIMEOUT_MS,
      requestTimeout: SQL_REQUEST_TIMEOUT_MS,
      useUTC: false, // IMPORTANTE: Não converter datas para UTC
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}
