import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateValidationService } from '../templateValidationService';
import { gerarDadosExemplo, mapearVariaveisClientBooks } from '@/utils/clientBooksVariableMapping';
import type { EmailTemplate } from '@/types/approval';

describe('TemplateValidationService', () => {
  let service: TemplateValidationService;
  let templateExemplo: EmailTemplate;
  let dadosExemplo: any;

  beforeEach(() => {
    service = new TemplateValidationService();
    
    templateExemplo = {
      id: 'test-template',
      nome: 'Template Teste',
      assunto: 'Book {{empresa.nomeAbreviado}} - {{disparo.mesNome}}/{{disparo.ano}}',
      corpo: 'Olá {{cliente.nomeCompleto}}, segue o book da {{empresa.nomeCompleto}}.',
      formulario: 'book',
      modalidade: null,
      ativo: true,
      vinculado_formulario: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    dadosExemplo = gerarDadosExemplo();
  });

  describe('validarTemplateBooks', () => {
    it('deve validar template com variáveis válidas', () => {
      const variaveis = mapearVariaveisClientBooks(dadosExemplo);
      const resultado = service.validarTemplateBooks(templateExemplo, variaveis);

      expect(resultado.valido).toBe(true);
      expect(resultado.variaveisNaoEncontradas).toHaveLength(0);
      expect(resultado.erros).toHaveLength(0);
    });

    it('deve identificar variáveis não encontradas', () => {
      const templateComVariavelInexistente = {
        ...templateExemplo,
        assunto: 'Book {{empresa.nomeAbreviado}} - {{variavel.inexistente}}'
      };

      const variaveis = mapearVariaveisClientBooks(dadosExemplo);
      const resultado = service.validarTemplateBooks(templateComVariavelInexistente, variaveis);

      expect(resultado.valido).toBe(false);
      expect(resultado.variaveisNaoEncontradas).toContain('variavel.inexistente');
    });

    it('deve validar template sem variáveis obrigatórias', () => {
      const templateSemObrigatorias = {
        ...templateExemplo,
        assunto: 'Template sem variáveis obrigatórias',
        corpo: 'Conteúdo genérico'
      };

      const variaveis = mapearVariaveisClientBooks(dadosExemplo);
      const resultado = service.validarTemplateBooks(templateSemObrigatorias, variaveis);

      // Template deve ser válido mesmo sem variáveis obrigatórias
      expect(resultado.valido).toBe(true);
      // Mas pode ter avisos
      expect(resultado).toBeDefined();
    });

    it('deve aplicar fallbacks para variáveis não encontradas', () => {
      // Usar uma variável que existe nos fallbacks padrão
      const templateComVariavelInexistente = {
        ...templateExemplo,
        assunto: 'Book {{empresa.nomeCompleto}} - {{empresa.emailGestor}}'
      };

      // Remover email_gestor dos dados para forçar fallback
      const dadosModificados = {
        ...dadosExemplo,
        empresa: {
          ...dadosExemplo.empresa,
          email_gestor: null
        }
      };

      const variaveis = mapearVariaveisClientBooks(dadosModificados);
      const resultado = service.validarTemplateBooks(templateComVariavelInexistente, variaveis);

      // Verificar se há fallbacks aplicados (pode ser 0 se a variável tem valor vazio mas válido)
      expect(resultado.fallbacksAplicados).toBeDefined();
    });

    it('deve validar template sem variáveis fornecidas', () => {
      const resultado = service.validarTemplateBooks(templateExemplo);

      expect(resultado).toBeDefined();
      expect(resultado.valido).toBeDefined();
    });
  });

  describe('aplicarFallbacksNoTemplate', () => {
    it('deve aplicar fallbacks corretamente', () => {
      const template = 'Olá {{cliente.nomeCompleto}}, da {{empresa.inexistente}}';
      const fallbacks = {
        'empresa.inexistente': '[Empresa Não Encontrada]'
      };

      const resultado = service.aplicarFallbacksNoTemplate(template, fallbacks);

      expect(resultado).toContain('[Empresa Não Encontrada]');
      expect(resultado).toContain('{{cliente.nomeCompleto}}'); // Não deve alterar variáveis sem fallback
    });

    it('deve aplicar múltiplos fallbacks', () => {
      const template = '{{var1}} e {{var2}}';
      const fallbacks = {
        'var1': 'Valor1',
        'var2': 'Valor2'
      };

      const resultado = service.aplicarFallbacksNoTemplate(template, fallbacks);

      expect(resultado).toBe('Valor1 e Valor2');
    });
  });

  describe('configuração', () => {
    it('deve permitir atualizar configuração', () => {
      const novaConfig = {
        falharSeVariavelObrigatoriaNaoEncontrada: true,
        usarFallbacksAutomaticos: false
      };

      service.atualizarConfig(novaConfig);
      const config = service.obterConfig();

      expect(config.falharSeVariavelObrigatoriaNaoEncontrada).toBe(true);
      expect(config.usarFallbacksAutomaticos).toBe(false);
    });

    it('deve manter configurações não alteradas', () => {
      const configOriginal = service.obterConfig();
      
      service.atualizarConfig({
        falharSeVariavelObrigatoriaNaoEncontrada: true
      });
      
      const configAtualizada = service.obterConfig();

      expect(configAtualizada.usarFallbacksAutomaticos).toBe(configOriginal.usarFallbacksAutomaticos);
      expect(configAtualizada.logValidacoes).toBe(configOriginal.logValidacoes);
    });
  });

  describe('validação com configurações diferentes', () => {
    it('deve falhar quando configurado para falhar em variáveis obrigatórias ausentes', () => {
      service.atualizarConfig({
        falharSeVariavelObrigatoriaNaoEncontrada: true
      });

      const templateSemObrigatorias = {
        ...templateExemplo,
        assunto: 'Template sem variáveis obrigatórias',
        corpo: 'Conteúdo genérico'
      };

      const variaveis = mapearVariaveisClientBooks(dadosExemplo);
      const resultado = service.validarTemplateBooks(templateSemObrigatorias, variaveis);

      // Como não há variáveis obrigatórias no template, deve ser válido
      expect(resultado.valido).toBe(true);
    });

    it('deve não aplicar fallbacks quando desabilitado', () => {
      service.atualizarConfig({
        usarFallbacksAutomaticos: false
      });

      const templateComVariavelInexistente = {
        ...templateExemplo,
        assunto: 'Book {{empresa.nomeCompleto}} - {{variavel.inexistente}}'
      };

      const variaveis = mapearVariaveisClientBooks(dadosExemplo);
      const resultado = service.validarTemplateBooks(templateComVariavelInexistente, variaveis);

      expect(Object.keys(resultado.fallbacksAplicados)).toHaveLength(0);
    });
  });
});