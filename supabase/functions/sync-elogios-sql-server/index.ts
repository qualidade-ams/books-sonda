/**
 * Edge Function para sincronização de pesquisas do SQL Server
 * Conecta ao banco Aranda e sincroniza dados da tabela AMSpesquisa
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuração do SQL Server — credenciais vêm de secrets, nunca do código.
// Definir com: supabase secrets set SQL_SERVER=... SQL_DATABASE=... SQL_USER=... SQL_PASSWORD=...
const requireSecret = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(
      `Secret obrigatório ausente: ${name}. Configure com "supabase secrets set ${name}=..." antes de invocar esta função.`
    );
  }
  return value;
};

const SQL_CONFIG = {
  server: requireSecret('SQL_SERVER'),
  database: requireSecret('SQL_DATABASE'),
  user: requireSecret('SQL_USER'),
  password: requireSecret('SQL_PASSWORD'),
  table: Deno.env.get('SQL_TABLE') ?? 'AMSpesquisa'
};

interface DadosSqlServer {
  empresa: string;
  Categoria: string;
  Grupo: string;
  Cliente: string;
  Email_Cliente: string;
  Prestador: string;
  Nro_caso: string;
  Tipo_Caso: string;
  Ano_Abertura: number;
  Mes_abertura: number;
  Data_Resposta: Date;
  Resposta: string;
  Comentario_Pesquisa: string;
}

serve(async (req) => {
  try {
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Iniciando sincronização de pesquisas do SQL Server...');

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // NOTA: Deno não suporta nativamente conexão com SQL Server
    // Precisamos usar uma abordagem alternativa via API REST ou ODBC
    
    // Opção 1: Usar API REST do SQL Server (se disponível)
    // Opção 2: Usar serviço intermediário Node.js
    // Opção 3: Usar Azure Data Studio REST API
    
    // Por enquanto, retornar estrutura preparada
    const resultado = {
      sucesso: true,
      mensagem: 'Sincronização preparada. Implementar conexão SQL Server.',
      total_processados: 0,
      novos: 0,
      atualizados: 0,
      erros: 0,
      config: {
        server: SQL_CONFIG.server,
        database: SQL_CONFIG.database,
        table: SQL_CONFIG.table
      }
    };

    console.log('Resultado:', resultado);

    return new Response(
      JSON.stringify(resultado),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );

  } catch (error) {
    console.error('Erro na sincronização:', error);
    
    return new Response(
      JSON.stringify({ 
        sucesso: false,
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        } 
      }
    );
  }
});
