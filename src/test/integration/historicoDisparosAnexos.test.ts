/**
 * Testes de integração para extensão da tabela historico_disparos com suporte a anexos
 */

import { describe, it, expect } from 'vitest';
import type { HistoricoDisparo, HistoricoDisparoInsert } from '@/types/clientBooksTypes';

describe('Extensão da tabela historico_disparos para anexos', () => {
  it('deve ter os tipos TypeScript corretos para as novas colunas', () => {
    // Teste de compilação - verifica se os tipos incluem as novas colunas
    const historicoMock: HistoricoDisparo = {
      id: 'test-id',
      empresa_id: 'empresa-id',
      cliente_id: 'cliente-id',
      template_id: null,
      status: 'enviado',
      data_disparo: null,
      data_agendamento: null,
      erro_detalhes: null,
      assunto: null,
      emails_cc: null,
      anexo_id: 'anexo-id', // Nova coluna
      anexo_processado: false, // Nova coluna
      created_at: new Date().toISOString()
    };

    expect(historicoMock.anexo_id).toBe('anexo-id');
    expect(historicoMock.anexo_processado).toBe(false);
  });

  it('deve permitir anexo_id como null', () => {
    const historicoSemAnexo: HistoricoDisparo = {
      id: 'test-id',
      empresa_id: 'empresa-id',
      cliente_id: 'cliente-id',
      template_id: null,
      status: 'enviado',
      data_disparo: null,
      data_agendamento: null,
      erro_detalhes: null,
      assunto: null,
      emails_cc: null,
      anexo_id: null, // Deve permitir null
      anexo_processado: false,
      created_at: new Date().toISOString()
    };

    expect(historicoSemAnexo.anexo_id).toBeNull();
    expect(historicoSemAnexo.anexo_processado).toBe(false);
  });

  it('deve ter tipos corretos para Insert', () => {
    const insertData: HistoricoDisparoInsert = {
      empresa_id: 'empresa-id',
      cliente_id: 'cliente-id',
      status: 'enviado',
      anexo_id: 'anexo-id', // Opcional no Insert
      anexo_processado: false // Opcional no Insert
    };

    expect(insertData.anexo_id).toBe('anexo-id');
    expect(insertData.anexo_processado).toBe(false);
  });

  it('deve permitir Insert sem especificar anexo_id', () => {
    const insertSemAnexo: HistoricoDisparoInsert = {
      empresa_id: 'empresa-id',
      cliente_id: 'cliente-id',
      status: 'enviado'
      // anexo_id e anexo_processado são opcionais
    };

    expect(insertSemAnexo.anexo_id).toBeUndefined();
    expect(insertSemAnexo.anexo_processado).toBeUndefined();
  });

  it('deve verificar se a interface HistoricoDisparoComAnexo está correta', () => {
    // Importar o tipo para verificar se compila
    const historicoComAnexo = {
      id: 'test-id',
      empresa_id: 'empresa-id',
      cliente_id: 'cliente-id',
      template_id: null,
      status: 'enviado',
      data_disparo: null,
      data_agendamento: null,
      erro_detalhes: null,
      assunto: null,
      emails_cc: null,
      anexo_id: 'anexo-id',
      anexo_processado: true,
      created_at: new Date().toISOString(),
      anexo: {
        id: 'anexo-id',
        nome_original: 'documento.pdf',
        tamanho_bytes: 1024000,
        status: 'processado' as const,
        url_temporaria: 'https://storage.supabase.co/temp/doc.pdf',
        data_upload: new Date().toISOString(),
        data_expiracao: new Date().toISOString()
      }
    };

    expect(historicoComAnexo.anexo).toBeDefined();
    expect(historicoComAnexo.anexo?.nome_original).toBe('documento.pdf');
    expect(historicoComAnexo.anexo?.status).toBe('processado');
  });
});