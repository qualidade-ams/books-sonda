import { describe, it, expect } from 'vitest';
import {
  empresaFormSchema,
  clienteFormSchema,
  grupoFormSchema,
  historicoFiltrosSchema,
  agendamentoDisparoSchema,
  validationUtils
} from '../clientBooksSchemas';

describe('clientBooksSchemas', () => {
  describe('empresaFormSchema', () => {
    it('deve validar dados válidos de empresa', () => {
      const validData = {
        nomeCompleto: 'Empresa Teste Ltda',
        nomeAbreviado: 'Empresa Teste',
        linkSharepoint: 'https://sharepoint.com/empresa-teste',
        templatePadrao: 'portugues' as const,
        status: 'ativo' as const,
        emailGestor: 'gestor@empresa.com',
        produtos: ['CE_PLUS' as const],
        grupos: ['123e4567-e89b-12d3-a456-426614174000']
      };

      const result = empresaFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome completo vazio', () => {
      const invalidData = {
        nomeCompleto: '',
        nomeAbreviado: 'Teste',
        templatePadrao: 'portugues' as const,
        status: 'ativo' as const,
        produtos: ['CE_PLUS' as const]
      };

      const result = empresaFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('Nome é obrigatório');
    });

    it('deve rejeitar email inválido', () => {
      const invalidData = {
        nomeCompleto: 'Empresa Teste',
        nomeAbreviado: 'Teste',
        templatePadrao: 'portugues' as const,
        status: 'ativo' as const,
        emailGestor: 'email-invalido',
        produtos: ['CE_PLUS' as const]
      };

      const result = empresaFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(issue => 
        issue.message.includes('E-mail deve ter um formato válido')
      )).toBe(true);
    });

    it('deve exigir descrição para status inativo', () => {
      const invalidData = {
        nomeCompleto: 'Empresa Teste',
        nomeAbreviado: 'Teste',
        templatePadrao: 'portugues' as const,
        status: 'inativo' as const,
        produtos: ['CE_PLUS' as const]
      };

      const result = empresaFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(issue => 
        issue.message.includes('Descrição é obrigatória quando status for inativo ou suspenso')
      )).toBe(true);
    });

    it('deve exigir pelo menos um produto', () => {
      const invalidData = {
        nomeCompleto: 'Empresa Teste',
        nomeAbreviado: 'Teste',
        templatePadrao: 'portugues' as const,
        status: 'ativo' as const,
        produtos: []
      };

      const result = empresaFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('Pelo menos um produto deve ser selecionado');
    });
  });

  describe('clienteFormSchema', () => {
    it('deve validar dados válidos de cliente', () => {
      const validData = {
        nomeCompleto: 'João Silva',
        email: 'joao@empresa.com',
        funcao: 'Gerente',
        empresaId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'ativo' as const,
        principalContato: false
      };

      const result = clienteFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar email inválido', () => {
      const invalidData = {
        nomeCompleto: 'João Silva',
        email: 'email-invalido',
        empresaId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'ativo' as const,
        principalContato: false
      };

      const result = clienteFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('E-mail deve ter um formato válido');
    });

    it('deve exigir descrição para status inativo', () => {
      const invalidData = {
        nomeCompleto: 'João Silva',
        email: 'joao@empresa.com',
        empresaId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'inativo' as const,
        principalContato: false
      };

      const result = clienteFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(issue => 
        issue.message.includes('Descrição é obrigatória quando status for inativo')
      )).toBe(true);
    });

    it('deve rejeitar UUID inválido para empresa', () => {
      const invalidData = {
        nomeCompleto: 'João Silva',
        email: 'joao@empresa.com',
        empresaId: 'uuid-invalido',
        status: 'ativo' as const,
        principalContato: false
      };

      const result = clienteFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('ID da empresa deve ser um UUID válido');
    });
  });

  describe('grupoFormSchema', () => {
    it('deve validar dados válidos de grupo', () => {
      const validData = {
        nome: 'Grupo Teste',
        descricao: 'Descrição do grupo',
        emails: [
          { email: 'email1@teste.com', nome: 'Pessoa 1' },
          { email: 'email2@teste.com', nome: 'Pessoa 2' }
        ]
      };

      const result = grupoFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar emails duplicados', () => {
      const invalidData = {
        nome: 'Grupo Teste',
        emails: [
          { email: 'email@teste.com', nome: 'Pessoa 1' },
          { email: 'email@teste.com', nome: 'Pessoa 2' }
        ]
      };

      const result = grupoFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(issue => 
        issue.message.includes('Não é possível adicionar e-mails duplicados')
      )).toBe(true);
    });

    it('deve exigir pelo menos um email', () => {
      const invalidData = {
        nome: 'Grupo Teste',
        emails: []
      };

      const result = grupoFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('Pelo menos um e-mail deve ser adicionado');
    });
  });

  describe('agendamentoDisparoSchema', () => {
    it('deve validar agendamento válido', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const validData = {
        empresaId: '123e4567-e89b-12d3-a456-426614174000',
        clienteIds: ['123e4567-e89b-12d3-a456-426614174001'],
        dataAgendamento: futureDate
      };

      const result = agendamentoDisparoSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar data no passado', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const invalidData = {
        empresaId: '123e4567-e89b-12d3-a456-426614174000',
        clienteIds: ['123e4567-e89b-12d3-a456-426614174001'],
        dataAgendamento: pastDate
      };

      const result = agendamentoDisparoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('Data de agendamento deve ser no futuro');
    });
  });

  describe('historicoFiltrosSchema', () => {
    it('deve validar filtros válidos', () => {
      const validData = {
        mes: 6,
        ano: 2024,
        dataInicio: new Date('2024-06-01'),
        dataFim: new Date('2024-06-30')
      };

      const result = historicoFiltrosSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar mês inválido', () => {
      const invalidData = {
        mes: 13,
        ano: 2024
      };

      const result = historicoFiltrosSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('Mês deve ser entre 1 e 12');
    });

    it('deve rejeitar período de datas inválido', () => {
      const invalidData = {
        dataInicio: new Date('2024-06-30'),
        dataFim: new Date('2024-06-01')
      };

      const result = historicoFiltrosSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues.some(issue => 
        issue.message.includes('Data de início deve ser anterior à data de fim')
      )).toBe(true);
    });
  });

  describe('validationUtils', () => {
    describe('isEmailUnique', () => {
      it('deve retornar true para email único', () => {
        const result = validationUtils.isEmailUnique(
          'novo@teste.com',
          ['existente1@teste.com', 'existente2@teste.com']
        );
        expect(result).toBe(true);
      });

      it('deve retornar false para email duplicado', () => {
        const result = validationUtils.isEmailUnique(
          'existente@teste.com',
          ['existente@teste.com', 'outro@teste.com']
        );
        expect(result).toBe(false);
      });

      it('deve ser case-insensitive', () => {
        const result = validationUtils.isEmailUnique(
          'TESTE@TESTE.COM',
          ['teste@teste.com']
        );
        expect(result).toBe(false);
      });
    });

    describe('isGroupNameUnique', () => {
      it('deve retornar true para nome único', () => {
        const result = validationUtils.isGroupNameUnique(
          'Novo Grupo',
          ['Grupo Existente 1', 'Grupo Existente 2']
        );
        expect(result).toBe(true);
      });

      it('deve retornar false para nome duplicado', () => {
        const result = validationUtils.isGroupNameUnique(
          'Grupo Existente',
          ['Grupo Existente', 'Outro Grupo']
        );
        expect(result).toBe(false);
      });
    });

    describe('isFutureDate', () => {
      it('deve retornar true para data futura', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        
        const result = validationUtils.isFutureDate(futureDate);
        expect(result).toBe(true);
      });

      it('deve retornar false para data passada', () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        
        const result = validationUtils.isFutureDate(pastDate);
        expect(result).toBe(false);
      });
    });

    describe('isValidDateRange', () => {
      it('deve retornar true para período válido', () => {
        const inicio = new Date('2024-06-01');
        const fim = new Date('2024-06-30');
        
        const result = validationUtils.isValidDateRange(inicio, fim);
        expect(result).toBe(true);
      });

      it('deve retornar false para período inválido', () => {
        const inicio = new Date('2024-06-30');
        const fim = new Date('2024-06-01');
        
        const result = validationUtils.isValidDateRange(inicio, fim);
        expect(result).toBe(false);
      });
    });

    describe('isValidCNPJ', () => {
      it('deve retornar true para CNPJ com 14 dígitos', () => {
        const result = validationUtils.isValidCNPJ('12.345.678/0001-90');
        expect(result).toBe(true);
      });

      it('deve retornar false para CNPJ com menos de 14 dígitos', () => {
        const result = validationUtils.isValidCNPJ('12.345.678/001-90');
        expect(result).toBe(false);
      });

      it('deve aceitar apenas números', () => {
        const result = validationUtils.isValidCNPJ('12345678000190');
        expect(result).toBe(true);
      });
    });
  });
});