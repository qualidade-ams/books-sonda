/**
 * Serviço da tela "Consultores x Coordenadores".
 *
 * - Vínculo consultor → coordenador: CRUD em especialistas_coordenadores, protegido por RLS.
 * - O organograma só é legível com a tela "organograma"; por isso os responsáveis e os
 *   emails dos coordenadores vêm de funções SECURITY DEFINER liberadas por tela.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ConsultorCoordenador,
  EspecialistaParaEmail,
  ResponsavelOrganograma,
} from '@/types/consultoresCoordenadores';

// Tabela e funções novas ainda não estão no types.ts gerado
const db = supabase as any;

const TABELA_VINCULOS = 'especialistas_coordenadores';

type VinculoBruto = { coordenador_id: string } | { coordenador_id: string }[] | null;

// Com especialista_id como chave primária o PostgREST devolve objeto; tolera array por segurança
const coordenadorDoVinculo = (vinculo: VinculoBruto): string | null => {
  const registro = Array.isArray(vinculo) ? vinculo[0] : vinculo;
  return registro?.coordenador_id ?? null;
};

class ConsultoresCoordenadoresService {
  async listarConsultores(): Promise<ConsultorCoordenador[]> {
    const { data, error } = await db
      .from('especialistas')
      .select(`id, nome, email, status, ${TABELA_VINCULOS}(coordenador_id)`)
      .order('nome', { ascending: true });

    if (error) throw new Error(`Falha ao listar consultores: ${error.message}`);
    return (data || []).map((e: any) => ({
      especialistaId: e.id,
      nome: e.nome,
      email: e.email,
      status: e.status,
      coordenadorId: coordenadorDoVinculo(e[TABELA_VINCULOS]),
    }));
  }

  async listarResponsaveis(): Promise<ResponsavelOrganograma[]> {
    const { data, error } = await db.rpc('listar_responsaveis_organograma');
    if (error) throw new Error(`Falha ao listar coordenadores do organograma: ${error.message}`);
    return data || [];
  }

  /** Vincula o consultor ao coordenador; com null, remove o vínculo */
  async definirCoordenador(especialistaId: string, coordenadorId: string | null): Promise<void> {
    const consulta = coordenadorId
      ? db
          .from(TABELA_VINCULOS)
          .upsert(
            { especialista_id: especialistaId, coordenador_id: coordenadorId },
            { onConflict: 'especialista_id' }
          )
      : db.from(TABELA_VINCULOS).delete().eq('especialista_id', especialistaId);

    const { error } = await consulta;
    if (error) throw new Error(`Falha ao salvar coordenador do consultor: ${error.message}`);
  }

  async listarEspecialistasParaEmail(): Promise<EspecialistaParaEmail[]> {
    const { data, error } = await db.rpc('listar_especialistas_para_email');
    if (error) throw new Error(`Falha ao buscar emails de consultores: ${error.message}`);
    return data || [];
  }
}

export const consultoresCoordenadoresService = new ConsultoresCoordenadoresService();
