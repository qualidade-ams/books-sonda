import { describe, it, expect } from 'vitest';
import { criarSqlConfig, SQL_REQUEST_TIMEOUT_MS } from '../sqlConfig';

const ENV = {
  SQL_SERVER: 'sql.interno',
  SQL_PORT: '1433',
  SQL_DATABASE: 'aranda',
  SQL_USER: 'usuario',
  SQL_PASSWORD: 'segredo',
};

describe('criarSqlConfig', () => {
  it('monta a configuração a partir das variáveis de ambiente', () => {
    const config = criarSqlConfig(ENV);
    expect(config.server).toBe('sql.interno');
    expect(config.port).toBe(1433);
    expect(config.database).toBe('aranda');
    expect(config.user).toBe('usuario');
    expect(config.password).toBe('segredo');
  });

  it('usa a porta padrão 10443 quando SQL_PORT não está definida', () => {
    const { SQL_PORT: _omitida, ...semPorta } = ENV;
    expect(criarSqlConfig(semPorta).port).toBe(10443);
  });

  it('dá 120s por consulta: as queries de sync varrem tabelas grandes e 30s estourava em horário de carga', () => {
    const config = criarSqlConfig(ENV);
    expect(SQL_REQUEST_TIMEOUT_MS).toBe(120_000);
    expect(config.options?.requestTimeout).toBe(SQL_REQUEST_TIMEOUT_MS);
    expect(config.options?.connectTimeout).toBe(30_000);
  });

  it('falha ao iniciar se uma variável obrigatória estiver ausente', () => {
    const { SQL_PASSWORD: _omitida, ...semSenha } = ENV;
    expect(() => criarSqlConfig(semSenha)).toThrow(/SQL_PASSWORD/);
  });
});
