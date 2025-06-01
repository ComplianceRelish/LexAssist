/**
 * Citation parser for extracting and processing legal citations
 * from various document types
 */

/**
 * Extract citations from legal text
 * @param {string} text Document text to parse
 * @param {string} documentType Type of legal document
 * @returns {Array} Extracted citations with metadata
 */
async function extractCitations(text, documentType) {
  // Determine appropriate parser based on document type
  const parser = getParserForDocumentType(documentType);
  
  // Extract citations using the selected parser
  return parser(text);
}

/**
 * Get appropriate citation parser for document type
 * @param {string} documentType Type of legal document
 * @returns {Function} Citation parser function
 */
function getParserForDocumentType(documentType) {
  const docType = documentType.toLowerCase();
  
  if (docType === 'case_law' || docType === 'judgment') {
    return parseCaseLawCitations;
  } else if (docType === 'statute' || docType === 'legislation') {
    return parseStatuteCitations;
  } else if (docType === 'contract' || docType === 'agreement') {
    return parseContractCitations;
  } else {
    // Default to general parser
    return parseGeneralCitations;
  }
}

/**
 * Parse citations from case law documents
 * @param {string} text Case law document text
 * @returns {Array} Extracted citations
 */
function parseCaseLawCitations(text) {
  const citations = [];
  
  // Case citations in the format "Party v. Party, Citation"
  const caseRegex = /([A-Za-z\s\.]+)\s+v\.?\s+([A-Za-z\s\.]+),?\s+(\(?\d{4}\)?\s+\d+\s+[A-Za-z]+\s+\d+)/g;
  let match;
  
  while ((match = caseRegex.exec(text)) !== null) {
    const citation = {
      text: match[0],
      parties: `${match[1]} v. ${match[2]}`,
      targetCitation: match[3],
      type: 'case',
      context: extractContext(text, match.index, 150)
    };
    
    citations.push(citation);
  }
  
  // AIR citations format
  const airRegex = /(AIR\s+\d{4}\s+[A-Za-z]+\s+\d+)/g;
  while ((match = airRegex.exec(text)) !== null) {
    // Skip if already part of a longer citation
    if (!isSubsumedInExistingCitation(citations, match.index)) {
      citations.push({
        text: match[0],
        targetCitation: match[1],
        type: 'case',
        context: extractContext(text, match.index, 150)
      });
    }
  }
  
  // SCC citations
  const sccRegex = /(\(\d{4}\)\s+\d+\s+SCC\s+\d+)/g;
  while ((match = sccRegex.exec(text)) !== null) {
    if (!isSubsumedInExistingCitation(citations, match.index)) {
      citations.push({
        text: match[0],
        targetCitation: match[1],
        type: 'case',
        context: extractContext(text, match.index, 150)
      });
    }
  }
  
  return citations;
}

/**
 * Parse citations from statute documents
 * @param {string} text Statute document text
 * @returns {Array} Extracted citations
 */
function parseStatuteCitations(text) {
  const citations = [];
  
  // Act citations (e.g., "The Companies Act, 2013")
  const actRegex = /(the\s+)?([A-Za-z\s]+Act,?\s+(\d{4}))/gi;
  let match;
  
  while ((match = actRegex.exec(text)) !== null) {
    // Skip common false positives
    if (match[2].toLowerCase().includes('this act') || 
        match[2].toLowerCase().includes('said act') ||
        match[2].toLowerCase().includes('the act')) {
      continue;
    }
    
    citations.push({
      text: match[0],
      targetCitation: match[2],
      year: match[3],
      type: 'statute',
      context: extractContext(text, match.index, 150)
    });
  }
  
  // Section citations (e.g., "Section 123 of the Act")
  const sectionRegex = /section\s+(\d+(?:\([a-z]\))?)\s+of\s+the\s+([A-Za-z\s]+Act,?\s+\d{4})/gi;
  while ((match = sectionRegex.exec(text)) !== null) {
    citations.push({
      text: match[0],
      section: match[1],
      targetCitation: match[2],
      type: 'statute_section',
      context: extractContext(text, match.index, 150)
    });
  }
  
  return citations;
}

/**
 * Parse citations from contracts and agreements
 * @param {string} text Contract document text
 * @returns {Array} Extracted citations
 */
function parseContractCitations(text) {
  const citations = [];
  
  // References to other legal documents within contracts
  const legalDocRegex = /(as\s+per|as\s+defined\s+in|pursuant\s+to|in\s+accordance\s+with|as\s+stated\s+in)\s+([^,.;]+)/gi;
  let match;
  
  while ((match = legalDocRegex.exec(text)) !== null) {
    // Filter out common false positives
    if (match[2].toLowerCase().includes('this agreement') || 
        match[2].toLowerCase().includes('herein') ||
        match[2].toLowerCase().match(/clause\s+\d+/)) {
      continue;
    }
    
    citations.push({
      text: match[0],
      referenceType: match[1],
      targetCitation: match[2].trim(),
      type: 'document_reference',
      context: extractContext(text, match.index, 150)
    });
  }
  
  // References to clauses within the contract
  const clauseRegex = /(clause|section|article)\s+(\d+(?:\.\d+)*)\s+(?:of|hereof)/gi;
  while ((match = clauseRegex.exec(text)) !== null) {
    citations.push({
      text: match[0],
      clause: match[2],
      type: 'internal_reference',
      context: extractContext(text, match.index, 150)
    });
  }
  
  return citations;
}

/**
 * Parse general legal citations from any document type
 * @param {string} text Document text
 * @returns {Array} Extracted citations
 */
function parseGeneralCitations(text) {
  // Combine patterns from other parsers for general citation extraction
  const caseCitations = parseCaseLawCitations(text);
  const statuteCitations = parseStatuteCitations(text);
  
  return [...caseCitations, ...statuteCitations];
}

/**
 * Extract context around a citation
 * @param {string} text Full document text
 * @param {number} position Position of the citation
 * @param {number} radius Character radius around citation
 * @returns {string} Context text
 */
function extractContext(text, position, radius) {
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);
  
  return text.substring(start, end).trim();
}

/**
 * Check if citation is part of a longer, already captured citation
 * @param {Array} existingCitations Previously captured citations
 * @param {number} position Position of the new citation
 * @returns {boolean} Whether this citation is already captured
 */
function isSubsumedInExistingCitation(existingCitations, position) {
  for (const citation of existingCitations) {
    // If this position is within the span of an existing citation text
    if (citation.position && 
        position >= citation.position && 
        position < citation.position + citation.text.length) {
      return true;
    }
  }
  
  return false;
}

module.exports = {
  extractCitations
};
