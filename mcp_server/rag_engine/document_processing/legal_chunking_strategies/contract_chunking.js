/**
 * Specialized chunking strategy for contracts and agreements
 * Preserves clause structure and definitions
 */
const strategy = {
  chunkSize: 1000,
  overlapSize: 200,
  preserveSections: true,
  
  // Specialized section detectors for contracts
  sectionDetectors: [
    // Contract title
    {
      pattern: /^([A-Z\s]+AGREEMENT|CONTRACT|DEED)$/,
      level: 1,
      type: 'contract_title',
      titleGroup: 1
    },
    // Preamble/recitals intro
    {
      pattern: /^(WHEREAS|RECITALS|PREAMBLE)$/i,
      level: 2,
      type: 'preamble',
      titleGroup: 0
    },
    // Numbered articles or sections
    {
      pattern: /^(ARTICLE|SECTION)\s+(\d+|[IVX]+)\.?\s+(.+)$/i,
      level: 2,
      type: 'article',
      titleGroup: 3
    },
    // Clauses typically numbered
    {
      pattern: /^(\d+\.?\d*)\s+(.+)$/,
      level: 3,
      type: 'clause',
      titleGroup: 2
    },
    // Sub-clauses typically with decimal numbering or letters
    {
      pattern: /^(\d+\.?\d+)\s+(.+)$/,
      level: 4,
      type: 'subclause',
      titleGroup: 2
    },
    // Definitions section
    {
      pattern: /^(?:DEFINITIONS|INTERPRETATION)$/i,
      level: 2,
      type: 'definitions',
      titleGroup: 0
    },
    // Individual term definitions
    {
      pattern: /^["'](.+)["']\s+means\s+(.+)$/i,
      level: 3,
      type: 'definition',
      titleGroup: 0
    },
    // Representations and warranties
    {
      pattern: /^(REPRESENTATIONS?\s+AND\s+WARRANTIES?)$/i,
      level: 2,
      type: 'representations',
      titleGroup: 1
    },
    // Term and termination
    {
      pattern: /^(TERM\s+AND\s+TERMINATION)$/i,
      level: 2,
      type: 'term_termination',
      titleGroup: 1
    },
    // Force majeure
    {
      pattern: /^(FORCE\s+MAJEURE)$/i,
      level: 2,
      type: 'force_majeure',
      titleGroup: 1
    },
    // Governing law
    {
      pattern: /^(GOVERNING\s+LAW|APPLICABLE\s+LAW|JURISDICTION)$/i,
      level: 2,
      type: 'governing_law',
      titleGroup: 1
    },
    // Schedules and annexures
    {
      pattern: /^(SCHEDULE|ANNEXURE|APPENDIX)\s+([0-9]+|[A-Z])$/i,
      level: 2,
      type: 'schedule',
      titleGroup: 0
    }
  ],

  // Special handling functions for contracts
  specialHandling: {
    // Keep definitions together
    preserveDefinitions: true,
    
    // Ensure clauses that reference other clauses maintain context
    preserveClauseReferences: true,
    
    // Special treatment for boilerplate clauses
    preserveBoilerplate: true,
    
    // Special chunking rules for section types
    sectionTypeRules: {
      'contract_title': { maxChunkSize: 500, standalone: true },
      'preamble': { maxChunkSize: 1000, standalone: true },
      'article': { maxChunkSize: 500, standalone: true },
      'clause': { maxChunkSize: 800, standalone: false },
      'definitions': { maxChunkSize: 1500, standalone: false },
      'representations': { maxChunkSize: 1200, standalone: false },
      'governing_law': { maxChunkSize: 800, standalone: false },
      'schedule': { maxChunkSize: 1500, standalone: true }
    }
  }
};

module.exports = { strategy };
