import { describe, it, expect, vi } from 'vitest';
import {
  ASSUNTO_IC_INATIVOS,
  criarEnvioIcInativos,
  montarHtmlIcInativos,
} from '../envioIcInativosService';
import { criarSupabaseFake, tem, chamadasDe, type Chamada } from '../../__tests__/helpers/supabaseFake';

// 25/11/2026 11:00 em Brasília
const AGORA = new Date('2026-11-25T14:00:00Z');
const INICIO_DO_DIA = '2026-11-25T03:00:00.000Z';

const ativa = (nro: string, empresa: string | null, extra: any = {}) => ({
  id: `inc-${nro}`,
  nro_chamado: nro,
  empresa,
  data_abertura: '2026-11-20T13:30:00Z',
  tipo_chamado: nro.slice(0, 2),
  descricao_inconsistencia: 'Item de Configuração inativo: 999999 - X',
  ...extra,
});

interface Cenario {
  ativas?: any[];
  enviadosHoje?: string[];
  organizacoes?: { nome_organizacao: string; empresa_id: string }[];
  empresas?: { id: string; nome_abreviado: string; email_gestor: string | null; status: string }[];
  erroHistorico?: boolean;
}

const EMPRESAS_PADRAO = [
  { id: 'e1', nome_abreviado: 'ALFA', email_gestor: 'cs.alfa@sonda.com', status: 'ativo' },
  { id: 'e2', nome_abreviado: 'BETA', email_gestor: 'CS.Alfa@sonda.com', status: 'ativo' },
  { id: 'e3', nome_abreviado: 'GAMA', email_gestor: 'cs.gama@sonda.com', status: 'ativo' },
  { id: 'e4', nome_abreviado: 'DELTA', email_gestor: 'cs.inativa@sonda.com', status: 'inativo' },
  { id: 'e5', nome_abreviado: 'EPSILON', email_gestor: null, status: 'ativo' },
];

function criar(cenario: Cenario = {}) {
  const fake = criarSupabaseFake((tabela: string, chamadas: Chamada[]) => {
    const metodo = (m: string) => chamadas.some(([n]) => n === m);
    if (tabela === 'inconsistencias_chamados') {
      return { data: cenario.ativas ?? [ativa('IM 1', 'ORG ALFA')], error: null };
    }
    if (tabela === 'historico_inconsistencias_chamados' && metodo('insert')) {
      return cenario.erroHistorico
        ? { data: null, error: { message: 'falha ao gravar' } }
        : { data: null, error: null };
    }
    if (tabela === 'historico_inconsistencias_chamados') {
      return { data: (cenario.enviadosHoje ?? []).map((nro_chamado) => ({ nro_chamado })), error: null };
    }
    if (tabela === 'empresas_organizacoes_aranda') {
      return {
        data: cenario.organizacoes ?? [
          { nome_organizacao: 'ORG ALFA', empresa_id: 'e1' },
          { nome_organizacao: 'ORG GAMA', empresa_id: 'e3' },
        ],
        error: null,
      };
    }
    if (tabela === 'empresas_clientes') {
      return { data: cenario.empresas ?? EMPRESAS_PADRAO, error: null };
    }
    return { data: null, error: null };
  });
  const enviarEmail = vi.fn(async () => undefined);
  const envio = criarEnvioIcInativos({ supabase: fake.cliente, enviador: { enviarEmail }, agora: () => AGORA });
  const log = vi.fn();
  return { fake, envio, enviarEmail, log };
}

const registros = (fake: ReturnType<typeof criarSupabaseFake>) =>
  chamadasDe(fake.consultas, 'historico_inconsistencias_chamados', 'insert').flatMap((a) => a[0]);

describe('envioIcInativosService', () => {
  it('lê só as inconsistências ic_inativo ativas', async () => {
    const { fake, envio, log } = criar({ ativas: [] });

    const r = await envio.executar({ emailsCc: [], log });

    const consulta = fake.consultas.find((c) => c.tabela === 'inconsistencias_chamados')!;
    expect(tem(consulta.chamadas, 'eq', 'tipo_inconsistencia', 'ic_inativo')).toBe(true);
    expect(tem(consulta.chamadas, 'eq', 'status', 'ativa')).toBe(true);
    expect(r).toMatchObject({ pendentes: 0, novos: 0, enviado: false });
  });

  it('envia só os chamados que ainda não foram enviados hoje (dia de Brasília)', async () => {
    const { fake, envio, enviarEmail, log } = criar({
      ativas: [ativa('IM 1', 'ORG ALFA'), ativa('RF 2', 'ORG GAMA')],
      enviadosHoje: ['IM 1'],
    });

    const r = await envio.executar({ emailsCc: [], log });

    const consulta = fake.consultas.find(
      (c) => c.tabela === 'historico_inconsistencias_chamados' && !c.chamadas.some(([m]) => m === 'insert')
    )!;
    expect(tem(consulta.chamadas, 'eq', 'tipo_inconsistencia', 'ic_inativo')).toBe(true);
    expect(tem(consulta.chamadas, 'gte', 'data_envio', INICIO_DO_DIA)).toBe(true);
    expect(enviarEmail).toHaveBeenCalledTimes(1);
    const html = enviarEmail.mock.calls[0][0].mensagem;
    expect(html).toContain('RF 2');
    expect(html).not.toContain('IM 1');
    expect(r).toMatchObject({ pendentes: 2, novos: 1, enviado: true });
  });

  it('sem chamado novo desde o último envio do dia, não envia', async () => {
    const { enviarEmail, envio, log, fake } = criar({ enviadosHoje: ['IM 1'] });

    const r = await envio.executar({ emailsCc: [], log });

    expect(enviarEmail).not.toHaveBeenCalled();
    expect(registros(fake)).toEqual([]);
    expect(r).toMatchObject({ pendentes: 1, novos: 0, enviado: false });
  });

  it('vai para todos os Customer Success das empresas ativas, sem repetir, com o CC da rotina', async () => {
    const { envio, enviarEmail, log } = criar();

    await envio.executar({ emailsCc: ['aline.baboim@sonda.com'], log });

    expect(enviarEmail.mock.calls[0][0]).toMatchObject({
      nome: ASSUNTO_IC_INATIVOS,
      email: ['cs.alfa@sonda.com', 'cs.gama@sonda.com'],
      email_cc: ['aline.baboim@sonda.com'],
      email_bcc: [],
      anexos: { totalArquivos: 0, tamanhoTotal: 0, arquivos: [] },
    });
    expect(ASSUNTO_IC_INATIVOS).toBe('[AUDITORIA ARANDA] – IC Inativos');
  });

  it('a tabela traz o cliente e o CS pela organização; organização sem empresa mostra o nome dela', async () => {
    const { envio, enviarEmail, log } = criar({
      ativas: [ativa('IM 1', 'ORG ALFA'), ativa('IM 3', 'ORG SEM CADASTRO')],
    });

    await envio.executar({ emailsCc: [], log });

    const html: string = enviarEmail.mock.calls[0][0].mensagem;
    expect(html).toMatch(/ALFA[\s\S]*IM 1[\s\S]*20\/11\/2026[\s\S]*cs\.alfa@sonda\.com/);
    expect(html).toMatch(/ORG SEM CADASTRO[\s\S]*IM 3[\s\S]*—/);
  });

  it('registra cada chamado enviado no histórico, ligado à inconsistência', async () => {
    const { fake, envio, log } = criar();

    await envio.executar({ emailsCc: ['cc@sonda.com'], log });

    expect(registros(fake)).toEqual([
      expect.objectContaining({
        inconsistencia_id: 'inc-IM 1',
        origem: 'tickets',
        nro_chamado: 'IM 1',
        tipo_inconsistencia: 'ic_inativo',
        empresa: 'ORG ALFA',
        email_analista: 'cs.alfa@sonda.com; cs.gama@sonda.com',
        email_cc: 'cc@sonda.com',
        enviado_por: null,
        enviado_por_nome: 'Rotina automática',
        mes_referencia: 11,
        ano_referencia: 2026,
        data_envio: AGORA.toISOString(),
      }),
    ]);
  });

  it('sem nenhum Customer Success cadastrado, falha sem enviar', async () => {
    const { envio, enviarEmail, log } = criar({
      empresas: [{ id: 'e1', nome_abreviado: 'ALFA', email_gestor: null, status: 'ativo' }],
    });

    await expect(envio.executar({ emailsCc: [], log })).rejects.toThrow(/Customer Success/);
    expect(enviarEmail).not.toHaveBeenCalled();
  });

  it('e-mail enviado mas histórico não gravado vira erro (o chamado sairia de novo)', async () => {
    const { envio, enviarEmail, log } = criar({ erroHistorico: true });

    await expect(envio.executar({ emailsCc: [], log })).rejects.toThrow(/histórico/);
    expect(enviarEmail).toHaveBeenCalledTimes(1);
  });
});

describe('montarHtmlIcInativos', () => {
  const html = montarHtmlIcInativos([
    { cliente: 'A & <B>', nroChamado: 'IM 9', dataAbertura: '2026-11-20T02:00:00Z', customerSuccess: null },
  ]);

  it('tem o texto padrão e a ação com as duas orientações', () => {
    expect(html).toContain('Prezados(as) Customer Success,');
    expect(html).toContain('O SONDA LYZE identificou os chamados abaixo na fila de IC INATIVOS aguardando avaliação.');
    expect(html).toContain('Solicitamos a regularização conforme a orientação indicada em cada item, o mais breve possível.');
    expect(html).toContain('Após a conclusão, confirme a realização dos ajustes.');
    expect(html).toContain('IC prorrogado:');
    expect(html).toContain('APPLICATION ADMINISTRATOR');
    expect(html).toContain('IC não prorrogado:');
    expect(html).toContain('comunique o cliente sobre a inexistência de contrato ativo');
  });

  it('colunas Cliente, Nº do chamado, Data de Abertura e Customer Success', () => {
    expect(html).toMatch(/Cliente[\s\S]*Nº do chamado[\s\S]*Data de Abertura[\s\S]*Customer Success/);
  });

  it('data no fuso de Brasília e texto escapado', () => {
    // 20/11 02:00 UTC = 19/11 23:00 em Brasília
    expect(html).toContain('19/11/2026');
    expect(html).toContain('A &amp; &lt;B&gt;');
    expect(html).not.toContain('<B>');
  });
});
