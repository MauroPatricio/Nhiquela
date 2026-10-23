// ProductClassificationService.js
// Motor Inteligente de Classificação Pautal Assistida (Moçambique)
// Aplica as Regras Gerais de Interpretação (RGI 1 a 6) da Nomenclatura do Sistema Harmonizado

import TariffDatabaseService, { MOZAMBIQUE_TARIFF_ITEMS, TARIFF_DATABASE_VERSION } from './TariffDatabaseService.js';

class ProductClassificationService {
  /**
   * Normaliza o texto para pesquisa e comparação de atributos
   */
  static normalizeText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Executa a classificação assistida a partir dos dados do produto
   * @param {Object} productData
   * @returns {Object} Resultado da classificação com códigos candidatos e fundamentação
   */
  static classify(productData = {}) {
    const {
      productName = '',
      productDescription = '',
      category = '',
      material = '',
      functionUse = '',
      technicalSpecs = '',
      condition = 'new' // 'new' | 'used'
    } = productData;

    const normalizedName = this.normalizeText(productName);
    const normalizedDesc = this.normalizeText(productDescription);
    const nameAndDescText = `${normalizedName} ${normalizedDesc}`.trim();

    // Stopwords que não definem mercadorias
    const stopwords = new Set([
      'para', 'com', 'sem', 'que', 'uma', 'uns', 'umas', 'dos', 'das', 'por', 'sob',
      'sobre', 'tipo', 'uso', 'alta', 'baixo', 'novo', 'nova', 'este', 'esta', 'esse',
      'bom', 'boa', 'muito', 'mais', 'menos', 'outros', 'outras'
    ]);

    // Tokens estritamente do NOME e DESCRIÇÃO do produto informado pelo cliente
    const productTokens = nameAndDescText
      .split(' ')
      .filter(t => t.length > 2 && !stopwords.has(t));

    if (productTokens.length === 0 && !normalizedName) {
      return {
        status: 'unresolved',
        confidenceScore: 0,
        candidates: [],
        disambiguationQuestions: [],
        message: 'Informação insuficiente para determinar a classificação pautal.',
        version: TARIFF_DATABASE_VERSION
      };
    }

    // Avaliação de cada item da pauta com correspondência LIKE estrita no nome e descrição
    const scoredCandidates = MOZAMBIQUE_TARIFF_ITEMS.map((item) => {
      let score = 0;
      const matchReasons = [];

      const normalizedItemName = this.normalizeText(item.name || '');
      const normalizedItemDesc = this.normalizeText(item.description || '');
      const normalizedItemExamples = this.normalizeText(item.examples || '');
      const normalizedCategory = this.normalizeText(item.category || '');
      const combinedTarget = `${normalizedItemName} ${normalizedItemDesc} ${normalizedItemExamples} ${(item.keywords || []).map(k => this.normalizeText(k)).join(' ')}`;

      // 1. LIKE direto entre Nome Comercial / Descrição do cliente e o item pautal
      let hasDirectNameMatch = false;
      if (normalizedName.length >= 3 && (normalizedItemName.includes(normalizedName) || normalizedName.includes(normalizedItemName))) {
        score += 65;
        hasDirectNameMatch = true;
        matchReasons.push(`Correspondência direta com a designação: "${item.name}"`);
      }

      // 2. Correspondência com Palavras-Chave Técnicas (Keywords)
      let hasKeywordMatch = false;
      for (const kw of item.keywords || []) {
        const normKw = this.normalizeText(kw);
        if (normKw && (normalizedName.includes(normKw) || normalizedDesc.includes(normKw))) {
          score += 45;
          hasKeywordMatch = true;
          matchReasons.push(`Correspondência com termo técnico: "${kw}"`);
          break;
        }
      }

      // 3. Correspondência de tokens individuais (LIKE por palavra do nome ou descrição)
      let matchedTokensCount = 0;
      for (const token of productTokens) {
        if (combinedTarget.includes(token)) {
          score += 15;
          matchedTokensCount++;
        }
      }

      if (matchedTokensCount > 0) {
        matchReasons.push(`Corresponde a ${matchedTokensCount} termos descritivos da pauta`);
      }

      // 4. Verificação de Código SH se o cliente indicou números no nome/descrição
      const digitsInInput = nameAndDescText.replace(/[^0-9]/g, '');
      const itemShDigits = (item.shCode || '').replace(/[^0-9]/g, '');
      let hasShMatch = false;
      if (digitsInInput.length >= 4 && itemShDigits.includes(digitsInInput)) {
        score += 55;
        hasShMatch = true;
        matchReasons.push(`Correspondência com código SH: ${item.shCode}`);
      }

      // FILTRO MANDATÓRIO: Apenas considerar se houver correspondência REAL no Nome ou Descrição
      const hasNameOrDescMatch = hasDirectNameMatch || hasKeywordMatch || matchedTokensCount >= 1 || hasShMatch;

      if (!hasNameOrDescMatch) {
        // Sem LIKE no nome/descrição, não é candidato válido (evita tratores quando busca bombas)
        return {
          shCode: item.shCode,
          score: 0,
          hasNameOrDescMatch: false,
          disambiguationQuestions: []
        };
      }

      // 5. Bónus de Afinidade de Categoria (Apenas atribuído se JÁ HOUVER correspondência no nome/descrição)
      if (category && normalizedCategory.includes(this.normalizeText(category))) {
        score += 15;
        matchReasons.push(`Afinidade de categoria: "${item.category}"`);
      }

      // 6. Regra específica para artigos usados
      if (condition === 'used') {
        if (item.shCode.startsWith('6309') || item.description.toLowerCase().includes('usados')) {
          score += 25;
          matchReasons.push('Aplicação da regra de mercadorias usadas');
        }
      }

      return {
        shCode: item.shCode,
        fullCode: item.fullCode,
        name: item.name,
        description: item.description,
        category: item.category,
        daRate: item.daRate,
        ivaRate: item.ivaRate,
        iceRate: item.iceRate,
        isExempt: item.isExempt,
        exemptionBasis: item.exemptionBasis,
        legalBasis: item.legalBasis,
        unit: item.unit,
        notes: item.notes,
        examples: item.examples,
        score,
        hasNameOrDescMatch: true,
        matchReasons,
        disambiguationQuestions: item.disambiguationQuestions || []
      };
    });

    // Filtra estritamente os que têm LIKE no nome/descrição e pontuação relevante
    const validCandidates = scoredCandidates
      .filter(c => c.hasNameOrDescMatch && c.score >= 25)
      .sort((a, b) => b.score - a.score);

    if (validCandidates.length === 0) {
      return {
        status: 'unresolved',
        confidenceScore: 0,
        candidates: [],
        disambiguationQuestions: [],
        message: 'Não foi possível encontrar uma correspondência segura na nomenclatura oficial. O pedido será encaminhado para validação por um despachante aduaneiro.',
        version: TARIFF_DATABASE_VERSION
      };
    }

    const topCandidate = validCandidates[0];
    const topScore = topCandidate.score;

    // Se existirem múltiplos candidatos com pontuações muito próximas (ambiguidade)
    const competingCandidates = validCandidates.filter(c => c.score >= topScore * 0.75);

    let status = 'candidate';
    let disambiguationQuestions = [];

    // Inclui sempre as perguntas técnicas específicas do candidato principal
    if (topCandidate.disambiguationQuestions && topCandidate.disambiguationQuestions.length > 0) {
      disambiguationQuestions.push(...topCandidate.disambiguationQuestions);
    }

    if (competingCandidates.length > 1) {
      status = 'needs_more_info';
      // Recolhe as perguntas de desambiguação dos candidatos concorrentes
      competingCandidates.forEach(c => {
        if (c.disambiguationQuestions && c.disambiguationQuestions.length > 0) {
          c.disambiguationQuestions.forEach(q => {
            if (!disambiguationQuestions.some(dq => dq.question === q.question)) {
              disambiguationQuestions.push(q);
            }
          });
        }
      });

      // Se não houver perguntas específicas, gera uma de diferenciação
      if (disambiguationQuestions.length === 0) {
        disambiguationQuestions.push({
          question: 'Identificámos mais do que uma posição pautal para este produto. Selecione a opção que melhor descreve a sua mercadoria:',
          options: competingCandidates.slice(0, 3).map(c => `${c.shCode} — ${c.description.substring(0, 70)}...`)
        });
      }
    } else if (disambiguationQuestions.length > 0) {
      status = 'needs_more_info';
    } else if (topScore >= 60) {
      status = 'candidate';
    } else {
      status = 'pending_review';
    }

    // Candidatos alternativos: estritamente próximos do top candidate (mesmo capítulo pautal ou forte afinidade semântica)
    const topChapter = (topCandidate.shCode || '').substring(0, 2);
    const relevantCandidates = validCandidates
      .filter(c => {
        if (c.shCode === topCandidate.shCode) return true;
        // Pelo menos 40% da pontuação do topo e pontuação mínima de 35
        if (c.score < Math.max(35, topScore * 0.40)) return false;
        // Deve ser do mesmo capítulo do SH OU compartilhar termo técnico direto
        const cChapter = (c.shCode || '').substring(0, 2);
        return cChapter === topChapter || c.score >= topScore * 0.65;
      })
      .slice(0, 3);

    return {
      status, // 'candidate' | 'needs_more_info' | 'pending_review' | 'validated' | 'unresolved'
      confidenceScore: Math.min(100, Math.round(topScore)),
      topCandidate,
      candidates: relevantCandidates,
      competingCount: competingCandidates.length,
      disambiguationQuestions,
      legalRule: 'RGI 1 — A classificação é determinada pelas posições e notas de secção ou capítulo',
      version: TARIFF_DATABASE_VERSION,
      timestamp: new Date().toISOString()
    };
  }
}

export default ProductClassificationService;
