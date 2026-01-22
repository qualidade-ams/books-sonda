/**
 * Exemplos de Uso do Serviço de Reajustes de Banco de Horas
 * 
 * Este arquivo contém exemplos práticos de como usar o bancoHorasReajustesService
 * para criar, aplicar e gerenciar reajustes manuais nos cálculos de banco de horas.
 * 
 * @module examples/bancoHorasReajustesService
 */

import { reajustesService } from '../bancoHorasReajustesService';

/**
 * Exemplo 1: Criar e aplicar reajuste positivo de horas
 * 
 * Cenário: Empresa teve horas extras não contabilizadas que precisam ser adicionadas
 */
async function exemplo1_ReajustePositivoHoras() {
  const empresaId = 'uuid-empresa';
  const usuarioId = 'uuid-usuario';

  try {
    // 1. Criar reajuste
    const reajuste = await bancoHorasReajustesService.criarReajuste({
      empresaId,
      mes: 3,
      ano: 2024,
      valorReajusteHoras: '10:30', // 10 horas e 30 minutos positivos
      observacaoPrivada: 'Ajuste devido a horas extras não contabilizadas no sistema Aranda durante manutenção',
      usuarioId
    });

    console.log('✅ Reajuste criado:', reajuste.id);
    console.log('   Tipo:', reajuste.tipo_reajuste); // 'positivo'
    console.log('   Valor:', reajuste.valor_reajuste_horas); // '10:30'

    // 2. Aplicar reajuste (recalcula mês e subsequentes)
    const resultado = await bancoHorasReajustesService.aplicarReajuste(
      reajuste.id,
      usuarioId
    );

    console.log('✅ Reajuste aplicado');
    console.log('   Meses recalculados:', resultado.mesesRecalculados);
    console.log('   Novo saldo:', resultado.calculoAtualizado.saldo_horas);
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

/**
 * Exemplo 2: Criar e aplicar reajuste negativo de horas
 * 
 * Cenário: Horas foram contabilizadas em duplicidade e precisam ser removidas
 */
async function exemplo2_ReajusteNegativoHoras() {
  const empresaId = 'uuid-empresa';
  const usuarioId = 'uuid-usuario';

  try {
    // Criar reajuste negativo (usar sinal - no valor)
    const reajuste = await bancoHorasReajustesService.criarReajuste({
      empresaId,
      mes: 3,
      ano: 2024,
      valorReajusteHoras: '-5:00', // 5 horas negativas
      observacaoPrivada: 'Correção de horas contabilizadas em duplicidade no chamado RF-123456',
      usuarioId
    });

    console.log('✅ Reajuste criado:', reajuste.id);
    console.log('   Tipo:', reajuste.tipo_reajuste); // 'negativo'
    console.log('   Valor:', reajuste.valor_reajuste_horas); // '-5:00'

    // Aplicar reajuste
    const resultado = await bancoHorasReajustesService.aplicarReajuste(
      reajuste.id,
      usuarioId
    );

    console.log('✅ Reajuste aplicado');
    console.log('   Novo saldo:', resultado.calculoAtualizado.saldo_horas);
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

/**
 * Exemplo 3: Criar reajuste de tickets
 * 
 * Cenário: Tickets foram consumidos mas não registrados no sistema
 */
async function exemplo3_ReajusteTickets() {
  const empresaId = 'uuid-empresa';
  const usuarioId = 'uuid-usuario';

  try {
    const reajuste = await bancoHorasReajustesService.criarReajuste({
      empresaId,
      mes: 3,
      ano: 2024,
      valorReajusteTickets: 15.5, // 15.5 tickets positivos
      observacaoPrivada: 'Ajuste de tickets consumidos em atendimentos emergenciais não registrados',
      usuarioId
    });

    console.log('✅ Reajuste de tickets criado:', reajuste.id);
    console.log('   Valor:', reajuste.valor_reajuste_tickets); // 15.5

    const resultado = await bancoHorasReajustesService.aplicarReajuste(
      reajuste.id,
      usuarioId
    );

    console.log('✅ Reajuste aplicado');
    console.log('   Novo saldo tickets:', resultado.calculoAtualizado.saldo_tickets);
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

/**
 * Exemplo 4: Criar reajuste misto (horas e tickets)
 * 
 * Cenário: Ajuste necessário em ambos os tipos de contrato
 */
async function exemplo4_ReajusteMisto() {
  const empresaId = 'uuid-empresa';
  const usuarioId = 'uuid-usuario';

  try {
    const reajuste = await bancoHorasReajustesService.criarReajuste({
      empresaId,
      mes: 3,
      ano: 2024,
      valorReajusteHoras: '8:00',
      valorReajusteTickets: 10,
      observacaoPrivada: 'Ajuste combinado devido a inconsistências no sistema de apontamentos',
      usuarioId
    });

    console.log('✅ Reajuste misto criado:', reajuste.id);
    console.log('   Horas:', reajuste.valor_reajuste_horas);
    console.log('   Tickets:', reajuste.valor_reajuste_tickets);

    const resultado = await bancoHorasReajustesService.aplicarReajuste(
      reajuste.id,
      usuarioId
    );

    console.log('✅ Reajuste aplicado');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

/**
 * Exemplo 5: Listar histórico de reajustes
 * 
 * Cenário: Visualizar todos os reajustes de uma empresa
 */
async function exemplo5_ListarReajustes() {
  const empresaId = 'uuid-empresa';

  try {
    // Listar todos os reajustes da empresa
    const todosReajustes = await bancoHorasReajustesService.listarReajustes(empresaId);

    console.log(`📋 Total de reajustes: ${todosReajustes.length}`);
    
    todosReajustes.forEach(reajuste => {
      console.log(`\n📝 Reajuste ${reajuste.id}`);
      console.log(`   Período: ${reajuste.mes}/${reajuste.ano}`);
      console.log(`   Tipo: ${reajuste.tipo_reajuste}`);
      console.log(`   Horas: ${reajuste.valor_reajuste_horas || 'N/A'}`);
      console.log(`   Tickets: ${reajuste.valor_reajuste_tickets || 'N/A'}`);
      console.log(`   Observação: ${reajuste.observacao_privada}`);
      console.log(`   Criado em: ${reajuste.created_at}`);
    });

    // Listar reajustes de um mês específico
    const reajustesMes = await bancoHorasReajustesService.listarReajustes(
      empresaId,
      3,
      2024
    );

    console.log(`\n📋 Reajustes de 03/2024: ${reajustesMes.length}`);
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

/**
 * Exemplo 6: Inativar reajuste
 * 
 * Cenário: Reajuste foi aplicado incorretamente e precisa ser removido
 */
async function exemplo6_InativarReajuste() {
  const reajusteId = 'uuid-reajuste';
  const usuarioId = 'uuid-usuario';

  try {
    await bancoHorasReajustesService.inativarReajuste(
      reajusteId,
      usuarioId,
      'Reajuste aplicado incorretamente, valores já estavam contabilizados'
    );

    console.log('✅ Reajuste inativado');
    console.log('   Meses foram recalculados automaticamente');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

/**
 * Exemplo 7: Tratamento de erros de validação
 * 
 * Cenário: Demonstrar validações e tratamento de erros
 */
async function exemplo7_TratamentoErros() {
  const empresaId = 'uuid-empresa';
  const usuarioId = 'uuid-usuario';

  // Erro 1: Observação muito curta
  try {
    await bancoHorasReajustesService.criarReajuste({
      empresaId,
      mes: 3,
      ano: 2024,
      valorReajusteHoras: '10:00',
      observacaoPrivada: 'Curta', // Menos de 10 caracteres
      usuarioId
    });
  } catch (error) {
    console.error('❌ Erro esperado - Observação muito curta:', error.message);
    // "Observação privada deve ter no mínimo 10 caracteres"
  }

  // Erro 2: Nenhum valor fornecido
  try {
    await bancoHorasReajustesService.criarReajuste({
      empresaId,
      mes: 3,
      ano: 2024,
      // Sem valorReajusteHoras nem valorReajusteTickets
      observacaoPrivada: 'Observação válida com mais de 10 caracteres',
      usuarioId
    });
  } catch (error) {
    console.error('❌ Erro esperado - Nenhum valor:', error.message);
    // "Pelo menos um valor de reajuste (horas ou tickets) deve ser fornecido"
  }

  // Erro 3: Reajuste não encontrado
  try {
    await bancoHorasReajustesService.aplicarReajuste(
      'uuid-invalido',
      usuarioId
    );
  } catch (error) {
    console.error('❌ Erro esperado - Reajuste não encontrado:', error.message);
  }
}

/**
 * Exemplo 8: Fluxo completo com verificações
 * 
 * Cenário: Fluxo completo de criação, aplicação e verificação de reajuste
 */
async function exemplo8_FluxoCompleto() {
  const empresaId = 'uuid-empresa';
  const usuarioId = 'uuid-usuario';

  try {
    console.log('🔍 1. Verificando reajustes existentes...');
    const reajustesAnteriores = await bancoHorasReajustesService.listarReajustes(
      empresaId,
      3,
      2024
    );
    console.log(`   Reajustes existentes: ${reajustesAnteriores.length}`);

    console.log('\n📝 2. Criando novo reajuste...');
    const reajuste = await bancoHorasReajustesService.criarReajuste({
      empresaId,
      mes: 3,
      ano: 2024,
      valorReajusteHoras: '12:00',
      observacaoPrivada: 'Ajuste de horas extras aprovadas pela gerência em reunião de 15/03/2024',
      usuarioId
    });
    console.log(`   ✅ Reajuste criado: ${reajuste.id}`);

    console.log('\n🔄 3. Aplicando reajuste...');
    const resultado = await bancoHorasReajustesService.aplicarReajuste(
      reajuste.id,
      usuarioId
    );
    console.log(`   ✅ Aplicado com sucesso`);
    console.log(`   Meses recalculados: ${resultado.mesesRecalculados}`);
    console.log(`   Novo saldo: ${resultado.calculoAtualizado.saldo_horas}`);

    console.log('\n📋 4. Verificando histórico atualizado...');
    const reajustesAtualizados = await bancoHorasReajustesService.listarReajustes(
      empresaId,
      3,
      2024
    );
    console.log(`   Total de reajustes: ${reajustesAtualizados.length}`);

    console.log('\n✅ Fluxo completo executado com sucesso!');
  } catch (error) {
    console.error('❌ Erro no fluxo:', error);
  }
}

// Exportar exemplos
export {
  exemplo1_ReajustePositivoHoras,
  exemplo2_ReajusteNegativoHoras,
  exemplo3_ReajusteTickets,
  exemplo4_ReajusteMisto,
  exemplo5_ListarReajustes,
  exemplo6_InativarReajuste,
  exemplo7_TratamentoErros,
  exemplo8_FluxoCompleto
};
