// Teste para verificar se a data de hoje está sendo gerada corretamente

console.log('=== TESTE DE DATA ATUAL ===');

// Método 1: new Date().toISOString().split('T')[0]
const metodo1 = new Date().toISOString().split('T')[0];
console.log('Método 1 (toISOString):', metodo1);

// Método 2: Formatação manual
const hoje = new Date();
const ano = hoje.getFullYear();
const mes = String(hoje.getMonth() + 1).padStart(2, '0');
const dia = String(hoje.getDate()).padStart(2, '0');
const metodo2 = `${ano}-${mes}-${dia}`;
console.log('Método 2 (manual):', metodo2);

// Método 3: date-fns format
const { format } = require('date-fns');
const metodo3 = format(new Date(), 'yyyy-MM-dd');
console.log('Método 3 (date-fns):', metodo3);

// Verificar se são iguais
console.log('Métodos são iguais?', metodo1 === metodo2 && metodo2 === metodo3);

// Informações adicionais
console.log('\n=== INFORMAÇÕES ADICIONAIS ===');
console.log('Data atual completa:', new Date());
console.log('Timezone offset:', new Date().getTimezoneOffset());
console.log('Data local:', new Date().toLocaleDateString('pt-BR'));
console.log('Hora local:', new Date().toLocaleTimeString('pt-BR'));

// Verificar se há diferença de timezone
const utc = new Date();
const local = new Date(utc.getTime() - (utc.getTimezoneOffset() * 60000));
console.log('UTC:', utc.toISOString().split('T')[0]);
console.log('Local ajustado:', local.toISOString().split('T')[0]);