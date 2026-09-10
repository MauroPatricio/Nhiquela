/**
 * Nhiquela Backend - Route Health Check Script
 * Tests public/admin GET routes to verify they respond (200, 401, or 404 expected)
 * 401 = route exists but requires auth (PASS)
 * 200 = route exists and is public (PASS)
 * 404 = route not found (FAIL)
 * 500 = server error (WARNING)
 */

const http = require('http');

const BASE = 'http://localhost:5000';

// Routes to test: [method, path, description, acceptable_statuses]
const ROUTES = [
  ['GET', '/api/users',                    'Utilizadores (admin)',         [401]],
  ['GET', '/api/customers',                'Clientes',                     [401]],
  ['GET', '/api/drivers',                  'Motoristas (publico)',          [200]],
  ['GET', '/api/drivers/available',        'Motoristas disponiveis',        [200]],
  ['GET', '/api/orders',                   'Encomendas (admin)',            [401]],
  ['GET', '/api/request-service/admin',    'Servicos solicitados (admin)',  [401]],
  ['GET', '/api/request-service/userview', 'Servicos solicitados (user)',   [401]],
  ['GET', '/api/services',                 'Servicos (catalogo)',           [200]],
  ['GET', '/api/categories',               'Categorias',                    [200]],
  ['GET', '/api/subcategories',            'Subcategorias',                 [200]],
  ['GET', '/api/products',                 'Produtos',                      [200]],
  ['GET', '/api/providers',                'Fornecedores',                  [200, 401]],
  ['GET', '/api/provinces',                'Provincias',                    [200]],
  ['GET', '/api/vehicle-types',            'Tipos de veiculo',              [200]],
  ['GET', '/api/vehicle-colors',           'Cores de veiculo',              [200]],
  ['GET', '/api/payment-methods',          'Metodos de pagamento',          [200, 401]],
  ['GET', '/api/processing-fees',          'Taxas de processamento',        [200, 401]],
  ['GET', '/api/plans',                    'Planos',                        [200, 401]],
  ['GET', '/api/stats',                    'Estatisticas',                  [200, 401]],
  ['GET', '/api/settings',                 'Definicoes',                    [200, 401]],
  ['GET', '/api/incidents',                'Incidentes',                    [200, 401]],
  ['GET', '/api/marketing',                'Marketing',                     [200, 401]],
  ['GET', '/api/roles',                    'Roles',                         [200, 401]],
  ['GET', '/api/notifications',            'Notificacoes',                  [200, 401]],
  ['GET', '/api/wallet',                   'Carteira',                      [200, 401]],
  ['GET', '/api/document-order',           'Encomendas de documentos',      [200, 401]],
  ['GET', '/api/catalog',                  'Catalogo de servicos',          [200, 401]],
  ['GET', '/api/provider-types',           'Tipos de fornecedor',           [200, 401]],
  ['GET', '/api/provider-subcategories',   'Sub-categorias de fornecedor',  [200, 401]],
  ['GET', '/api/provider-classifications', 'Classificacoes de fornecedor',  [200, 401]],
  ['GET', '/api/home',                     'Home (banner/destaques)',        [200, 401]],
];

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

function request(method, path) {
  return new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 5000, path, method }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('error', () => resolve(0));
    req.setTimeout(5000, () => { req.destroy(); resolve(0); });
    req.end();
  });
}

async function runTests() {
  console.log('\n====================================================');
  console.log(' Nhiquela Backend - Route Health Check');
  console.log('====================================================\n');

  let passed = 0, failed = 0, warnings = 0;
  const failures = [];

  for (const [method, path, desc, acceptable] of ROUTES) {
    const status = await request(method, path);
    const label  = `${method} ${path}`;

    if (status === 0) {
      console.log(`ERRO    [${label}] - ${desc} -> Sem resposta / Timeout`);
      failed++;
      failures.push({ label, desc, status: 'TIMEOUT' });
    } else if (acceptable.includes(status)) {
      const statusLabel = status === 401 ? '401 (auth necessaria)' : `${status}`;
      console.log(`PASS    [${label}] - ${desc} -> ${statusLabel}`);
      passed++;
    } else if (status === 500) {
      console.log(`AVISO   [${label}] - ${desc} -> ${status} (Erro no servidor)`);
      warnings++;
    } else {
      console.log(`FALHOU  [${label}] - ${desc} -> ${status} (esperado: ${acceptable.join('/')})`);
      failed++;
      failures.push({ label, desc, status });
    }
  }

  console.log('\n====================================================');
  console.log(` Resultado: ${passed} passaram  ${failed} falharam  ${warnings} avisos`);
  console.log('====================================================\n');

  if (failures.length > 0) {
    console.log('Rotas com problemas:');
    failures.forEach(f => console.log(`  -> ${f.label} (${f.desc}) - Status: ${f.status}`));
    console.log('');
  }
}

runTests();
