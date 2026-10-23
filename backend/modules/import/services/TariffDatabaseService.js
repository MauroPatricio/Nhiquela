// TariffDatabaseService.js
// Base de Dados Oficial da Pauta Aduaneira de Moçambique
// Fontes Oficiais: Autoridade Tributária de Moçambique (AT), Diploma Ministerial e Leis Fiscais Vigentes
// Legislação de Referência:
// - Lei n.º 17/2022 e Lei n.º 8/2025 (Pauta Aduaneira da República de Moçambique)
// - Lei n.º 22/2022 e Lei n.º 7/2025 (Código do IVA - Regime de Isenções)
// - Lei n.º 19/2022 e Lei n.º 7/2025 (Código do ICE - Imposto sobre Consumos Específicos)

export const TARIFF_DATABASE_VERSION = {
  version: '2025.1-MZ',
  effectiveDate: '2025-01-01',
  lastUpdated: '2026-01-15',
  source: 'Autoridade Tributária de Moçambique (AT) / Imprensa Nacional',
  legalBasis: 'Lei n.º 8/2025 e Lei n.º 22/2022'
};

// Base de dados estruturada com posições pautais detalhadas
export const MOZAMBIQUE_TARIFF_ITEMS = [
  // --- CAPÍTULO 84 & 85: ENERGIA SOLAR & RENOVÁVEL ---
  {
    shCode: '8541.43.00',
    fullCode: '8541.43.00.00',
    name: 'Painéis Solares, Inversores e Equipamentos Fotovoltaicos',
    description: 'Células fotovoltaicas montadas em módulos ou constituídas em painéis; painéis solares fotovoltaicos',
    category: 'Energia Solar & Renovável',
    group: 'Energia Solar & Renovável',
    keywords: ['painel solar', 'solar', 'fotovoltaica', 'inversor solar', 'celula solar', 'energia solar', 'placa solar'],
    examples: 'Painéis solares 300W a 650W, células fotovoltaicas, estruturas de fixação, kits solares residenciais',
    daRate: 0,
    ivaRate: 0,
    iceRate: 0,
    isExempt: true,
    exemptionBasis: 'Lei n.º 22/2022, Anexo IV (Equipamentos e Acessórios de Energia Solar e Renováveis)',
    legalBasis: 'Lei n.º 8/2025, Posição 8541.43.00; Código do IVA Art. 9',
    unit: 'Unidade',
    notes: 'Isenção total de Direitos Aduaneiros (0%) e IVA (0%) quando destinado à produção de energia solar.',
    disambiguationQuestions: []
  },
  {
    shCode: '8504.40.00',
    fullCode: '8504.40.00.00',
    name: 'Inversores de Corrente e Conversores Estáticos',
    description: 'Conversores estáticos; inversores de corrente contínua para alternada, fontes de alimentação',
    category: 'Energia Solar & Renovável',
    group: 'Energia Solar & Renovável',
    keywords: ['inversor', 'conversor', 'inversor de corrente', 'inversor solar', 'fonte retificadora', 'onda senoidal'],
    examples: 'Inversores híbridos, inversores off-grid, conversores 12V/24V para 220V, retificadores',
    daRate: 5,
    ivaRate: 0,
    iceRate: 0,
    isExempt: true,
    exemptionBasis: 'Lei n.º 22/2022, Anexo IV quando destinado a sistemas fotovoltaicos',
    legalBasis: 'Lei n.º 8/2025, Posição 8504.40.00',
    unit: 'Unidade',
    notes: 'DA 5% geral. Isenção de IVA para inversores acoplados a sistemas solares.',
    disambiguationQuestions: [
      {
        question: 'O inversor é especificamente para energia solar fotovoltaica?',
        options: ['Sim, para sistema solar (Isenção IVA Lei 22/2022)', 'Não, para uso industrial/eletrónico geral']
      }
    ]
  },

  // --- CAPÍTULO 84: BOMBAS DE ÁGUA & IRRIGAÇÃO ---
  {
    shCode: '8413.70.00',
    fullCode: '8413.70.00.00',
    name: 'Bombas de Água e Equipamentos de Rega / Irrigação',
    description: 'Outras bombas centrífugas para líquidos, motobombas e eletrobombas de irrigação',
    category: 'Agricultura & Pecuária',
    group: 'Agricultura & Pecuária',
    keywords: ['bomba de irrigacao', 'motobomba', 'eletrobomba', 'bomba de agua', 'bomba submersivel', 'irrigacao', 'bomba diesel', 'bomba solar'],
    examples: 'Bombas submersíveis para poços, motobombas diesel/gasolina 2 a 4 polegadas, canhões de rega, bombas solares',
    daRate: 5,
    ivaRate: 0,
    iceRate: 0,
    isExempt: true,
    exemptionBasis: 'Lei n.º 22/2022, Art. 9, n.º 12 alínea h) (Abastecimento de água e agricultura)',
    legalBasis: 'Lei n.º 8/2025, Posição 8413.70.00',
    unit: 'Unidade',
    notes: 'DA 5%. Isento de IVA quando comprovado destino para atividade agrícola/rega.',
    disambiguationQuestions: [
      {
        question: 'Qual a finalidade principal da motobomba?',
        options: ['Irrigação e uso agrícola (Isento de IVA)', 'Uso residencial / comercial geral (IVA 16%)']
      }
    ]
  },
  {
    shCode: '8413.20.00',
    fullCode: '8413.20.00.00',
    name: 'Bombas Manuais de Água para Poços e Cisternas',
    description: 'Bombas manuais de água e líquidos',
    category: 'Agricultura & Pecuária',
    group: 'Agricultura & Pecuária',
    keywords: ['bomba manual', 'bomba de agua manual', 'bomba manual pocilga', 'bomba de poco', 'volanta'],
    examples: 'Bombas manuais tipo Afridev, bombas de alavanca para furos comunitários',
    daRate: 5,
    ivaRate: 0,
    iceRate: 0,
    isExempt: true,
    exemptionBasis: 'Lei n.º 22/2022, Art. 9 (Abastecimento de água)',
    legalBasis: 'Lei n.º 8/2025, Posição 8413.20.00',
    unit: 'Unidade',
    notes: 'Isento de IVA. DA reduzido a 5%.',
    disambiguationQuestions: []
  },

  // --- CAPÍTULO 85: GERADORES DE ENERGIA ---
  {
    shCode: '8501.61.00',
    fullCode: '8501.61.00.00',
    name: 'Geradores Elétricos e Grupos Eletrogéneos (Diesel/Gasolina)',
    description: 'Geradores de corrente alternada (geradores de energia) de potência não superior a 75 kVA',
    category: 'Maquinaria & Equipamentos Industriais',
    group: 'Maquinaria & Equipamentos Industriais',
    keywords: ['gerador', 'gerador de energia', 'gerador diesel', 'gerador a gasolina', 'grupo eletrogeneo', 'kwa', 'kva'],
    examples: 'Geradores portáteis 2kVA a 10kVA, geradores insonorizados trifásicos até 75kVA',
    daRate: 5,
    ivaRate: 0,
    iceRate: 0,
    isExempt: true,
    exemptionBasis: 'Lei n.º 22/2022 Anexo I (Bens de capital e apoio produtivo até 75 kVA)',
    legalBasis: 'Lei n.º 8/2025, Posição 8501.61.00',
    unit: 'Unidade',
    notes: 'Isento de IVA para potências até 75 kVA. DA a 5%.',
    disambiguationQuestions: [
      {
        question: 'Qual a potência nominal do gerador?',
        options: ['Até 75 kVA (Isento de IVA)', 'Superior a 75 kVA (IVA 16%)']
      }
    ]
  },

  // --- CAPÍTULO 87: VEÍCULOS & TRATORES ---
  {
    shCode: '8701.91.00',
    fullCode: '8701.91.00.00',
    name: 'Tratores Agrícolas e Motocultivadores',
    description: 'Tratores agrícolas de rodas e motocultivadores para fomento agrário',
    category: 'Agricultura & Pecuária',
    group: 'Agricultura & Pecuária',
    keywords: ['trator', 'trator agricola', 'trator pequeno', 'motocultivador', 'alfaias', 'arado'],
    examples: 'Tratores de 40HP a 120HP, motocultivadores a diesel, tratores de esteiras',
    daRate: 0,
    ivaRate: 0,
    iceRate: 0,
    isExempt: true,
    exemptionBasis: 'Lei n.º 22/2022 Anexo I (Máquinas agrícolas); Lei n.º 8/2025 DA 0%',
    legalBasis: 'Lei n.º 8/2025, Posição 8701.91.00',
    unit: 'Unidade',
    notes: 'Isenção total de DA e IVA para apoio à produção agrária.',
    disambiguationQuestions: []
  },
  {
    shCode: '8703.23.90',
    fullCode: '8703.23.90.00',
    name: 'Veículos Automóveis Ligeiros de Passageiros (Carros/SUVs)',
    description: 'Veículos automóveis de passageiros, com motor de ignição por faísca ou diesel, cilindrada superior a 1.500 cm³ mas não superior a 3.000 cm³',
    category: 'Veículos Automóveis',
    group: 'Veículos Automóveis',
    keywords: ['carro', 'automovel', 'viatura', 'carro usado', 'suv', 'toyota', 'veiculo ligeiro', 'honda', 'nissan'],
    examples: 'Toyota Hilux Surf, Fortuner, RAV4, sedans, hatchbacks novos ou usados',
    daRate: 20,
    ivaRate: 16,
    iceRate: 15,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025 Posição 8703.23; Código do ICE Lei n.º 19/2022 e Lei n.º 7/2025 Tabela I',
    unit: 'Unidade',
    notes: 'DA 20%, IVA 16% e ICE 15% a 25% conforme ano de fabrico e cilindrada.',
    disambiguationQuestions: [
      {
        question: 'O veículo é novo ou usado?',
        options: ['Usado (mais de 1 ano de matrícula)', 'Novo (0 km)']
      }
    ]
  },
  {
    shCode: '8704.21.90',
    fullCode: '8704.21.90.00',
    name: 'Carrinhas de Carga, Pick-ups e Pequenos Camiões',
    description: 'Veículos automóveis para transporte de mercadorias (carrinhas de carga / pick-up), de peso bruto não superior a 5 toneladas',
    category: 'Veículos Automóveis',
    group: 'Veículos Automóveis',
    keywords: ['carrinha', 'pick up', 'camioneta', 'transporte de mercadorias', 'camiao pequeno', 'isuzu', 'canter', 'carrinha de caixa aberta'],
    examples: 'Toyota Hilux cabine simples/dupla, Isuzu D-Max, Canter 3.5t, furgões de carga',
    daRate: 10,
    ivaRate: 16,
    iceRate: 5,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025, Posição 8704.21; Código do ICE',
    unit: 'Unidade',
    notes: 'DA 10.00%, IVA 16.00%, ICE 5.00%.',
    disambiguationQuestions: []
  },

  // --- CAPÍTULO 61 & 62: TÊXTEIS, MODA & VESTUÁRIO ---
  {
    shCode: '6101 - 6217',
    fullCode: '6109.10.00.00',
    name: 'Vestuário Geral, Roupas e Confecções Novas',
    description: 'Artigos de vestuário e seus acessórios, de malha ou de tecido, para homem, mulher e criança',
    category: 'Têxteis & Vestuário',
    group: 'Moda, Têxteis & Calçado',
    keywords: ['roupa', 'vestuario', 'camisas', 'calcas', 'calcas jeans', 'vestidos', 'fatos', 'casacos', 'roupa infantil', 't-shirt', 'camisete', 'tshirt'],
    examples: 'Camisas, calças jeans, vestidos, fatos sociais, casacos de inverno, roupa para crianças e bebés, saias',
    daRate: 20,
    ivaRate: 16,
    iceRate: 0,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025, Capítulos 61 e 62; Bens de Consumo Final',
    unit: 'Unidade',
    notes: 'Bens de Consumo Final: Direitos Aduaneiros 20.00% e IVA 16.00%.',
    disambiguationQuestions: [
      {
        question: 'O vestuário é novo ou roupa usada (fardo)?',
        options: ['Vestuário novo (Posição 61/62)', 'Roupa usada em fardos (Posição 6309)']
      }
    ]
  },
  {
    shCode: '6309.00.00',
    fullCode: '6309.00.00.00',
    name: 'Fardos de Roupa Usada e Artigos em Segunda Mão',
    description: 'Artigos de vestuário usados e outros artigos usados (fardos de roupa usada)',
    category: 'Têxteis & Vestuário',
    group: 'Moda, Têxteis & Calçado',
    keywords: ['fardo', 'roupa usada', 'fardo de roupa', 'roupa em segunda mao', 'fardo de calcas', 'fardo de vestidos'],
    examples: 'Fardos de 45kg a 100kg de roupa de verão, inverno, casacos, roupa mista',
    daRate: 20,
    ivaRate: 16,
    iceRate: 0,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025, Posição 6309.00.00',
    unit: 'Kg',
    notes: 'DA 20.00% e IVA 16.00%. Sujeito a certificado de fumigação sanitária internacional.',
    disambiguationQuestions: []
  },

  // --- CAPÍTULO 64: CALÇADO ---
  {
    shCode: '6401 - 6405',
    fullCode: '6403.99.00.00',
    name: 'Calçado, Sapatilhas e Sapatos em Geral',
    description: 'Calçado com sola exterior de borracha, plástico, couro natural ou reconstituído',
    category: 'Calçado & Acessórios',
    group: 'Moda, Têxteis & Calçado',
    keywords: ['calcado', 'sapatos', 'sapatilhas', 'tenis', 'botas', 'sandalias', 'chinelos', 'botas de seguranca', 'tenis desportivos'],
    examples: 'Ténis desportivos, sapatos sociais de pele, botas de segurança biqueira de aço, sandálias, chinelos',
    daRate: 20,
    ivaRate: 16,
    iceRate: 0,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025, Capítulo 64; Bens de Consumo Final',
    unit: 'Par',
    notes: 'Calçado acabado: DA 20.00% e IVA 16.00%.',
    disambiguationQuestions: []
  },

  // --- CAPÍTULO 33: PERFUMARIA, COSMÉTICA & BELEZA ---
  {
    shCode: '3303.00.00',
    fullCode: '3303.00.00.00',
    name: 'Perfumes e Águas-de-Colónia',
    description: 'Perfumes e águas-de-colónia para uso pessoal',
    category: 'Cosméticos & Cuidados Pessoais',
    group: 'Cosméticos & Cuidados Pessoais',
    keywords: ['perfumes', 'perfume', 'agua de colonia', 'eau de parfum', 'fragrancias', 'desodorizante corporal'],
    examples: 'Perfumes franceses, águas-de-colónia, frascos de fragrâncias de luxo',
    daRate: 20,
    ivaRate: 16,
    iceRate: 20,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025, Posição 3303.00.00; Código do ICE Lei n.º 19/2022 Tabela I',
    unit: 'Litro/Unidade',
    notes: 'DA 20%, IVA 16% e ICE 20% (Imposto sobre Consumos Específicos para bens supérfluos).',
    disambiguationQuestions: []
  },
  {
    shCode: '3304.10 - 3304.99',
    fullCode: '3304.99.00.00',
    name: 'Maquilhagem, Cremes e Cuidados da Pele',
    description: 'Produtos de beleza ou de maquilhagem preparados e preparações para conservação ou cuidados da pele',
    category: 'Cosméticos & Cuidados Pessoais',
    group: 'Cosméticos & Cuidados Pessoais',
    keywords: ['maquilhagem', 'maquiagem', 'cremes', 'batom', 'base', 'locao hidratante', 'protetor solar', 'creme facial'],
    examples: 'Batons, pós faciais, sombras de olhos, cremes anti-rugas, loções corporais, bases cosméticas',
    daRate: 20,
    ivaRate: 16,
    iceRate: 10,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025, Posição 3304; Código do ICE Lei n.º 19/2022',
    unit: 'Unidade',
    notes: 'DA 20.00%, IVA 16.00% e ICE 10.00%.',
    disambiguationQuestions: []
  },

  // --- CAPÍTULO 85: TECNOLOGIA & ELETRÓNICA ---
  {
    shCode: '8517.13.00',
    fullCode: '8517.13.00.00',
    name: 'Smartphones e Telefones Celulares',
    description: 'Smartphones e telefones para redes celulares ou outras redes sem fio',
    category: 'Tecnologia & Telecomunicações',
    group: 'Tecnologia & Telecomunicações',
    keywords: ['smartphone', 'telemovel', 'celular', 'iphone', 'samsung', 'xiaomi', 'telefone celular'],
    examples: 'iPhones, smartphones Android, telemóveis básicos de botões, equipamentos de comunicação 4G/5G',
    daRate: 7.5,
    ivaRate: 16,
    iceRate: 0,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025, Posição 8517.13.00; Código do IVA',
    unit: 'Unidade',
    notes: 'Regime Geral Telecomunicações: DA 7.50% e IVA 16.00%. Homologação INCM.',
    disambiguationQuestions: []
  },
  {
    shCode: '8471.30.00',
    fullCode: '8471.30.00.00',
    name: 'Computadores Portáteis (Laptops) e Tablets',
    description: 'Máquinas automáticas para processamento de dados, portáteis, de peso não superior a 10 kg',
    category: 'Tecnologia & Telecomunicações',
    group: 'Tecnologia & Telecomunicações',
    keywords: ['computador', 'laptop', 'portatil', 'notebook', 'computador portatil', 'tablet', 'macbook', 'ipad'],
    examples: 'Laptops HP, Dell, Lenovo, Apple MacBook, tablets Android e iPads',
    daRate: 5,
    ivaRate: 16,
    iceRate: 0,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025, Posição 8471.30.00',
    unit: 'Unidade',
    notes: 'DA 5.00% e IVA 16.00%. Fomento das tecnologias de informação.',
    disambiguationQuestions: []
  },
  {
    shCode: '8528.72.00',
    fullCode: '8528.72.00.00',
    name: 'Aparelhos de Televisão / Smart TVs',
    description: 'Aparelhos recetores de televisão a cores, mesmo com ecrã de cristal líquido (LCD), díodos emissores de luz (LED) ou plasma',
    category: 'Tecnologia & Telecomunicações',
    group: 'Tecnologia & Telecomunicações',
    keywords: ['televisao', 'televisor', 'smart tv', 'tv led', 'plasma', 'monitor tv'],
    examples: 'Smart TVs 32 a 75 polegadas, televisores 4K UHD, telas LED',
    daRate: 20,
    ivaRate: 16,
    iceRate: 0,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025, Posição 8528.72.00',
    unit: 'Unidade',
    notes: 'DA 20.00% e IVA 16.00%.',
    disambiguationQuestions: []
  },

  // --- CAPÍTULO 84: MÁQUINAS INDUSTRIAIS ---
  {
    shCode: '8418.69.00',
    fullCode: '8418.69.00.00',
    name: 'Máquinas Industriais para Fabrico de Gelo e Refrigeração',
    description: 'Máquinas e aparelhos para produção de gelo, instalações e câmaras frigoríficas industriais',
    category: 'Maquinaria & Equipamentos Industriais',
    group: 'Maquinaria & Equipamentos Industriais',
    keywords: ['maquina de gelo', 'maquina de fazer gelo', 'camara frigorifica', 'congelador industrial', 'equipamento frigorifico'],
    examples: 'Máquinas de gelo em cubo/escama 50kg a 500kg/dia, compressores frigoríficos',
    daRate: 5,
    ivaRate: 16,
    iceRate: 0,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025, Posição 8418.69.00; Bens de Equipamento',
    unit: 'Unidade',
    notes: 'Bens de Capital: DA 5.00%, IVA 16.00%.',
    disambiguationQuestions: []
  },
  {
    shCode: '8438.10.00',
    fullCode: '8438.10.00.00',
    name: 'Máquinas de Panificação, Fornos e Pastelaria Industrial',
    description: 'Máquinas e aparelhos para panificação, pastelaria, bolachas ou fabrico de massas alimentícias',
    category: 'Maquinaria & Equipamentos Industriais',
    group: 'Maquinaria & Equipamentos Industriais',
    keywords: ['forno industrial', 'amassadeira', 'maquina de padaria', 'panificacao', 'forno de pao', 'laminadora'],
    examples: 'Fornos rotativos de padaria, batedeiras industriais 20L a 60L, divisórias de pão',
    daRate: 5,
    ivaRate: 16,
    iceRate: 0,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025, Posição 8438.10.00',
    unit: 'Unidade',
    notes: 'DA 5.00% e IVA 16.00%. Fomento industrial.',
    disambiguationQuestions: []
  },

  // --- CAPÍTULO 30: MEDICAMENTOS E SAÚDE ---
  {
    shCode: '3004.90.00',
    fullCode: '3004.90.00.00',
    name: 'Medicamentos e Produtos Farmacêuticos Essenciais',
    description: 'Medicamentos constituídos por produtos misturados ou não misturados, para fins terapêuticos ou profilácticos',
    category: 'Saúde & Farmacêutica',
    group: 'Saúde & Farmacêutica',
    keywords: ['medicamentos', 'remedios', 'farmacos', 'antibiotico', 'analgesico', 'xarope'],
    examples: 'Antibióticos, paracetamol, antimaláricos, analgésicos, xaropes e soluções injetáveis',
    daRate: 0,
    ivaRate: 0,
    iceRate: 0,
    isExempt: true,
    exemptionBasis: 'Lei n.º 22/2022 Art. 9, n.º 1 alínea b) (Medicamentos e produtos farmacêuticos essenciais)',
    legalBasis: 'Lei n.º 8/2025, Posição 3004.90.00',
    unit: 'Unidade',
    notes: 'Isenção total de DA e IVA. Requer autorização de importação da ANARME.',
    disambiguationQuestions: []
  },

  // --- CAPÍTULO 94: MOBILIÁRIO ---
  {
    shCode: '9403.20.00',
    fullCode: '9403.20.00.00',
    name: 'Mobiliário de Escritório e Casa em Geral',
    description: 'Outro mobiliário de metal, madeira ou plástico para residências e escritórios',
    category: 'Mobiliário & Decoração',
    group: 'Mobiliário & Decoração',
    keywords: ['moveis', 'mobilia', 'secretaria metalica', 'estante metalica', 'cama de metal', 'cadeiras', 'sofas'],
    examples: 'Secretárias executivas, estantes de aço, armários de arquivo, camas e cadeiras ergonómicas',
    daRate: 20,
    ivaRate: 16,
    iceRate: 0,
    isExempt: false,
    legalBasis: 'Lei n.º 8/2025, Posição 9403.20.00',
    unit: 'Unidade',
    notes: 'DA 20.00% e IVA 16.00%.',
    disambiguationQuestions: []
  }
];

class TariffDatabaseService {
  /**
   * Pesquisa posições pautais por termo livre, código SH, nome ou descrição do item
   * Por padrão, se não houver pesquisa, devolve APENAS 5 ITENS de referência.
   * Ao pesquisar, busca exaustivamente pelo nome do item, descrição oficial, exemplos e código SH.
   */
  static search(query, category = null) {
    const cleanQuery = (query || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    // REGRA SOLICITADA: Apresentar apenas 5 por padrão quando não há pesquisa ativa
    if (!cleanQuery && !category) {
      return MOZAMBIQUE_TARIFF_ITEMS.slice(0, 5);
    }

    const matches = MOZAMBIQUE_TARIFF_ITEMS.filter((item) => {
      // Correspondência por categoria se especificada
      if (category) {
        const itemCat = ((item.category || '') + ' ' + (item.group || ''))
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const targetCat = category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!itemCat.includes(targetCat)) {
          return false;
        }
      }

      if (!cleanQuery) return true;

      // 1. Pesquisa por Código SH
      const shClean = (item.shCode || '').toLowerCase().replace(/[^0-9]/g, '');
      const queryDigits = cleanQuery.replace(/[^0-9]/g, '');
      if (queryDigits.length >= 2 && shClean.includes(queryDigits)) {
        return true;
      }
      if ((item.shCode || '').toLowerCase().includes(cleanQuery)) {
        return true;
      }

      // 2. Pesquisa pelo Nome Comercial do Item (relação com nome do item)
      const nameClean = (item.name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (nameClean.includes(cleanQuery)) {
        return true;
      }

      // 3. Pesquisa pela Descrição Oficial da Pauta Aduaneira
      const descClean = (item.description || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (descClean.includes(cleanQuery)) {
        return true;
      }

      // 4. Pesquisa pelos Exemplos Práticos de Mercadorias
      const examplesClean = (item.examples || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (examplesClean.includes(cleanQuery)) {
        return true;
      }

      // 5. Pesquisa pelas Palavras-Chave (Keywords)
      if (item.keywords && item.keywords.some(k => {
        const kClean = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return kClean.includes(cleanQuery) || cleanQuery.includes(kClean);
      })) {
        return true;
      }

      // 6. Pesquisa pela Categoria e Notas Legais
      const notesClean = ((item.category || '') + ' ' + (item.notes || '') + ' ' + (item.exemptionBasis || ''))
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (notesClean.includes(cleanQuery)) {
        return true;
      }

      // 7. Pesquisa combinada de termos múltiplos (ex: "bomba agua", "painel solar", "fardo roupa", "calcado sapato")
      const words = cleanQuery.split(/\s+/).filter(w => w.length > 1);
      if (words.length > 1) {
        const combinedText = [
          item.name || '',
          item.description || '',
          item.examples || '',
          (item.keywords || []).join(' '),
          item.shCode || '',
          item.category || '',
          item.notes || ''
        ].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        if (words.every(word => combinedText.includes(word))) {
          return true;
        }
      }

      return false;
    });

    return matches;
  }

  /**
   * Obtém detalhes de um código pautal específico
   */
  static getByShCode(shCode) {
    const clean = (shCode || '').replace(/[^0-9]/g, '');
    return MOZAMBIQUE_TARIFF_ITEMS.find((item) => {
      const itemClean = item.shCode.replace(/[^0-9]/g, '');
      return itemClean === clean || itemClean.startsWith(clean) || clean.startsWith(itemClean);
    }) || null;
  }

  /**
   * Obter todas as categorias disponíveis
   */
  static getCategories() {
    return Array.from(new Set(MOZAMBIQUE_TARIFF_ITEMS.map(i => i.category)));
  }

  /**
   * Obter metadados da versão oficial da pauta
   */
  static getMetadata() {
    return {
      ...TARIFF_DATABASE_VERSION,
      totalPositionsIndexed: MOZAMBIQUE_TARIFF_ITEMS.length
    };
  }
}

export default TariffDatabaseService;
