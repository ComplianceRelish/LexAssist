/**
 * Specialized chunking strategy for statutes and legislation
 * Preserves legislative structure and section numbering
 */
const strategy = {
  chunkSize: 1200,
  overlapSize: 250,
  preserveSections: true,
  
  // Specialized section detectors for statutes
  sectionDetectors: [
    // Act title
    {
      pattern: /^(THE\s+.+ACT,\s+\d{4})$/i,
      level: 1,
      type: 'act_title',
      titleGroup: 1
    },
    // Chapter titles
    {
      pattern: /^CHAPTER\s+([IVX]+|[0-9]+)\.?\s+(.+)$/i,
      level: 2,
      type: 'chapter',
      titleGroup: 2
    },
    // Part headings
    {
      pattern: /^PART\s+([IVX]+|[0-9]+)\.?\s+(.+)$/i,
      level: 3,
      type: 'part',
      titleGroup: 2
    },
    // Sections (the core unit of legislation)
    {
      pattern: /^(?:Section|Sec\.|§)\s*(\d+[A-Z]?)\.?\s+(.+)$/i,
      level: 4,
      type: 'section',
      titleGroup: 2
    },
    // Sub-sections typically numbered with parentheses
    {
      pattern: /^\((\d+)\)\s+(.+)$/,
      level: 5,
      type: 'subsection',
      titleGroup: 2
    },
    // Clauses typically lettered
    {
      pattern: /^\(([a-z]|[iv]+)\)\s+(.+)$/,
      level: 6,
      type: 'clause',
      titleGroup: 2
    },
    // Sub-clauses with roman numerals or other formats
    {
      pattern: /^\(([ivx]+|[A-Z])\)\s+(.+)$/i,
      level: 7,
      type: 'subclause',
      titleGroup: 2
    },
    // Explanations and provisos
    {
      pattern: /^(Explanation|Proviso):?\s+(.+)$/i,
      level: 5,
      type: 'explanation',
      titleGroup: 2
    },
    // Definitions section
    {
      pattern: /^(?:DEFINITIONS|INTERPRETATION)$/i,
      level: 3,
      type: 'definitions',
      titleGroup: 0
    },
    // Schedule headings
    {
      pattern: /^(?:SCHEDULE|APPENDIX)\s+([IVX]+|[0-9]+)$/i,
      level: 3,
      type: 'schedule',
      titleGroup: 0
    }
  ],

  // Special handling functions for statutory texts
  specialHandling: {
    // Ensure sections are preserved intact when possible
    preserveSections: true,
    
    // Keep subsections with their parent sections
    keepSubsectionsWithParents: true,
    
    // Preserve defined terms in definitions section
    preserveDefinitions: true,
    
    // Ensure explanations stay with their referenced provisions
    preserveExplanations: true,
    
    // Special chunking rules for section types
    sectionTypeRules: {
      'act_title': { maxChunkSize: 500, standalone: true },
      'chapter': { maxChunkSize: 500, standalone: true },
      'part': { maxChunkSize: 500, standalone: true },
      'section': { maxChunkSize: 1000, standalone: true },
      'subsection': { maxChunkSize: 800, standalone: false },
      'definitions': { maxChunkSize: 1500, standalone: false },
      'schedule': { maxChunkSize: 2000, standalone: true }
    }
  }
};

module.exports = { strategy };
