// js/utils/venture-extractors.js
// Helpers that derive venture-level fields (Institution, Technology Description,
// Technology Domain) from the AI-extracted company JSON and the input URL.
// Pure functions — no DOM access, no global state writes.

const VentureExtractors = {
  /**
   * Try to identify the source institution. Strategy:
   *   1. Match the venture URL against a known-domain map.
   *   2. If candidate list provided, scan team affiliations and downstream_summary
   *      for a case-insensitive substring match.
   * Returns the canonical candidate string, or '' if no match.
   *
   * @param {string} url - Venture URL (may be empty for file-only runs)
   * @param {Object} companyData - The AI-extracted company JSON (full output)
   * @param {string[]} candidates - Allowed institution names for the venture's portfolio
   * @returns {string}
   */
  detectInstitution(url, companyData, candidates) {
    if (!Array.isArray(candidates) || candidates.length === 0) return '';

    const candidateMap = new Map(candidates.map(c => [c.toLowerCase(), c]));
    const URL_DOMAIN_MAP = {
      'uky.edu': 'UKY',
      'vanderbilt.edu': 'Vandy',
      'louisville.edu': 'UoL',
      'utk.edu': 'UTK',
      'ucf.edu': 'UCF',
      'ufl.edu': 'UF',
      'usf.edu': 'USF',
      'erau.edu': 'Embry Riddle'
    };

    if (url) {
      const lower = url.toLowerCase();
      for (const [domain, name] of Object.entries(URL_DOMAIN_MAP)) {
        if (lower.includes(domain) && candidateMap.has(name.toLowerCase())) {
          return candidateMap.get(name.toLowerCase());
        }
      }
    }

    if (companyData && typeof companyData === 'object') {
      const haystack = [
        companyData.company_overview?.downstream_summary || '',
        companyData.company_overview?.detailed_description || '',
        companyData.company_overview?.headquarters || '',
        ...(companyData.team?.founders || []).map(f => `${f.background || ''} ${f.title || ''}`)
      ].join(' ').toLowerCase();

      if (haystack) {
        for (const c of candidates) {
          if (haystack.includes(c.toLowerCase())) return c;
        }
      }
    }

    return '';
  },

  /**
   * Pick the best free-text technology description from the company JSON.
   * Falls back through the most-specific to least-specific fields.
   * @param {Object} companyData
   * @returns {string}
   */
  deriveTechnologyDescription(companyData) {
    if (!companyData || typeof companyData !== 'object') return '';
    const tech = companyData.technology?.core_technology;
    if (typeof tech === 'string' && tech.trim()) return tech.trim();
    const detailed = companyData.company_overview?.detailed_description;
    if (typeof detailed === 'string' && detailed.trim()) return detailed.trim();
    const summary = companyData.company_overview?.downstream_summary;
    if (typeof summary === 'string' && summary.trim()) return summary.trim().slice(0, 500);
    const oneLiner = companyData.company_overview?.one_liner;
    if (typeof oneLiner === 'string' && oneLiner.trim()) return oneLiner.trim();
    return '';
  },

  /**
   * Extract the AI-classified technology domain. Returns '' if missing or 'unknown'.
   * Schema location is at `company_overview.technology_domain` (see Venture Info
   * agent prompt + schema). Tolerant of either top-level or nested placement
   * for forward/backward compatibility.
   * @param {Object} companyData
   * @returns {string}
   */
  extractTechnologyDomain(companyData) {
    if (!companyData || typeof companyData !== 'object') return '';
    const candidates = [
      companyData.company_overview?.technology_domain,
      companyData.technology?.technology_domain,
      companyData.technology_domain
    ];
    for (const v of candidates) {
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed && trimmed.toLowerCase() !== 'unknown') return trimmed;
      }
    }
    return '';
  }
};

window.VentureExtractors = VentureExtractors;
