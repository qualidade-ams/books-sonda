/**
 * Lógica da Edge Function consulta-empresas, sem dependência de Deno,
 * para ser testada no Vitest (ver __tests__/logica.test.ts).
 *
 * Leitura para sistemas externos: devolve só nome_completo, nome_abreviado
 * e status da tabela empresas. O acesso é por chave própria no header
 * x-api-key, comparada com o secret EMPRESAS_LEITURA_API_KEY.
 */

export interface EmpresaLeitura {
  nome_completo: string;
  nome_abreviado: string;
  status: string;
}

export interface FiltroEmpresas {
  status?: 'ativo' | 'inativo';
}

export interface Dependencias {
  chaveEsperada: string;
  buscarEmpresas: (filtro: FiltroEmpresas) => Promise<EmpresaLeitura[]>;
}

const STATUS_VALIDOS = ['ativo', 'inativo'] as const;

/** Compara as chaves em tempo constante para o tamanho dado. */
export function chavesIguais(recebida: string, esperada: string): boolean {
  if (!recebida || !esperada) return false;
  const a = new TextEncoder().encode(recebida);
  const b = new TextEncoder().encode(esperada);
  let diferenca = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) {
    diferenca |= (a[i] ?? 0) ^ b[i];
  }
  return diferenca === 0;
}

function json(status: number, corpo: unknown, extras: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extras,
    },
  });
}

export async function tratarRequisicao(req: Request, deps: Dependencias): Promise<Response> {
  if (req.method !== 'GET') {
    return json(405, { error: 'Método não permitido' }, { Allow: 'GET' });
  }

  if (!deps.chaveEsperada) {
    console.error('consulta-empresas: secret EMPRESAS_LEITURA_API_KEY não configurado');
    return json(500, { error: 'Serviço não configurado' });
  }

  if (!chavesIguais(req.headers.get('x-api-key') ?? '', deps.chaveEsperada)) {
    return json(401, { error: 'Chave de acesso inválida' });
  }

  const filtro: FiltroEmpresas = {};
  const status = new URL(req.url).searchParams.get('status');
  if (status !== null) {
    if (!(STATUS_VALIDOS as readonly string[]).includes(status)) {
      return json(400, { error: 'Parâmetro status deve ser ativo ou inativo' });
    }
    filtro.status = status as FiltroEmpresas['status'];
  }

  try {
    const empresas = await deps.buscarEmpresas(filtro);
    const data: EmpresaLeitura[] = empresas.map((e) => ({
      nome_completo: e.nome_completo,
      nome_abreviado: e.nome_abreviado,
      status: e.status,
    }));
    return json(200, { data });
  } catch (error) {
    console.error(
      'consulta-empresas: falha na consulta:',
      error instanceof Error ? error.message : 'erro desconhecido'
    );
    return json(500, { error: 'Erro interno ao consultar empresas' });
  }
}
