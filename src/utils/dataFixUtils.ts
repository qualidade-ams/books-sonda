import { supabase } from '@/integrations/supabase/client';

/**
 * Utilitário para corrigir dados existentes no banco de dados
 */
export class DataFixUtils {
  /**
   * Normaliza produtos existentes para uppercase
   */
  static async normalizeProdutos(): Promise<{ success: boolean; updated: number; errors: string[] }> {
    const result = { success: false, updated: 0, errors: [] as string[] };
    
    try {
      // Buscar todos os produtos que não estão em uppercase
      const { data: produtos, error: selectError } = await supabase
        .from('empresa_produtos')
        .select('id, produto');

      if (selectError) {
        result.errors.push(`Erro ao buscar produtos: ${selectError.message}`);
        return result;
      }

      if (!produtos || produtos.length === 0) {
        result.success = true;
        return result;
      }

      // Filtrar produtos que não estão em uppercase
      const produtosParaAtualizar = produtos.filter(p => p.produto !== p.produto.toUpperCase());

      if (produtosParaAtualizar.length === 0) {
        result.success = true;
        return result;
      }

      // Atualizar cada produto para uppercase
      for (const produto of produtosParaAtualizar) {
        const { error: updateError } = await supabase
          .from('empresa_produtos')
          .update({ produto: produto.produto.toUpperCase() })
          .eq('id', produto.id);

        if (updateError) {
          result.errors.push(`Erro ao atualizar produto ${produto.id}: ${updateError.message}`);
        } else {
          result.updated++;
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return result;
    }
  }

  /**
   * Normaliza emails existentes para lowercase
   */
  static async normalizeEmails(): Promise<{ success: boolean; updated: number; errors: string[] }> {
    const result = { success: false, updated: 0, errors: [] as string[] };
    
    try {
      // Normalizar emails de colaboradores
      const { data: colaboradores, error: selectColabError } = await supabase
        .from('colaboradores')
        .select('id, email');

      if (selectColabError) {
        result.errors.push(`Erro ao buscar colaboradores: ${selectColabError.message}`);
      } else if (colaboradores && colaboradores.length > 0) {
        const colaboradoresParaAtualizar = colaboradores.filter(c => c.email !== c.email.toLowerCase());
        
        for (const colab of colaboradoresParaAtualizar) {
          const { error: updateError } = await supabase
            .from('colaboradores')
            .update({ email: colab.email.toLowerCase() })
            .eq('id', colab.id);

          if (updateError) {
            result.errors.push(`Erro ao atualizar colaborador ${colab.id}: ${updateError.message}`);
          } else {
            result.updated++;
          }
        }
      }

      // Normalizar emails de gestores de empresa
      const { data: empresas, error: selectEmpresaError } = await supabase
        .from('empresas_clientes')
        .select('id, email_gestor')
        .not('email_gestor', 'is', null);

      if (selectEmpresaError) {
        result.errors.push(`Erro ao buscar empresas: ${selectEmpresaError.message}`);
      } else if (empresas && empresas.length > 0) {
        const empresasParaAtualizar = empresas.filter(e => 
          e.email_gestor && e.email_gestor !== e.email_gestor.toLowerCase()
        );
        
        for (const empresa of empresasParaAtualizar) {
          const { error: updateError } = await supabase
            .from('empresas_clientes')
            .update({ email_gestor: empresa.email_gestor?.toLowerCase() })
            .eq('id', empresa.id);

          if (updateError) {
            result.errors.push(`Erro ao atualizar empresa ${empresa.id}: ${updateError.message}`);
          } else {
            result.updated++;
          }
        }
      }

      // Normalizar emails de grupos
      const { data: grupoEmails, error: selectGrupoError } = await supabase
        .from('grupo_emails')
        .select('id, email');

      if (selectGrupoError) {
        result.errors.push(`Erro ao buscar grupo emails: ${selectGrupoError.message}`);
      } else if (grupoEmails && grupoEmails.length > 0) {
        const grupoEmailsParaAtualizar = grupoEmails.filter(g => g.email !== g.email.toLowerCase());
        
        for (const grupoEmail of grupoEmailsParaAtualizar) {
          const { error: updateError } = await supabase
            .from('grupo_emails')
            .update({ email: grupoEmail.email.toLowerCase() })
            .eq('id', grupoEmail.id);

          if (updateError) {
            result.errors.push(`Erro ao atualizar grupo email ${grupoEmail.id}: ${updateError.message}`);
          } else {
            result.updated++;
          }
        }
      }

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return result;
    }
  }

  /**
   * Executa todas as normalizações
   */
  static async normalizeAllData(): Promise<{ 
    produtos: { success: boolean; updated: number; errors: string[] };
    emails: { success: boolean; updated: number; errors: string[] };
  }> {
    const produtos = await this.normalizeProdutos();
    const emails = await this.normalizeEmails();
    
    return { produtos, emails };
  }

  /**
   * Verifica se há dados que precisam ser normalizados
   */
  static async checkDataConsistency(): Promise<{
    produtosInconsistentes: number;
    emailsInconsistentes: number;
    detalhes: string[];
  }> {
    const detalhes: string[] = [];
    let produtosInconsistentes = 0;
    let emailsInconsistentes = 0;

    try {
      // Verificar produtos
      const { data: produtos, error: produtosError } = await supabase
        .from('empresa_produtos')
        .select('produto');

      if (produtosError) {
        detalhes.push(`Erro ao verificar produtos: ${produtosError.message}`);
      } else {
        const produtosInconsistentesList = produtos?.filter(p => p.produto !== p.produto.toUpperCase()) || [];
        produtosInconsistentes = produtosInconsistentesList.length;
        if (produtosInconsistentes > 0) {
          detalhes.push(`${produtosInconsistentes} produtos não estão em uppercase`);
          detalhes.push(`Produtos encontrados: ${produtosInconsistentesList.map(p => p.produto).join(', ')}`);
        }
      }

      // Verificar emails de colaboradores
      const { data: colaboradores, error: colaboradoresError } = await supabase
        .from('colaboradores')
        .select('email');

      if (colaboradoresError) {
        detalhes.push(`Erro ao verificar emails de colaboradores: ${colaboradoresError.message}`);
      } else {
        const colaboradoresInconsistentes = colaboradores?.filter(c => c.email !== c.email.toLowerCase()) || [];
        const count = colaboradoresInconsistentes.length;
        emailsInconsistentes += count;
        if (count > 0) {
          detalhes.push(`${count} emails de colaboradores não estão em lowercase`);
        }
      }

      // Verificar emails de gestores
      const { data: gestores, error: gestoresError } = await supabase
        .from('empresas_clientes')
        .select('email_gestor')
        .not('email_gestor', 'is', null);

      if (gestoresError) {
        detalhes.push(`Erro ao verificar emails de gestores: ${gestoresError.message}`);
      } else {
        const gestoresInconsistentes = gestores?.filter(g => 
          g.email_gestor && g.email_gestor !== g.email_gestor.toLowerCase()
        ) || [];
        const count = gestoresInconsistentes.length;
        emailsInconsistentes += count;
        if (count > 0) {
          detalhes.push(`${count} emails de gestores não estão em lowercase`);
        }
      }

      return { produtosInconsistentes, emailsInconsistentes, detalhes };
    } catch (error) {
      detalhes.push(`Erro inesperado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return { produtosInconsistentes: 0, emailsInconsistentes: 0, detalhes };
    }
  }
}