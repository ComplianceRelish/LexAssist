/**
 * Specialized chunking strategy for case law documents
 * Recognizes judgment structure and preserves legal reasoning
 */
const strategy = {
  chunkSize: 1500,
  overlapSize: 300,
  preserveSections: true,
  
  // Specialized section detectors for case law
  sectionDetectors: [
    // Case citation and parties
    {
      pattern: /^(.+)\s+v\.?\s+(.+)$/i,
      level: 1,
      type: 'case_title',
      titleGroup: 0
    },
    // Court and date information
    {
      pattern: /^(.*Court.*)\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i,
      level: 1,
      type: 'court_info',
      titleGroup: 0
    },
    // Bench/Judges information
    {
      pattern: /^(BEFORE|CORAM):?\s+(.+)$/i,
      level: 1,
      type: 'bench_info',
      titleGroup: 0
    },
    // Judgment/opinion section
    {
      pattern: /^(JUDGMENT|OPINION)(\s+OF\s+.+)?:?$/i,
      level: 1,
      type: 'judgment_main',
      titleGroup: 0
    },
    // Facts of the case
    {
      pattern: /^(FACTS|BACKGROUND)(\s+OF\s+THE\s+CASE)?:?$/i,
      level: 2,
      type: 'facts_section',
      titleGroup: 0
    },
    // Issues for consideration
    {
      pattern: /^(ISSUES?|QUESTIONS?|POINTS?)(\s+FOR\s+CONSIDERATION|\s+OF\s+LAW)?:?$/i,
      level: 2,
      type: 'issues_section',
      titleGroup: 0
    },
    // Analysis/reasoning sections
    {
      pattern: /^(ANALYSIS|REASONING|DISCUSSION)(\s+AND\s+FINDINGS)?:?$/i,
      level: 2,
      type: 'analysis_section',
      titleGroup: 0
    },
    // Conclusion/judgment
    {
      pattern: /^(CONCLUSION|DECISION|ORDER|JUDGMENT)(\s+OF\s+THE\s+COURT)?:?$/i,
      level: 2,
      type: 'conclusion_section',
      titleGroup: 0
    },
    // Main numbered sections (larger judgment structure)
    {
      pattern: /^(\d+)[\.)\]]\s+(.+)$/,
      level: 2,
      type: 'numbered_section',
      titleGroup: 2
    },
    // Paragraphs typically numbered in judgments
    {
      pattern: /^(?:Para|Paragraph)?\s*(\d+)[\.)\]]\s*(.+)?$/i,
      level: 3,
      type: 'paragraph',
      titleGroup: 0
    },
    // Detailed legal analysis often in sub-sections
    {
      pattern: /^\(([a-z]|[iv]+)\)\s+(.+)$/,
      level: 4,
      type: 'sub_point',
      titleGroup: 2
    }
  ],

  // Special handling functions for case law documents
  specialHandling: {
    // Handle citations differently - preserve citation blocks
    preserveCitations: true,
    
    // Preserve paragraph numbering (important for legal citations)
    preserveParagraphNumbers: true,
    
    // Ensure judge names and opinions are kept together
    preserveJudgeOpinions: true,
    
    // Handle dissenting opinions as separate sections
    handleDissentingOpinions: true,
    
    // Special chunking rules for section types
    sectionTypeRules: {
      'case_title': { maxChunkSize: 500, standalone: true },
      'court_info': { maxChunkSize: 500, standalone: false },
      'bench_info': { maxChunkSize: 500, standalone: false },
      'judgment_main': { maxChunkSize: 2000, standalone: false },
      'facts_section': { maxChunkSize: 2000, standalone: false },
      'issues_section': { maxChunkSize: 1000, standalone: true },
      'analysis_section': { maxChunkSize: 1500, standalone: false },
      'conclusion_section': { maxChunkSize: 1000, standalone: true }
    }
  }
};

module.exports = { strategy };
