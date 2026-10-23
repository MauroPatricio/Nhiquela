// pautaAduaneiraData.js
// Tabela Oficial de Classificação Pautal, Direitos Aduaneiros (DA), IVA e ICE (Moçambique)
// Baseado na Lei n.º 17/2022 (Pauta Aduaneira), Lei n.º 22/2022 (IVA) e Lei n.º 19/2022 / Lei n.º 7/2025 (ICE)

export const PAUTA_CATEGORIES = [
  // --- ITENS OFICIAIS IDENTIFICADOS ---
  {
    id: 'phones_wired_wireless',
    group: 'Tecnologia & Telecomunicações',
    shCode: '85171100',
    name: 'Aparelhos telefónicos por fio com unidade auscultador-microfone sem fio',
    daRate: 7.5,
    ivaRate: 16,
    iceRate: 0,
    validFrom: '16/03/2011',
    validTo: '31/12/2050',
    taxType: 'Específico',
    exemptNotes: 'Regime Geral Telecomunicações: DA 7.50% e IVA 16.00%.',
    examples: 'Telefones sem fio DECT, Panasonic, telefones fixos de secretária com auscultador sem fio'
  },
  {
    id: 'musical_pianos_instruments',
    group: 'Instrumentos Musicais & Som',
    shCode: '9207.10',
    name: 'Pianos, incluindo os automáticos; cravos e outros instrumentos musicais',
    daRate: 20,
    ivaRate: 16,
    iceRate: 0,
    validFrom: '16/03/2011',
    validTo: '31/12/2050',
    taxType: 'Específico',
    exemptNotes: 'Instrumentos musicais: DA 20.00% e IVA 16.00%.',
    examples: 'Pianos acústicos e digitais, cravos, teclados e sintetizadores'
  },

  // --- ISENÇÕES LEI 22/2022 (AGRÍCOLA / ENERGIA SOLAR / INSUMOS) ---
  {
    id: 'solar_energy',
    group: 'Energia Solar & Renovável',
    shCode: '8541.43.00 / Anexo IV',
    name: 'Painéis Solares, Inversores e Equipamentos Fotovoltaicos',
    daRate: 0,
    ivaRate: 0, // Isento Lei 22/2022 Anexo IV
    iceRate: 0,
    exemptNotes: 'Isenção total de IVA (Lei 22/2022 Anexo IV) e Direitos Aduaneiros livres.',
    examples: 'Painéis solares, células fotovoltaicas, estruturas de fixação, bombas solares'
  },
  {
    id: 'agri_machinery',
    group: 'Agricultura & Pecuária',
    shCode: '8432 / 8433 / 8436 / 8701',
    name: 'Tratores, Máquinas e Alfaias Agrícolas',
    daRate: 0,
    ivaRate: 0, // Isento Lei 22/2022 Anexo I
    iceRate: 0,
    exemptNotes: 'Isenção de IVA (Lei 22/2022 Anexo I). Taxa aduaneira 0% ou 5% reduzida.',
    examples: 'Tratores, arados, semeadores, colheitadeiras, debulhadoras, chocadeiras'
  },
  {
    id: 'agri_inputs',
    group: 'Agricultura & Pecuária',
    shCode: '3101 - 3105 / 3808 / 0701',
    name: 'Adubos, Fertilizantes, Sementes e Defensivos Agrícolas',
    daRate: 0,
    ivaRate: 0, // Isento Lei 22/2022 Anexo I
    iceRate: 0,
    exemptNotes: 'Isenção de IVA (Lei 22/2022 Anexo I - Sementes certificadas e fertilizantes).',
    examples: 'Ureia, NPK, sulfato de amónio, sementes de hortícolas, inseticidas agrícolas'
  },
  {
    id: 'irrigation_pumps',
    group: 'Agricultura & Pecuária',
    shCode: '8413.20 / 8413.81',
    name: 'Bombas de Água e Equipamentos de Rega',
    daRate: 5,
    ivaRate: 0, // Isento Lei 22/2022 Anexo I
    iceRate: 0,
    exemptNotes: 'Isento de IVA conforme alínea h) do n.º 12 do Art. 9.',
    examples: 'Bombas submersíveis, motobombas diesel/elétricas, canhões de rega'
  },

  // --- MÁQUINAS INDUSTRIAIS E COMERCIAIS ---
  {
    id: 'commercial_machinery',
    group: 'Maquinaria & Equipamentos Industriais',
    shCode: '8418.69 / 8438 / 8421',
    name: 'Máquinas Industriais e Comerciais (Gelo, Panificação, etc.)',
    daRate: 5,
    ivaRate: 16,
    iceRate: 0,
    exemptNotes: 'Bens de Capital: Taxa Pautal de 5% e IVA geral de 16%.',
    examples: 'Máquinas de gelo 50-500kg, fornos industriais, misturadores, embaladoras'
  },
  {
    id: 'generators_power',
    group: 'Maquinaria & Equipamentos Industriais',
    shCode: '8501.61 / 8502.11',
    name: 'Geradores Elétricos e Grupos Eletrogéneos (Diesel/Gasolina)',
    daRate: 5,
    ivaRate: 0, // Isento até 75 kVA Lei 22/2022 Anexo I
    iceRate: 0,
    exemptNotes: 'Geradores até 75 kVA isentos de IVA (Lei 22/2022). Direitos Pautais 5%.',
    examples: 'Geradores silenciosos, alternadores, geradores a diesel 5kVA a 75kVA'
  },
  {
    id: 'hand_power_tools',
    group: 'Ferramentas & Construção',
    shCode: '8201 / 8202 / 8467',
    name: 'Ferramentas Elétricas, Manuais e de Construção',
    daRate: 5,
    ivaRate: 16,
    iceRate: 0,
    exemptNotes: 'Ferramentas de trabalho e oficinas têm taxa pautal favorecida de 5%.',
    examples: 'Berbequins, rebarbadoras, serras circulares, jogos de chaves, soldadoras'
  },

  // --- TECNOLOGIA, INFORMÁTICA E ELETRÓNICOS ---
  {
    id: 'smartphones_smartwatch',
    group: 'Tecnologia & Telecomunicações',
    shCode: '8517.13.00 / 8517.62.20',
    name: 'Smartphones e Relógios Inteligentes (Smartwatches)',
    daRate: 7.5,
    ivaRate: 16,
    iceRate: 5, // ICE 5% (Lei 19/2022)
    exemptNotes: 'Sujeito a ICE de 5% conforme Código do ICE (Lei 19/2022).',
    examples: 'iPhones, Samsung Galaxy, Xiaomi, Apple Watch, Smartbands'
  },
  {
    id: 'computers_laptops',
    group: 'Tecnologia & Telecomunicações',
    shCode: '8471.30 / 8471.41',
    name: 'Computadores Portáteis, Desktops, Servidores e Tablets',
    daRate: 5,
    ivaRate: 16,
    iceRate: 0,
    exemptNotes: 'Equipamentos de informática: Direitos Pautais reduzidos a 5%.',
    examples: 'Laptops, computadores de escritório, tablets, impressoras, servidores'
  },
  {
    id: 'tvs_under_46',
    group: 'Eletrónica de Consumo & TV',
    shCode: '8528.72.10',
    name: 'Televisores até 46 Polegadas',
    daRate: 20,
    ivaRate: 16,
    iceRate: 0, // Livre de ICE conforme Lei 19/2022
    exemptNotes: 'Isento de ICE (dimensão ≤ 46 polegadas). Direitos Pautais de consumo 20%.',
    examples: 'Smart TVs LED 32", 40", 42", 43" polegadas'
  },
  {
    id: 'tvs_over_46',
    group: 'Eletrónica de Consumo & TV',
    shCode: '8528.72.90',
    name: 'Televisores Superiores a 46 Polegadas',
    daRate: 20,
    ivaRate: 16,
    iceRate: 5, // ICE 5% conforme Lei 19/2022
    exemptNotes: 'Sujeito a ICE de 5% (telas > 46 polegadas) + Direitos Pautais 20%.',
    examples: 'Smart TVs 50", 55", 65", 75", 85" polegadas'
  },
  {
    id: 'gaming_consoles',
    group: 'Eletrónica de Consumo & TV',
    shCode: '9504.50.00',
    name: 'Consolas de Videojogos e Acessórios',
    daRate: 20,
    ivaRate: 16,
    iceRate: 20, // ICE 20% conforme Lei 19/2022
    exemptNotes: 'Sujeito a ICE de 20% (jogos de vídeo) + Direitos Pautais 20%.',
    examples: 'PlayStation 5, Xbox Series X/S, Nintendo Switch, comandos'
  },

  // --- ELETRODOMÉSTICOS E CLIMATIZAÇÃO ---
  {
    id: 'appliances_refrigeration',
    group: 'Eletrodomésticos & Climatização',
    shCode: '8418.10 / 8415.10 / 8450',
    name: 'Frigoríficos, Ar Condicionado e Máquinas de Lavar',
    daRate: 20,
    ivaRate: 16,
    iceRate: 0,
    exemptNotes: 'Bens de Consumo Final: Taxa pautal de 20% e IVA de 16%.',
    examples: 'Aparelhos de ar condicionado split, geleiras, arcas congeladoras, máquinas de lavar'
  },
  {
    id: 'small_appliances',
    group: 'Eletrodomésticos & Climatização',
    shCode: '8516.40 / 8516.50 / 8516.79',
    name: 'Pequenos Eletrodomésticos (Micro-ondas, Ferros, Liquidificadores)',
    daRate: 20,
    ivaRate: 16,
    iceRate: 0,
    exemptNotes: 'Bens de consumo final: 20% DA + 16% IVA.',
    examples: 'Micro-ondas, fritadeiras elétricas (air fryer), ferros a vapor, cafeteiras'
  },

  // --- MODA, VESTUÁRIO E CALÇADO ---
  {
    id: 'clothing_apparel',
    group: 'Moda, Têxteis & Calçado',
    shCode: '6101 - 6117 / 6201 - 6217',
    name: 'Vestuário Geral, Roupas e Confecções Novas',
    daRate: 20,
    ivaRate: 16,
    iceRate: 0,
    exemptNotes: 'Pauta Aduaneira normal para vestuário e têxteis: 20%.',
    examples: 'Camisas, calças jeans, vestidos, fatos, casacos, roupa infantil'
  },
  {
    id: 'footwear_shoes',
    group: 'Moda, Têxteis & Calçado',
    shCode: '6401 - 6405',
    name: 'Calçado, Sapatilhas e Sapatos em Geral',
    daRate: 20,
    ivaRate: 16,
    iceRate: 0,
    exemptNotes: 'Calçado acabado: 20% DA + 16% IVA.',
    examples: 'Ténis desportivos, sapatos sociais, botas de segurança, sandálias'
  },

  // --- BELEZA, COSMÉTICA E PERFUMARIA ---
  {
    id: 'perfumes_fragrances',
    group: 'Cosméticos & Cuidados Pessoais',
    shCode: '3303.00.00',
    name: 'Perfumes e Águas-de-Colónia',
    daRate: 20,
    ivaRate: 16,
    iceRate: 20, // ICE 20% Lei 19/2022
    exemptNotes: 'Sujeito a ICE de 20% conforme Lei n.º 19/2022.',
    examples: 'Perfumes de marca, eau de parfum, colónias importadas'
  },
  {
    id: 'cosmetics_makeup',
    group: 'Cosméticos & Cuidados Pessoais',
    shCode: '3304.10 - 3304.99',
    name: 'Maquilhagem, Cremes e Cuidados da Pele',
    daRate: 20,
    ivaRate: 16,
    iceRate: 10, // ICE 10% Lei 19/2022
    exemptNotes: 'Sujeito a ICE de 10% (maquilhagem e cuidados da pele).',
    examples: 'Batom, sombras, base, cremes faciais, loções hidratantes'
  },
  {
    id: 'hair_wigs',
    group: 'Cosméticos & Cuidados Pessoais',
    shCode: '6704.11 / 6704.20',
    name: 'Perucas, Madeixas e Cabelo Humano/Sintético',
    daRate: 20,
    ivaRate: 16,
    iceRate: 10, // ICE 10% a 15% Lei 19/2022
    exemptNotes: 'Perucas completas sujeitas a ICE de 10% a 15%.',
    examples: 'Perucas lace front, madeixas de cabelo natural, extensões'
  },

  // --- VEÍCULOS E AUTOMÓVEIS (LEI 19/2022 E LEI 7/2025) ---
  {
    id: 'electric_vehicles',
    group: 'Automóveis & Veículos',
    shCode: '8703.80.10 / Lei 7/2025',
    name: 'Veículos Automóveis 100% Elétricos (Bateria até 62 kWh)',
    daRate: 5,
    ivaRate: 16,
    iceRate: 5, // ICE 5% Lei 7/2025
    exemptNotes: 'Incentivo Verde (Lei 7/2025): Taxa Pautal 5% e ICE reduzido a 5%.',
    examples: 'Nissan Leaf, BYD Dolphin, Renault Zoe, Tesla Model 3 standard'
  },
  {
    id: 'vehicles_under_1500',
    group: 'Automóveis & Veículos',
    shCode: '8703.21 / 8703.22',
    name: 'Veículos Ligeiros até 1500cc (Usados até 5 anos)',
    daRate: 20,
    ivaRate: 16,
    iceRate: 5, // ICE 5% Lei 19/2022
    exemptNotes: 'Cilindrada até 1500cc: ICE reduzido de 5% para veículos recentes.',
    examples: 'Toyota Vitz, Corolla Axio, Honda Fit, Mazda Demio, VW Polo'
  },
  {
    id: 'motorcycles_parts',
    group: 'Automóveis & Veículos',
    shCode: '8711.20 / 8708',
    name: 'Motociclos até 250cc e Peças Automóveis Sobressalentes',
    daRate: 7.5,
    ivaRate: 16,
    iceRate: 0,
    exemptNotes: 'Motociclos utilitários ≤ 250cc livres de ICE. Peças auto: 7.5%.',
    examples: 'Motos Haojue 125/150, pastilhas de travão, filtros, amortecedores'
  },

  // --- OUTROS BENS E DIVERSOS ---
  {
    id: 'general_goods',
    group: 'Bens Diversos & Outros',
    shCode: 'Padrão / Geral',
    name: 'Outros Produtos / Categoria Geral',
    daRate: 5,
    ivaRate: 16,
    iceRate: 0,
    exemptNotes: 'Padrão geral de importação para equipamentos e bens comuns.',
    examples: 'Outros bens industriais, comerciais e consumíveis'
  }
];

// Helper para obter os grupos únicos
export const PAUTA_GROUPS = Array.from(new Set(PAUTA_CATEGORIES.map(c => c.group)));

// Helper para buscar categoria por ID
export const getPautaCategoryById = (id) => {
  return PAUTA_CATEGORIES.find(c => c.id === id) || PAUTA_CATEGORIES[PAUTA_CATEGORIES.length - 1];
};

// Helper para busca de texto livre
export const searchPautaCategories = (searchTerm) => {
  if (!searchTerm || typeof searchTerm !== 'string') return PAUTA_CATEGORIES;
  const term = searchTerm.toLowerCase().trim();
  return PAUTA_CATEGORIES.filter(cat => 
    cat.name.toLowerCase().includes(term) ||
    cat.shCode.toLowerCase().includes(term) ||
    cat.examples.toLowerCase().includes(term) ||
    cat.group.toLowerCase().includes(term)
  );
};
