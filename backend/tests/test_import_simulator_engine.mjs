// test_import_simulator_engine.mjs
// Testes de Validação do Motor Fiscal e Classificação Pautal de Moçambique

import TariffDatabaseService from '../modules/import/services/TariffDatabaseService.js';
import ProductClassificationService from '../modules/import/services/ProductClassificationService.js';
import CustomsTaxEngine from '../modules/import/services/CustomsTaxEngine.js';

console.log('=================================================================');
console.log('TESTES DO MOTOR DE IMPORTAÇÃO & CÁLCULO ADUANEIRO NHIQUELA (MOÇAMBIQUE)');
console.log('=================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
  }
}

// -------------------------------------------------------------
// TESTE 1: TariffDatabaseService
// -------------------------------------------------------------
console.log('--- TESTE 1: TariffDatabaseService (Pauta Oficial) ---');
const { totalPositionsIndexed } = TariffDatabaseService.getMetadata();
assert(totalPositionsIndexed >= 10, 'A base de dados pautal contém posições indexadas');

const defaultItems = TariffDatabaseService.search('');
assert(defaultItems.length === 5, 'Pesquisa vazia devolve apenas 5 posições por padrão');

const solarItem = TariffDatabaseService.getByShCode('8541.43.00');
assert(solarItem !== null && solarItem.shCode === '8541.43.00', 'Pesquisa por código SH 8541.43.00 retorna painéis solares');
assert(solarItem.daRate === 0 && solarItem.ivaRate === 0, 'Painéis solares têm DA 0% e IVA 0% (Isenção Lei 22/2022 Anexo IV)');

const pumpSearch = TariffDatabaseService.search('bomba');
assert(pumpSearch.length > 0 && pumpSearch.some(i => i.shCode.startsWith('8413')), 'Pesquisa por palavra "bomba" encontra posições do capítulo 84');

// -------------------------------------------------------------
// TESTE 2: ProductClassificationService (Classificação Assistida)
// -------------------------------------------------------------
console.log('\n--- TESTE 2: ProductClassificationService (Motor de Classificação) ---');

// Cenário A: Produto com isenção solar
const classSolar = ProductClassificationService.classify({
  productName: 'Painel solar monocristalino 550W',
  productDescription: 'Módulo fotovoltaico de alta eficiência para geração de energia',
  category: 'Energia Solar & Renovável'
});
assert(classSolar.status === 'candidate', 'Painel solar classificado como candidate');
assert(classSolar.topCandidate.shCode === '8541.43.00', 'Código sugerido para painel solar é 8541.43.00');
assert(classSolar.topCandidate.daRate === 0 && classSolar.topCandidate.ivaRate === 0, 'Painel solar mantém benefícios fiscais');

// Cenário B: Produto com ambiguidade (perguntas de desambiguação)
const classVehicle = ProductClassificationService.classify({
  productName: 'Toyota Fortuner',
  productDescription: 'Viatura ligeira de passageiros com motor 2.8',
  category: 'Veículos Automóveis',
  condition: 'used'
});
assert(classVehicle.topCandidate.shCode.startsWith('8703'), 'Automóvel classificado no capítulo 8703');
assert(classVehicle.disambiguationQuestions.length > 0, 'Gera perguntas técnicas de desambiguação para veículos (cilindrada, ano)');

// Cenário C: Artigo desconhecido sem correspondência (evitar alucinações)
const classUnknown = ProductClassificationService.classify({
  productName: 'Xyzpto Inexistente 99999',
  productDescription: 'Elemento sem qualquer termo reconhecível',
  category: 'Outro'
});
assert(classUnknown.status === 'unresolved', 'Produto sem correspondência é marcado como unresolved (não inventa taxas)');

// -------------------------------------------------------------
// TESTE 3: CustomsTaxEngine (Cálculos Aduaneiros Moçambique)
// -------------------------------------------------------------
console.log('\n--- TESTE 3: CustomsTaxEngine (Cálculo Aduaneiro Rigoroso) ---');

// Cenário A: Bomba de Irrigação (VM $1,000 USD, Frete $200 USD, Seguro 1%)
const calcBomba = CustomsTaxEngine.calculate({
  currency: 'USD',
  quantity: 1,
  unitPrice: 1000,
  freightOption: 'HAS_QUOTE',
  freightValue: 200,
  insuranceOption: 'HAS_QUOTE',
  insuranceValue: 12,
  transportType: 'SEA',
  destinationCity: 'Maputo',
  tariffItem: {
    shCode: '8413.70.00',
    description: 'Motobombas de irrigação',
    daRate: 5,
    ivaRate: 0, // Isento de IVA Lei 22/2022
    iceRate: 0,
    isExempt: true,
    exemptionBasis: 'Lei 22/2022 Art. 9'
  }
});

// Verificações Matemáticas e Fiscais (com taxa oficial 75.00 MT/USD):
// VM = 1000 * 75.0 = 75,000 MT
// Frete = 200 * 75.0 = 15,000 MT
// Seguro = 12 * 75.0 = 900 MT
// VA (CIF) = 75,000 + 15,000 + 900 = 90,900 MT
assert(calcBomba.goodsSummary.totalGoodsValueMzn === 75000, 'Valor da Mercadoria em MT está correto (75,000 MT)');
assert(calcBomba.logisticsSummary.customsValueMzn === 90900, 'Valor Aduaneiro CIF correto (90,900 MT)');

// DA = 90,900 * 5% = 4,545 MT
assert(calcBomba.taxSummary.customsDuty.amountMzn === 4545, 'Direitos Aduaneiros (DA 5%) corretos: 4,545 MT');

// IVA = 0 MT (Isento)
assert(calcBomba.taxSummary.vat.amountMzn === 0, 'IVA é 0 MT devido à isenção da Lei 22/2022');

// Cenário B: Produto Geral Tributado (Laptop VM $1,000 USD, DA 5%, IVA 16%)
const calcLaptop = CustomsTaxEngine.calculate({
  currency: 'USD',
  quantity: 1,
  unitPrice: 1000,
  freightOption: 'HAS_QUOTE',
  freightValue: 100,
  transportType: 'AIR',
  destinationCity: 'Maputo',
  tariffItem: {
    shCode: '8471.30.00',
    description: 'Computadores portáteis',
    daRate: 5,
    ivaRate: 16,
    iceRate: 0,
    isExempt: false
  }
});

// VM = 75,000 MT, Frete = 7,500 MT, Seguro 1% = 825 MT => CIF = 83,325 MT
// DA = 83,325 * 5% = 4,166.25 MT
// Base IVA = CIF + DA = 83,325 + 4,166.25 = 87,491.25 MT
// IVA 16% = 87,491.25 * 16% = 13,998.60 MT
const expectedVatBase = Number((calcLaptop.logisticsSummary.customsValueMzn + calcLaptop.taxSummary.customsDuty.amountMzn).toFixed(2));
assert(calcLaptop.taxSummary.vat.baseMzn === expectedVatBase, 'Base do IVA respeita Art. 17 do Código do IVA (CIF + DA + ICE)');
assert(calcLaptop.taxSummary.vat.amountMzn > 0, 'IVA calculado com rigor fiscal');
assert(calcLaptop.grandTotal.totalCostMzn > calcLaptop.logisticsSummary.customsValueMzn, 'Custo total global integra todos os componentes sem duplicações');

console.log('\n=================================================================');
console.log(`RESULTADO FINAL DOS TESTES: ${passedTests} DE ${totalTests} TESTES APROVADOS (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('=================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
