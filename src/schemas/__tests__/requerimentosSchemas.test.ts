import { describe, it, expect } from 'vitest';
import {
  requerimentoFormSchema,
  requerimentoFaturamentoSchema,
  filtrosRequerimentosSchema,
  emailFaturamentoSchema,
  buscaRequerimentosSchema,
  validarChamado,
  validarEmail,
  validarHoras,
  validarMesCobranca
} from '../requerimentosSchemas';
import { RequerimentoFormData } from '@/types/requerimentos';

describe('requerimentosSchemas', () => {
  // Dados válidos compartilhados entre os testes
  const validData: RequerimentoFormData = {
      chamado: 'RF-6017993',
      cliente_id: '123e4567-e89b-12d3-a456-426614174000',
      modulo: 'Comply',
      descricao: 'Descrição do requerimento de teste',
      data_envio: '2024-01-15',
      data_aprovacao: '2024-01-16',
      horas_funcional: 10.5,
      horas_tecnico: 5.0,
      linguagem: 'Funcional',
      tipo_cobranca: 'Banco de Horas', // Mudado para não requerer valor/hora
      mes_cobranca: '01/2024', // Opcional no formulário, obrigatório no faturamento
      observacao: 'Observação de teste'
    };

  describe('requerimentoFormSchema', () => {
    it('deve validar dados válidos', () => {
      const result = requerimentoFormSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    describe('Validação de chamado', () => {
      it('deve rejeitar chamado vazio', () => {
        const invalidData = { ...validData, chamado: '' };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Chamado é obrigatório');
        }
      });

      it('deve rejeitar chamado muito longo', () => {
        const invalidData = { ...validData, chamado: 'a'.repeat(51) };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Chamado deve ter no máximo 50 caracteres');
        }
      });

      it('deve rejeitar chamado com caracteres inválidos', () => {
        const invalidData = { ...validData, chamado: 'RF@123' };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Chamado deve conter apenas letras, números e hífen (ex: RF-6017993)');
        }
      });

      it('deve aceitar chamado válido com letras, números e hífen', () => {
        const validChamados = ['RF-123', 'ABC123', 'TEST-456-XYZ'];

        validChamados.forEach(chamado => {
          const testData = { ...validData, chamado };
          const result = requerimentoFormSchema.safeParse(testData);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('Validação de cliente_id', () => {
      it('deve rejeitar cliente_id vazio', () => {
        const invalidData = { ...validData, cliente_id: '' };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Cliente é obrigatório');
        }
      });

      it('deve rejeitar cliente_id inválido (não UUID)', () => {
        const invalidData = { ...validData, cliente_id: 'invalid-uuid' };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('ID do cliente deve ser um UUID válido');
        }
      });
    });

    describe('Validação de módulo', () => {
      it('deve aceitar módulos válidos', () => {
        const validModulos = ['Comex', 'Comply', 'Comply e-DOCS', 'Gallery', 'pw.SATI', 'pw.SPED', 'pw.SATI/pw.SPED'];

        validModulos.forEach(modulo => {
          const testData = { ...validData, modulo: modulo as any };
          const result = requerimentoFormSchema.safeParse(testData);
          expect(result.success).toBe(true);
        });
      });

      it('deve rejeitar módulo inválido', () => {
        const invalidData = { ...validData, modulo: 'ModuloInvalido' as any };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Selecione um módulo válido');
        }
      });
    });

    describe('Validação de linguagem', () => {
      it('deve aceitar linguagens válidas', () => {
        const validLinguagens = ['ABAP', 'DBA', 'Funcional', 'PL/SQL', 'Técnico'];

        validLinguagens.forEach(linguagem => {
          const testData = { ...validData, linguagem: linguagem as any };
          const result = requerimentoFormSchema.safeParse(testData);
          expect(result.success).toBe(true);
        });
      });

      it('deve rejeitar linguagem inválida', () => {
        const invalidData = { ...validData, linguagem: 'LinguagemInvalida' as any };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Selecione uma linguagem válida');
        }
      });
    });

    describe('Validação de tipo de cobrança', () => {
      it('deve aceitar tipos de cobrança válidos', () => {
        // Tipos que não requerem valor/hora
        const tiposSemValorHora = [
          'Banco de Horas', 'Cobro Interno', 'Contrato', 'Reprovado'
        ];

        tiposSemValorHora.forEach(tipo => {
          const testData = { ...validData, tipo_cobranca: tipo as any };
          const result = requerimentoFormSchema.safeParse(testData);
          expect(result.success).toBe(true);
        });

        // Tipos que requerem valor/hora
        const tiposComValorHora = [
          'Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'
        ];

        tiposComValorHora.forEach(tipo => {
          const testData = { 
            ...validData, 
            tipo_cobranca: tipo as any,
            valor_hora_funcional: 100.00,
            valor_hora_tecnico: 120.00
          };
          const result = requerimentoFormSchema.safeParse(testData);
          expect(result.success).toBe(true);
        });
      });

      it('deve rejeitar tipo de cobrança inválido', () => {
        const invalidData = { ...validData, tipo_cobranca: 'TipoInvalido' as any };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Selecione um tipo de cobrança válido');
        }
      });
    });

    describe('Validação de descrição', () => {
      it('deve rejeitar descrição vazia', () => {
        const invalidData = { ...validData, descricao: '' };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Descrição é obrigatória');
        }
      });

      it('deve rejeitar descrição muito longa', () => {
        const invalidData = { ...validData, descricao: 'a'.repeat(501) };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Descrição deve ter no máximo 500 caracteres');
        }
      });

      it('deve aceitar descrição no limite máximo', () => {
        const testData = { ...validData, descricao: 'a'.repeat(500) };
        const result = requerimentoFormSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });
    });

    describe('Validação de observação', () => {
      it('deve aceitar observação vazia (opcional)', () => {
        const testData = { ...validData, observacao: '' };
        const result = requerimentoFormSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });

      it('deve aceitar observação undefined (opcional)', () => {
        const testData = { ...validData };
        delete testData.observacao;
        const result = requerimentoFormSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });

      it('deve rejeitar observação muito longa', () => {
        const invalidData = { ...validData, observacao: 'a'.repeat(1001) };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Observação deve ter no máximo 1000 caracteres');
        }
      });

      it('deve aceitar observação no limite máximo', () => {
        const testData = { ...validData, observacao: 'a'.repeat(1000) };
        const result = requerimentoFormSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });
    });

    describe('Validação de horas', () => {
      it('deve rejeitar horas negativas', () => {
        const invalidData = { ...validData, horas_funcional: -1 };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Horas não podem ser negativas');
        }
      });

      it('deve rejeitar horas muito altas', () => {
        const invalidData = { ...validData, horas_funcional: 10000 };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Horas não podem exceder 9999.99');
        }
      });

      it('deve aceitar horas zero', () => {
        const testData = { ...validData, horas_funcional: 0, horas_tecnico: 10 };
        const result = requerimentoFormSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });

      it('deve aceitar horas decimais', () => {
        const testData = { ...validData, horas_funcional: 10.75, horas_tecnico: 5.25 };
        const result = requerimentoFormSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });

      it('deve aceitar horas no limite máximo', () => {
        const testData = { ...validData, horas_funcional: 9999.99 };
        const result = requerimentoFormSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });
    });

    describe('Validação de mês de cobrança', () => {
      it('deve aceitar mês de cobrança vazio (opcional)', () => {
        const testData = { ...validData, mes_cobranca: '' };
        const result = requerimentoFormSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });

      it('deve aceitar mês de cobrança undefined (opcional)', () => {
        const testData = { ...validData };
        delete testData.mes_cobranca;
        const result = requerimentoFormSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });

      it('deve rejeitar formato inválido quando preenchido', () => {
        const invalidData = { ...validData, mes_cobranca: '13/2024' };
        const result = requerimentoFormSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Formato deve ser MM/YYYY (ex: 09/2025)');
        }
      });

      it('deve aceitar meses válidos quando preenchido', () => {
        for (let mes = 1; mes <= 12; mes++) {
          const mesFormatado = mes.toString().padStart(2, '0');
          const testData = { ...validData, mes_cobranca: `${mesFormatado}/2024` };
          const result = requerimentoFormSchema.safeParse(testData);
          expect(result.success).toBe(true);
        }
      });
    });

    describe('Validação de datas', () => {
      it('deve rejeitar formato de data inválido', () => {
        const invalidData = { ...validData, data_envio: '15/01/2024' };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Data deve estar no formato YYYY-MM-DD');
        }
      });

      it('deve aceitar formato de data válido', () => {
        const testData = { ...validData, data_envio: '2024-01-15', data_aprovacao: '2024-01-16' };
        const result = requerimentoFormSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });

      it('deve rejeitar data de aprovação anterior à data de envio', () => {
        const invalidData = {
          ...validData,
          data_envio: '2024-01-16',
          data_aprovacao: '2024-01-15'
        };
        const result = requerimentoFormSchema.safeParse(invalidData);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Data de aprovação deve ser igual ou posterior à data de envio');
        }
      });

      it('deve aceitar data de aprovação igual à data de envio', () => {
        const testData = {
          ...validData,
          data_envio: '2024-01-15',
          data_aprovacao: '2024-01-15'
        };
        const result = requerimentoFormSchema.safeParse(testData);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('requerimentoFaturamentoSchema', () => {
    it('deve exigir mes_cobranca para faturamento', () => {
      const dataWithoutMes = { ...validData };
      delete dataWithoutMes.mes_cobranca;
      
      const result = requerimentoFaturamentoSchema.safeParse(dataWithoutMes);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Mês de cobrança é obrigatório');
      }
    });

    it('deve aceitar dados válidos com mes_cobranca para faturamento', () => {
      const result = requerimentoFaturamentoSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve exigir data_aprovacao para faturamento', () => {
      const dataWithoutAprovacao = { ...validData, data_aprovacao: '' };
      
      const result = requerimentoFaturamentoSchema.safeParse(dataWithoutAprovacao);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Data é obrigatória');
      }
    });

    it('deve rejeitar data_aprovacao undefined para faturamento', () => {
      const dataWithoutAprovacao = { ...validData };
      delete dataWithoutAprovacao.data_aprovacao;
      
      const result = requerimentoFaturamentoSchema.safeParse(dataWithoutAprovacao);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Required');
      }
    });

    it('deve rejeitar mes_cobranca vazio para faturamento', () => {
      const dataWithEmptyMes = { ...validData, mes_cobranca: '' };
      
      const result = requerimentoFaturamentoSchema.safeParse(dataWithEmptyMes);
      expect(result.success).toBe(false);
    });
  });

  describe('filtrosRequerimentosSchema', () => {
    it('deve validar filtros válidos', () => {
      const validFiltros = {
        busca: 'RF-123',
        modulo: 'Comply' as const,
        linguagem: 'Funcional' as const,
        status: 'lancado' as const,
        tipo_cobranca: 'Faturado' as const,
        mes_cobranca: '01/2024',
        cliente_id: '123e4567-e89b-12d3-a456-426614174000',
        data_inicio: '2024-01-01',
        data_fim: '2024-01-31'
      };

      const result = filtrosRequerimentosSchema.safeParse(validFiltros);
      expect(result.success).toBe(true);
    });

    it('deve validar filtros com arrays múltiplos', () => {
      const validFiltros = {
        modulo: ['Comply', 'Comex'] as const,
        linguagem: ['Funcional', 'ABAP'] as const,
        tipo_cobranca: ['Faturado', 'Banco de Horas'] as const
      };

      const result = filtrosRequerimentosSchema.safeParse(validFiltros);
      expect(result.success).toBe(true);
    });

    it('deve aceitar filtros vazios', () => {
      const result = filtrosRequerimentosSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('deve rejeitar data_fim anterior à data_inicio', () => {
      const invalidFiltros = {
        data_inicio: '2024-01-31',
        data_fim: '2024-01-01'
      };

      const result = filtrosRequerimentosSchema.safeParse(invalidFiltros);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Data fim deve ser igual ou posterior à data início');
      }
    });

    it('deve aceitar data_fim igual à data_inicio', () => {
      const validFiltros = {
        data_inicio: '2024-01-15',
        data_fim: '2024-01-15'
      };

      const result = filtrosRequerimentosSchema.safeParse(validFiltros);
      expect(result.success).toBe(true);
    });

    it('deve validar período de cobrança válido', () => {
      const validFiltros = {
        mes_cobranca: '10/2025'
      };

      const result = filtrosRequerimentosSchema.safeParse(validFiltros);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar período de cobrança inválido', () => {
      const invalidFiltros = {
        mes_cobranca: '13/2024' // Mês inválido
      };

      const result = filtrosRequerimentosSchema.safeParse(invalidFiltros);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Formato deve ser MM/YYYY (ex: 09/2025)');
      }
    });

    it('deve validar busca por texto', () => {
      const validFiltros = {
        busca: 'RF-123456'
      };

      const result = filtrosRequerimentosSchema.safeParse(validFiltros);
      expect(result.success).toBe(true);
    });
  });

  describe('emailFaturamentoSchema', () => {
    it('deve validar email de faturamento válido', () => {
      const validEmail = {
        destinatarios: ['teste@exemplo.com', 'outro@exemplo.com'],
        assunto: 'Relatório de Faturamento',
        corpo: 'Corpo do email com relatório de faturamento',
        anexos: []
      };

      const result = emailFaturamentoSchema.safeParse(validEmail);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar lista de destinatários vazia', () => {
      const invalidEmail = {
        destinatarios: [],
        assunto: 'Teste',
        corpo: 'Teste'
      };

      const result = emailFaturamentoSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Pelo menos um destinatário é obrigatório');
      }
    });

    it('deve rejeitar emails inválidos', () => {
      const invalidEmail = {
        destinatarios: ['email-invalido'],
        assunto: 'Teste',
        corpo: 'Teste'
      };

      const result = emailFaturamentoSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Email inválido');
      }
    });

    it('deve rejeitar muitos destinatários', () => {
      const invalidEmail = {
        destinatarios: Array(11).fill('teste@exemplo.com'),
        assunto: 'Teste',
        corpo: 'Teste'
      };

      const result = emailFaturamentoSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Máximo de 10 destinatários permitidos');
      }
    });

    it('deve rejeitar assunto muito longo', () => {
      const invalidEmail = {
        destinatarios: ['teste@exemplo.com'],
        assunto: 'a'.repeat(201),
        corpo: 'Teste'
      };

      const result = emailFaturamentoSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Assunto deve ter no máximo 200 caracteres');
      }
    });

    it('deve rejeitar corpo muito longo', () => {
      const invalidEmail = {
        destinatarios: ['teste@exemplo.com'],
        assunto: 'Teste',
        corpo: 'a'.repeat(5001)
      };

      const result = emailFaturamentoSchema.safeParse(invalidEmail);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Corpo do email deve ter no máximo 5000 caracteres');
      }
    });
  });

  describe('buscaRequerimentosSchema', () => {
    it('deve validar busca válida', () => {
      const validBusca = {
        termo: 'RF-123',
        campos: ['chamado', 'descricao']
      };

      const result = buscaRequerimentosSchema.safeParse(validBusca);
      expect(result.success).toBe(true);
    });

    it('deve usar campos padrão quando não especificados', () => {
      const busca = {
        termo: 'RF-123'
      };

      const result = buscaRequerimentosSchema.safeParse(busca);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.campos).toEqual(['chamado', 'descricao']);
      }
    });

    it('deve rejeitar termo vazio', () => {
      const invalidBusca = {
        termo: ''
      };

      const result = buscaRequerimentosSchema.safeParse(invalidBusca);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Termo de busca é obrigatório');
      }
    });

    it('deve rejeitar termo muito longo', () => {
      const invalidBusca = {
        termo: 'a'.repeat(101)
      };

      const result = buscaRequerimentosSchema.safeParse(invalidBusca);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Termo de busca deve ter no máximo 100 caracteres');
      }
    });
  });

  describe('Validadores auxiliares', () => {
    describe('validarChamado', () => {
      it('deve validar chamados válidos', () => {
        expect(validarChamado('RF-123')).toBe(true);
        expect(validarChamado('ABC123')).toBe(true);
        expect(validarChamado('TEST-456-XYZ')).toBe(true);
      });

      it('deve rejeitar chamados inválidos', () => {
        expect(validarChamado('')).toBe(false);
        expect(validarChamado('RF@123')).toBe(false);
        expect(validarChamado('a'.repeat(51))).toBe(false);
      });
    });

    describe('validarEmail', () => {
      it('deve validar emails válidos', () => {
        expect(validarEmail('teste@exemplo.com')).toBe(true);
        expect(validarEmail('usuario.teste@dominio.com.br')).toBe(true);
      });

      it('deve rejeitar emails inválidos', () => {
        expect(validarEmail('email-invalido')).toBe(false);
        expect(validarEmail('@exemplo.com')).toBe(false);
        expect(validarEmail('teste@')).toBe(false);
      });
    });

    describe('validarHoras', () => {
      it('deve validar horas válidas', () => {
        expect(validarHoras(0)).toBe(true);
        expect(validarHoras(10.5)).toBe(true);
        expect(validarHoras(9999.99)).toBe(true);
      });

      it('deve rejeitar horas inválidas', () => {
        expect(validarHoras(-1)).toBe(false);
        expect(validarHoras(10000)).toBe(false);
      });
    });

    describe('validarMesCobranca', () => {
      it('deve validar meses válidos', () => {
        for (let mes = 1; mes <= 12; mes++) {
          expect(validarMesCobranca(mes)).toBe(true);
        }
      });

      it('deve rejeitar meses inválidos', () => {
        expect(validarMesCobranca(0)).toBe(false);
        expect(validarMesCobranca(13)).toBe(false);
        expect(validarMesCobranca(-1)).toBe(false);
      });
    });
  });
});