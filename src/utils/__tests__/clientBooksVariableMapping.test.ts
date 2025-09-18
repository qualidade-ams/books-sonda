import { describe, it, expect } from 'vitest';
import {
  mapearVariaveisClientBooks,
  substituirVariaveisClientBooks,
  validarVariaveisClientBooks,
  gerarDadosExemplo,
  obterVariaveisClientBooksDisponiveis
} from '../clientBooksVariableMapping';

describe('clientBooksVariableMapping', () => {
  const dadosExemplo = gerarDadosExemplo();

  describe('mapearVariaveisClientBooks', () => {
    it('deve mapear corretamente os dados de empresa', () => {
      const variaveis = mapearVariaveisClientBooks(dadosExemplo);

      expect(variaveis['empresa.nomeCompleto']).toBe('Empresa Exemplo Ltda');
      expect(variaveis['empresa.nomeAbreviado']).toBe('Empresa Exemplo');
      expect(variaveis['empresa.emailGestor']).toBe('gestor@exemplo.com');
      expect(variaveis['empresa.templatePadrao']).toBe('Português');
      expect(variaveis['empresa.status']).toBe('Ativo');
    });

    it('deve mapear corretamente os dados de cliente', () => {
      const variaveis = mapearVariaveisClientBooks(dadosExemplo);

      expect(variaveis['cliente.nomeCompleto']).toBe('João Silva');
      expect(variaveis['cliente.email']).toBe('joao.silva@exemplo.com');
      expect(variaveis['cliente.funcao']).toBe('Gerente Fiscal');
      expect(variaveis['cliente.principalContato']).toBe('Sim');
    });

    it('deve mapear corretamente os dados de disparo', () => {
      const variaveis = mapearVariaveisClientBooks(dadosExemplo);

      expect(variaveis['disparo.mes']).toBeDefined();
      expect(variaveis['disparo.ano']).toBeDefined();
      expect(variaveis['disparo.mesNome']).toBeDefined();
      expect(variaveis['disparo.dataDisparo']).toBeDefined();
    });

    it('deve mapear produtos corretamente', () => {
      const variaveis = mapearVariaveisClientBooks(dadosExemplo);

      expect(variaveis['empresa.produtos']).toBe('CE Plus, Fiscal');
      expect(variaveis['empresa.produtosList']).toContain('CE Plus');
      expect(variaveis['empresa.produtosList']).toContain('Fiscal');
    });
  });

  describe('substituirVariaveisClientBooks', () => {
    it('deve substituir variáveis simples no template', () => {
      const variaveis = mapearVariaveisClientBooks(dadosExemplo);
      const template = 'Olá {{cliente.nomeCompleto}}, da empresa {{empresa.nomeCompleto}}';
      
      const resultado = substituirVariaveisClientBooks(template, variaveis);
      
      expect(resultado).toBe('Olá João Silva, da empresa Empresa Exemplo Ltda');
    });

    it('deve substituir múltiplas ocorrências da mesma variável', () => {
      const variaveis = mapearVariaveisClientBooks(dadosExemplo);
      const template = '{{empresa.nomeCompleto}} - {{empresa.nomeCompleto}}';
      
      const resultado = substituirVariaveisClientBooks(template, variaveis);
      
      expect(resultado).toBe('Empresa Exemplo Ltda - Empresa Exemplo Ltda');
    });

    it('deve manter variáveis não encontradas inalteradas', () => {
      const variaveis = mapearVariaveisClientBooks(dadosExemplo);
      const template = 'Olá {{cliente.nomeCompleto}}, {{variavel.inexistente}}';
      
      const resultado = substituirVariaveisClientBooks(template, variaveis);
      
      expect(resultado).toBe('Olá João Silva, {{variavel.inexistente}}');
    });
  });

  describe('validarVariaveisClientBooks', () => {
    it('deve validar template com todas as variáveis encontradas', () => {
      const variaveis = mapearVariaveisClientBooks(dadosExemplo);
      const template = 'Olá {{cliente.nomeCompleto}}, da empresa {{empresa.nomeCompleto}}';
      
      const resultado = validarVariaveisClientBooks(template, variaveis);
      
      expect(resultado.valido).toBe(true);
      expect(resultado.variaveisNaoEncontradas).toHaveLength(0);
    });

    it('deve identificar variáveis não encontradas', () => {
      const variaveis = mapearVariaveisClientBooks(dadosExemplo);
      const template = 'Olá {{cliente.nomeCompleto}}, {{variavel.inexistente}}';
      
      const resultado = validarVariaveisClientBooks(template, variaveis);
      
      expect(resultado.valido).toBe(false);
      expect(resultado.variaveisNaoEncontradas).toContain('variavel.inexistente');
    });

    it('deve validar template vazio como válido', () => {
      const variaveis = mapearVariaveisClientBooks(dadosExemplo);
      const template = '';
      
      const resultado = validarVariaveisClientBooks(template, variaveis);
      
      expect(resultado.valido).toBe(true);
      expect(resultado.variaveisNaoEncontradas).toHaveLength(0);
    });
  });

  describe('obterVariaveisClientBooksDisponiveis', () => {
    it('deve retornar todas as categorias de variáveis', () => {
      const variaveis = obterVariaveisClientBooksDisponiveis();
      
      expect(variaveis).toHaveProperty('Dados da Empresa');
      expect(variaveis).toHaveProperty('Dados do Cliente');
      expect(variaveis).toHaveProperty('Dados do Disparo');
      expect(variaveis).toHaveProperty('Sistema');
    });

    it('deve incluir variáveis essenciais de empresa', () => {
      const variaveis = obterVariaveisClientBooksDisponiveis();
      
      expect(variaveis['Dados da Empresa']).toContain('empresa.nomeCompleto');
      expect(variaveis['Dados da Empresa']).toContain('empresa.nomeAbreviado');
      expect(variaveis['Dados da Empresa']).toContain('empresa.produtos');
    });

    it('deve incluir variáveis essenciais de cliente', () => {
      const variaveis = obterVariaveisClientBooksDisponiveis();
      
      expect(variaveis['Dados do Cliente']).toContain('cliente.nomeCompleto');
      expect(variaveis['Dados do Cliente']).toContain('cliente.email');
      expect(variaveis['Dados do Cliente']).toContain('cliente.funcao');
    });
  });

  describe('gerarDadosExemplo', () => {
    it('deve gerar dados de exemplo válidos', () => {
      const dados = gerarDadosExemplo();
      
      expect(dados.empresa).toBeDefined();
      expect(dados.cliente).toBeDefined();
      expect(dados.disparo).toBeDefined();
      
      expect(dados.empresa.nome_completo).toBeDefined();
      expect(dados.cliente.nome_completo).toBeDefined();
      expect(dados.disparo.mes).toBeGreaterThan(0);
      expect(dados.disparo.mes).toBeLessThanOrEqual(12);
    });

    it('deve gerar dados consistentes entre chamadas', () => {
      const dados1 = gerarDadosExemplo();
      const dados2 = gerarDadosExemplo();
      
      expect(dados1.empresa.nome_completo).toBe(dados2.empresa.nome_completo);
      expect(dados1.cliente.nome_completo).toBe(dados2.cliente.nome_completo);
    });
  });
});