// Testes para verificar se os tipos do sistema de clientes e books estão corretos

import { describe, it, expect } from 'vitest';
import {
  type EmpresaCliente,
  type EmpresaClienteInsert,
  type Cliente,
  type ClienteInsert,
  type GrupoResponsavel,
  type EmpresaFormData,
  type ClienteFormData,
  EMPRESA_STATUS,
  Cliente_STATUS,
  PRODUTOS,
  TEMPLATE_PADRAO
} from '@/types/clientBooksTypes';

describe('Client Books Types', () => {
  it('deve ter os tipos básicos definidos corretamente', () => {
    // Teste de tipo EmpresaCliente
    const empresa: EmpresaCliente = {
      id: 'test-id',
      nome_completo: 'Empresa Teste Ltda',
      nome_abreviado: 'Empresa Teste',
      link_sharepoint: null,
      template_padrao: 'portugues',
      status: 'ativo',
      data_status: '2024-01-01T00:00:00Z',
      descricao_status: null,
      email_gestor: null,
      tem_ams: true,
      tipo_book: 'qualidade',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    expect(empresa.nome_completo).toBe('Empresa Teste Ltda');
    expect(empresa.status).toBe('ativo');
    expect(empresa.tem_ams).toBe(true);
    expect(empresa.tipo_book).toBe('qualidade');
  });

  it('deve ter os tipos de inserção definidos corretamente', () => {
    const empresaInsert: EmpresaClienteInsert = {
      nome_completo: 'Nova Empresa',
      nome_abreviado: 'Nova',
      template_padrao: 'portugues',
      status: 'ativo',
      tem_ams: false,
      tipo_book: 'nao_tem_book'
    };

    expect(empresaInsert.nome_completo).toBe('Nova Empresa');
    expect(empresaInsert.tem_ams).toBe(false);
    expect(empresaInsert.tipo_book).toBe('nao_tem_book');
  });

  it('deve ter as constantes definidas corretamente', () => {
    expect(EMPRESA_STATUS.ATIVO).toBe('ativo');
    expect(EMPRESA_STATUS.INATIVO).toBe('inativo');
    expect(EMPRESA_STATUS.SUSPENSO).toBe('suspenso');

    expect(Cliente_STATUS.ATIVO).toBe('ativo');
    expect(Cliente_STATUS.INATIVO).toBe('inativo');

    expect(PRODUTOS.COMEX).toBe('COMEX');
    expect(PRODUTOS.FISCAL).toBe('FISCAL');
    expect(PRODUTOS.GALLERY).toBe('GALLERY');

    expect(TEMPLATE_PADRAO.PORTUGUES).toBe('portugues');
    expect(TEMPLATE_PADRAO.INGLES).toBe('ingles');
  });

  it('deve ter os tipos de formulário definidos corretamente', () => {
    const empresaForm: EmpresaFormData = {
      nomeCompleto: 'Empresa Form',
      nomeAbreviado: 'Form',
      templatePadrao: 'portugues',
      status: 'ativo',
      produtos: ['COMEX', 'FISCAL'],
      grupos: ['grupo-1', 'grupo-2']
    };

    expect(empresaForm.produtos).toContain('COMEX');
    expect(empresaForm.grupos).toHaveLength(2);
  });

  it('deve ter o tipo Cliente definido corretamente', () => {
    const cliente: Cliente = {
      id: 'colab-id',
      nome_completo: 'João Silva',
      email: 'joao@empresa.com',
      funcao: 'Gerente',
      empresa_id: 'empresa-id',
      status: 'ativo',
      data_status: '2024-01-01T00:00:00Z',
      descricao_status: null,
      principal_contato: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    expect(cliente.email).toBe('joao@empresa.com');
    expect(cliente.principal_contato).toBe(true);
  });

  it('deve ter o tipo ClienteFormData definido corretamente', () => {
    const clienteForm: ClienteFormData = {
      nomeCompleto: 'Maria Santos',
      email: 'maria@empresa.com',
      empresaId: 'empresa-id',
      status: 'ativo',
      principalContato: false
    };

    expect(clienteForm.nomeCompleto).toBe('Maria Santos');
    expect(clienteForm.principalContato).toBe(false);
  });

  it('deve ter o tipo GrupoResponsavel definido corretamente', () => {
    const grupo: GrupoResponsavel = {
      id: 'grupo-id',
      nome: 'Comex',
      descricao: 'Grupo responsável pelo Comex',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    expect(grupo.nome).toBe('Comex');
    expect(grupo.descricao).toBe('Grupo responsável pelo Comex');
  });
});