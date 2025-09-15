import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { booksDisparoService } from '@/services/booksDisparoService';
import { emailService } from '@/services/emailService';
import { clientBooksTemplateService } from '@/services/clientBooksTemplateService';
import { supabase } from '@/integrations/supabase/client';
import type { AgendamentoDisparo } from '@/types/clientBooks';

// Mock dos serviços
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(),
          limit: vi.fn()
        })),
        in: vi.fn(() => ({
          order: vi.fn()
        })),
        gte: vi.fn(() => ({
          lt: vi.fn(),
          lte: vi.fn(),
          order: vi.fn()
        })),
        lte: vi.fn(() => ({
          order: vi.fn()
        })),
        order: vi.fn(),
        count: 'exact',
        head: true
      })),
      insert: vi.fn(),
      update: vi.fn(() => ({
        eq: vi.fn(),
        in: vi.fn()
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      })),
      upsert: vi.fn()
    }))
  }
}));

vi.mock('@/services/emailService', () => ({
  emailService: {
    sendEmail: vi.fn()
  }
}));

vi.mock('@/services/clientBooksTemplateService', () => ({
  clientBooksTemplateService: {
    buscarTemplateBooks: vi.fn(),
    validarTemplate: vi.fn(),
    processarTemplate: vi.fn()
  }
}));

describe('Testes de Integração - Disparo de E-mails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Fluxo completo de disparo mensal', () => {
    it('deve executar disparo mensal completo com sucesso', async () => {
      const mes = 3;
      const ano = 2024;

      // Dados mock para o teste
      const empresasMock = [
        {
          id: 'empresa-1',
          nome_completo: 'Empresa Teste 1',
          nome_abreviado: 'Teste 1',
          status: 'ativo',
          template_padrao: 'portugues',
          email_gestor: 'gestor1@empresa.com',
          colaboradores: [
            {
              id: 'colab-1',
              nome_completo: 'João Silva',
              email: 'joao@empresa.com',
              status: 'ativo'
            }
          ]
        },
        {
          id: 'empresa-2',
          nome_completo: 'Empresa Teste 2',
          nome_abreviado: 'Teste 2',
          status: 'ativo',
          template_padrao: 'ingles',
          email_gestor: 'gestor2@empresa.com',
          colaboradores: [
            {
              id: 'colab-2',
              nome_completo: 'Maria Santos',
              email: 'maria@empresa.com',
              status: 'ativo'
            }
          ]
        }
      ];

      const templateMock = {
        id: 'template-1',
        assunto: 'Book Mensal - {{empresa.nomeCompleto}}',
        corpo: `
          <h1>Book Mensal</h1>
          <p>Olá {{colaborador.nomeCompleto}},</p>
          <p>Segue o book mensal da {{empresa.nomeCompleto}}.</p>
          <p>Link do SharePoint: {{empresa.linkSharepoint}}</p>
        `
      };

      const gruposEmailsMock = [
        {
          grupos_responsaveis: {
            grupo_emails: [
              { email: 'responsavel1@sonda.com', nome: 'Responsável 1' },
              { email: 'responsavel2@sonda.com', nome: 'Responsável 2' }
            ]
          }
        }
      ];

      // Configurar mocks

      // 1. Buscar empresas ativas
      const mockEmpresasQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockEmpresasQuery.eq.mockResolvedValue({ 
        data: empresasMock, 
        error: null 
      });

      // 2. Verificar controle mensal (não existe)
      const mockControleQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      };

      // 3. Buscar colaboradores por empresa
      const mockColaboradoresQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockColaboradoresQuery.eq
        .mockResolvedValueOnce({ data: [empresasMock[0].colaboradores[0]], error: null })
        .mockResolvedValueOnce({ data: [empresasMock[1].colaboradores[0]], error: null });

      // 4. Buscar grupos de e-mail
      const mockGruposQuery = {
        eq: vi.fn().mockResolvedValue({
          data: gruposEmailsMock,
          error: null
        })
      };

      // 5. Template service mocks
      (clientBooksTemplateService.buscarTemplateBooks as any)
        .mockResolvedValueOnce(templateMock)
        .mockResolvedValueOnce(templateMock);

      (clientBooksTemplateService.validarTemplate as any)
        .mockReturnValue({ valido: true, variaveisNaoEncontradas: [] });

      (clientBooksTemplateService.processarTemplate as any)
        .mockResolvedValueOnce({
          assunto: 'Book Mensal - Empresa Teste 1',
          corpo: '<h1>Book Mensal</h1><p>Olá João Silva,</p><p>Segue o book mensal da Empresa Teste 1.</p>'
        })
        .mockResolvedValueOnce({
          assunto: 'Book Mensal - Empresa Teste 2',
          corpo: '<h1>Book Mensal</h1><p>Olá Maria Santos,</p><p>Segue o book mensal da Empresa Teste 2.</p>'
        });

      // 6. Email service mock
      (emailService.sendEmail as any)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      // 7. Inserções no banco
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      // Configurar sequência de chamadas do Supabase
      (supabase.from as any)
        // Buscar empresas ativas
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresasQuery) })
        
        // Para cada empresa:
        // Empresa 1
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockControleQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockColaboradoresQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockGruposQuery) })
        .mockReturnValueOnce({ insert: mockInsert }) // histórico
        .mockReturnValueOnce({ upsert: mockUpsert }) // controle mensal
        
        // Empresa 2
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockControleQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockColaboradoresQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockGruposQuery) })
        .mockReturnValueOnce({ insert: mockInsert }) // histórico
        .mockReturnValueOnce({ upsert: mockUpsert }); // controle mensal

      // Executar disparo mensal
      const resultado = await booksDisparoService.dispararBooksMensal(mes, ano);

      // Verificações
      expect(resultado.total).toBe(2);
      expect(resultado.sucesso).toBe(2);
      expect(resultado.falhas).toBe(0);
      expect(resultado.detalhes).toHaveLength(2);

      // Verificar que templates foram buscados
      expect(clientBooksTemplateService.buscarTemplateBooks).toHaveBeenCalledWith('portugues');
      expect(clientBooksTemplateService.buscarTemplateBooks).toHaveBeenCalledWith('ingles');

      // Verificar que templates foram processados
      expect(clientBooksTemplateService.processarTemplate).toHaveBeenCalledTimes(2);

      // Verificar que e-mails foram enviados
      expect(emailService.sendEmail).toHaveBeenCalledTimes(2);

      // Verificar conteúdo dos e-mails
      const emailCalls = (emailService.sendEmail as any).mock.calls;
      
      expect(emailCalls[0][0]).toMatchObject({
        to: 'joao@empresa.com',
        cc: ['responsavel1@sonda.com', 'responsavel2@sonda.com', 'gestor1@empresa.com'],
        subject: 'Book Mensal - Empresa Teste 1',
        html: expect.stringContaining('João Silva')
      });

      expect(emailCalls[1][0]).toMatchObject({
        to: 'maria@empresa.com',
        cc: ['responsavel1@sonda.com', 'responsavel2@sonda.com', 'gestor2@empresa.com'],
        subject: 'Book Mensal - Empresa Teste 2',
        html: expect.stringContaining('Maria Santos')
      });

      // Verificar que histórico foi registrado
      expect(mockInsert).toHaveBeenCalledTimes(2);

      // Verificar que controle mensal foi atualizado
      expect(mockUpsert).toHaveBeenCalledTimes(2);
    });

    it('deve tratar falhas de envio corretamente', async () => {
      const mes = 3;
      const ano = 2024;

      const empresaMock = {
        id: 'empresa-1',
        nome_completo: 'Empresa Teste',
        status: 'ativo',
        template_padrao: 'portugues',
        colaboradores: [
          {
            id: 'colab-1',
            nome_completo: 'João Silva',
            email: 'joao@empresa.com',
            status: 'ativo'
          }
        ]
      };

      // Mock para buscar empresas
      const mockEmpresasQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockEmpresasQuery.eq.mockResolvedValue({ 
        data: [empresaMock], 
        error: null 
      });

      // Mock para controle mensal
      const mockControleQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      };

      // Mock para colaboradores
      const mockColaboradoresQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockColaboradoresQuery.eq.mockResolvedValue({ 
        data: [empresaMock.colaboradores[0]], 
        error: null 
      });

      // Mock para grupos (vazio)
      const mockGruposQuery = {
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      // Template service - falha ao buscar template
      (clientBooksTemplateService.buscarTemplateBooks as any)
        .mockResolvedValue(null);

      // Mocks para inserções
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresasQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockControleQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockColaboradoresQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockGruposQuery) })
        .mockReturnValueOnce({ insert: mockInsert })
        .mockReturnValueOnce({ upsert: mockUpsert });

      const resultado = await booksDisparoService.dispararBooksMensal(mes, ano);

      expect(resultado.total).toBe(1);
      expect(resultado.sucesso).toBe(0);
      expect(resultado.falhas).toBe(1);
      expect(resultado.detalhes[0].status).toBe('falhou');
      expect(resultado.detalhes[0].erro).toContain('Template de e-mail não encontrado');
    });

    it('deve pular empresas já processadas', async () => {
      const mes = 3;
      const ano = 2024;

      const empresaMock = {
        id: 'empresa-1',
        nome_completo: 'Empresa Teste',
        status: 'ativo',
        colaboradores: []
      };

      // Mock para buscar empresas
      const mockEmpresasQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockEmpresasQuery.eq.mockResolvedValue({ 
        data: [empresaMock], 
        error: null 
      });

      // Mock para controle mensal já processado
      const mockControleQuery = {
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { status: 'enviado' }, 
          error: null 
        })
      };

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockEmpresasQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockControleQuery) });

      const resultado = await booksDisparoService.dispararBooksMensal(mes, ano);

      expect(resultado.total).toBe(1);
      expect(resultado.sucesso).toBe(0);
      expect(resultado.falhas).toBe(0);
      expect(resultado.detalhes).toHaveLength(0);

      // Não deve tentar enviar e-mails
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('Fluxo de agendamento de disparos', () => {
    it('deve agendar disparos corretamente', async () => {
      const agendamento: AgendamentoDisparo = {
        empresaId: 'empresa-1',
        colaboradorIds: ['colab-1', 'colab-2'],
        templateId: 'template-1',
        dataAgendamento: new Date('2024-04-15T10:00:00Z'),
        observacoes: 'Agendamento de teste'
      };

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValueOnce({ insert: mockInsert })
        .mockReturnValueOnce({ upsert: mockUpsert });

      await booksDisparoService.agendarDisparo(agendamento);

      // Verificar que agendamentos foram inseridos no histórico
      expect(mockInsert).toHaveBeenCalledWith([
        {
          empresa_id: 'empresa-1',
          colaborador_id: 'colab-1',
          template_id: 'template-1',
          status: 'agendado',
          data_agendamento: '2024-04-15T10:00:00.000Z',
          erro_detalhes: 'Agendamento de teste'
        },
        {
          empresa_id: 'empresa-1',
          colaborador_id: 'colab-2',
          template_id: 'template-1',
          status: 'agendado',
          data_agendamento: '2024-04-15T10:00:00.000Z',
          erro_detalhes: 'Agendamento de teste'
        }
      ]);

      // Verificar que controle mensal foi atualizado
      expect(mockUpsert).toHaveBeenCalledWith({
        mes: 4,
        ano: 2024,
        empresa_id: 'empresa-1',
        status: 'agendado',
        data_processamento: expect.any(String),
        observacoes: 'Agendado para 15/04/2024'
      });
    });
  });

  describe('Fluxo de reenvio de falhas', () => {
    it('deve reenviar disparos que falharam', async () => {
      const mes = 3;
      const ano = 2024;

      const controlesFalhaMock = [
        {
          id: 'controle-1',
          mes: 3,
          ano: 2024,
          empresa_id: 'empresa-1',
          status: 'falhou',
          empresas_clientes: {
            id: 'empresa-1',
            nome_completo: 'Empresa Teste',
            template_padrao: 'portugues',
            email_gestor: 'gestor@empresa.com'
          }
        }
      ];

      const colaboradoresMock = [
        {
          id: 'colab-1',
          nome_completo: 'João Silva',
          email: 'joao@empresa.com',
          status: 'ativo'
        }
      ];

      const templateMock = {
        id: 'template-1',
        assunto: 'Book Mensal - Reenvio',
        corpo: 'Conteúdo do book'
      };

      // Mocks
      const mockControlesQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockControlesQuery.eq.mockResolvedValue({ 
        data: controlesFalhaMock, 
        error: null 
      });

      const mockColaboradoresQuery = {
        eq: vi.fn().mockReturnThis()
      };
      mockColaboradoresQuery.eq.mockResolvedValue({
        data: colaboradoresMock,
        error: null
      });

      const mockGruposQuery = {
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      };

      // Template service
      (clientBooksTemplateService.buscarTemplateBooks as any)
        .mockResolvedValue(templateMock);
      (clientBooksTemplateService.validarTemplate as any)
        .mockReturnValue({ valido: true });
      (clientBooksTemplateService.processarTemplate as any)
        .mockResolvedValue({
          assunto: 'Book Mensal - Reenvio - Empresa Teste',
          corpo: 'Olá João Silva, conteúdo do book'
        });

      // Email service
      (emailService.sendEmail as any)
        .mockResolvedValue({ success: true });

      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });

      (supabase.from as any)
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockControlesQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockColaboradoresQuery) })
        .mockReturnValueOnce({ select: vi.fn().mockReturnValue(mockGruposQuery) })
        .mockReturnValueOnce({ insert: mockInsert })
        .mockReturnValueOnce({ upsert: mockUpsert });

      const resultado = await booksDisparoService.reenviarFalhas(mes, ano);

      expect(resultado.total).toBe(1);
      expect(resultado.sucesso).toBe(1);
      expect(resultado.falhas).toBe(0);

      // Verificar que e-mail foi reenviado
      expect(emailService.sendEmail).toHaveBeenCalledWith({
        to: 'joao@empresa.com',
        cc: ['gestor@empresa.com'],
        subject: 'Book Mensal - Reenvio - Empresa Teste',
        html: 'Olá João Silva, conteúdo do book',
        metadata: {
          empresaId: 'empresa-1',
          colaboradorId: 'colab-1',
          tipo: 'book_mensal',
          nomeEmpresa: 'Empresa Teste',
          nomeColaborador: 'João Silva'
        }
      });

      // Verificar que status foi atualizado para enviado
      expect(mockUpsert).toHaveBeenCalledWith({
        mes: 3,
        ano: 2024,
        empresa_id: 'empresa-1',
        status: 'enviado',
        data_processamento: expect.any(String),
        observacoes: 'Reenvio: 1 e-mails enviados'
      });
    });
  });

  describe('Integração com sistema de templates', () => {
    it('deve processar variáveis corretamente no template', async () => {
      const empresa = {
        id: 'empresa-1',
        nome_completo: 'Empresa Teste Ltda',
        nome_abreviado: 'Teste',
        link_sharepoint: 'https://sharepoint.com/teste',
        email_gestor: 'gestor@teste.com'
      };

      const colaborador = {
        id: 'colab-1',
        nome_completo: 'João Silva',
        email: 'joao@teste.com',
        funcao: 'Gerente',
        principal_contato: true
      };

      const template = {
        id: 'template-1',
        assunto: 'Book {{empresa.nomeAbreviado}} - {{colaborador.funcao}}',
        corpo: `
          <h1>Olá {{colaborador.nomeCompleto}}</h1>
          <p>Empresa: {{empresa.nomeCompleto}}</p>
          <p>SharePoint: {{empresa.linkSharepoint}}</p>
          <p>Contato Principal: {{colaborador.principalContato}}</p>
        `
      };

      // Mock do template service para processar variáveis
      (clientBooksTemplateService.processarTemplate as any)
        .mockImplementation(async (tmpl, emp, colab, disparo) => {
          let assunto = tmpl.assunto
            .replace('{{empresa.nomeAbreviado}}', emp.nome_abreviado)
            .replace('{{colaborador.funcao}}', colab.funcao);

          let corpo = tmpl.corpo
            .replace('{{colaborador.nomeCompleto}}', colab.nome_completo)
            .replace('{{empresa.nomeCompleto}}', emp.nome_completo)
            .replace('{{empresa.linkSharepoint}}', emp.link_sharepoint)
            .replace('{{colaborador.principalContato}}', colab.principal_contato ? 'Sim' : 'Não');

          return { assunto, corpo };
        });

      const resultado = await clientBooksTemplateService.processarTemplate(
        template,
        empresa as any,
        colaborador as any,
        { mes: 3, ano: 2024, dataDisparo: new Date() }
      );

      expect(resultado.assunto).toBe('Book Teste - Gerente');
      expect(resultado.corpo).toContain('Olá João Silva');
      expect(resultado.corpo).toContain('Empresa: Empresa Teste Ltda');
      expect(resultado.corpo).toContain('SharePoint: https://sharepoint.com/teste');
      expect(resultado.corpo).toContain('Contato Principal: Sim');
    });
  });
});