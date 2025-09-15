// Testes para verificar se os tipos do sistema de clientes e books estão corretos

import { describe, it, expect } from 'vitest';
import {
  type EmpresaCliente,
  type EmpresaClienteInsert,
  type Colaborador,
  type ColaboradorInsert,
  type GrupoResponsavel,
  type EmpresaFormData,
  type ColaboradorFormData,
  EMPRESA_STATUS,
  COLABORADOR_STATUS,
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
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    expect(empresa.nome_completo).toBe('Empresa Teste Ltda');
    expect(empresa.status).toBe('ativo');
  });

  it('deve ter os tipos de inserção definidos corretamente', () => {
    const empresaInsert: EmpresaClienteInsert = {
      nome_completo: 'Nova Empresa',
      nome_abreviado: 'Nova',
      template_padrao: 'portugues',
      status: 'ativo'
    };

    expect(empresaInsert.nome_completo).toBe('Nova Empresa');
  });

  it('deve ter as constantes definidas corretamente', () => {
    expect(EMPRESA_STATUS.ATIVO).toBe('ativo');
    expect(EMPRESA_STATUS.INATIVO).toBe('inativo');
    expect(EMPRESA_STATUS.SUSPENSO).toBe('suspenso');

    expect(COLABORADOR_STATUS.ATIVO).toBe('ativo');
    expect(COLABORADOR_STATUS.INATIVO).toBe('inativo');

    expect(PRODUTOS.CE_PLUS).toBe('CE_PLUS');
    expect(PRODUTOS.FISCAL).toBe('FISCAL');
    expect(PRODUTOS.GALLERY).toBe('GALLERY');

    expect(TEMPLATE_PADRAO.PORTUGUES).toBe('portugues');
    expect(TEMPLATE_PADRAO.INGLES).toBe('ingles');
  });

  it('deve ter os tipos de formulário definidos corretamente', () => {
    const empresaForm: EmpresaFormData = {
      nomeCompleto: 'Empresa Form',
      nomeAbreviado: 'Form',
      templatePadrao: 'PORTUGUES',
      status: 'ATIVO',
      produtos: ['CE_PLUS', 'FISCAL'],
      grupos: ['grupo-1', 'grupo-2']
    };

    expect(empresaForm.produtos).toContain('CE_PLUS');
    expect(empresaForm.grupos).toHaveLength(2);
  });

  it('deve ter o tipo Colaborador definido corretamente', () => {
    const colaborador: Colaborador = {
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

    expect(colaborador.email).toBe('joao@empresa.com');
    expect(colaborador.principal_contato).toBe(true);
  });

  it('deve ter o tipo ColaboradorFormData definido corretamente', () => {
    const colaboradorForm: ColaboradorFormData = {
      nomeCompleto: 'Maria Santos',
      email: 'maria@empresa.com',
      empresaId: 'empresa-id',
      status: 'ATIVO',
      principalContato: false
    };

    expect(colaboradorForm.nomeCompleto).toBe('Maria Santos');
    expect(colaboradorForm.principalContato).toBe(false);
  });

  it('deve ter o tipo GrupoResponsavel definido corretamente', () => {
    const grupo: GrupoResponsavel = {
      id: 'grupo-id',
      nome: 'CE Plus',
      descricao: 'Grupo responsável pelo CE Plus',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    expect(grupo.nome).toBe('CE Plus');
    expect(grupo.descricao).toBe('Grupo responsável pelo CE Plus');
  });
});