/**
 * Citation formatter for standardizing legal citations across different
 * legal systems and document types
 */

/**
 * Format citations from retrieved documents into standardized format
 * @param {Array} documents Retrieved documents with metadata
 * @returns {Object} Mapping of document IDs to formatted citations
 */
function formatCitations(documents) {
  const citationMap = {};
  
  for (const doc of documents) {
    const { document } = doc;
    const formattedCitation = formatSingleCitation(document);
    citationMap[document.id] = formattedCitation;
  }
  
  return citationMap;
}

/**
 * Format a single document citation based on its type and metadata
 * @param {Object} document Document metadata
 * @returns {string} Formatted citation
 */
function formatSingleCitation(document) {
  const {
    title,
    citation,
    documentType,
    jurisdiction,
    publishedDate
  } = document;
  
  // If document has a formal citation, use it
  if (citation) {
    return citation;
  }
  
  // Otherwise, build citation based on document type
  const docType = (documentType || '').toLowerCase();
  
  if (docType === 'case_law' || docType === 'judgment') {
    return formatCaseLawCitation(document);
  } else if (docType === 'statute' || docType === 'legislation') {
    return formatStatuteCitation(document);
  } else if (docType === 'contract' || docType === 'agreement') {
    return formatContractCitation(document);
  } else {
    // Generic citation format for other document types
    const year = extractYear(publishedDate);
    return `${title} (${year})`;
  }
}

/**
 * Format a case law citation
 * @param {Object} document Case law document
 * @returns {string} Formatted citation
 */
function formatCaseLawCitation(document) {
  const { title, citation, publishedDate, jurisdiction } = document;
  
  // If there's a formal citation, use it
  if (citation) {
    return citation;
  }
  
  // Extract year and court info
  const year = extractYear(publishedDate);
  const court = jurisdiction?.name || '';
  
  // Look for v. pattern to identify case name
  const partyMatch = title.match(/(.+?)\s+v\.?\s+(.+)/i);
  
  if (partyMatch) {
    // Case name with parties
    return `${partyMatch[1]} v. ${partyMatch[2]} (${year})${court ? `, ${court}` : ''}`;
  } else {
    // Case without clear party names
    return `${title} (${year})${court ? `, ${court}` : ''}`;
  }
}

/**
 * Format a statute citation
 * @param {Object} document Statute document
 * @returns {string} Formatted citation
 */
function formatStatuteCitation(document) {
  const { title, citation, publishedDate } = document;
  
  if (citation) {
    return citation;
  }
  
  // Extract year
  const year = extractYear(publishedDate);
  
  // Check for common Act naming patterns
  const actMatch = title.match(/(.+?)\s+Act(?:,\s+|\s+of\s+)?(\d{4})?/i);
  
  if (actMatch) {
    const actName = actMatch[1];
    const actYear = actMatch[2] || year;
    return `${actName} Act, ${actYear}`;
  } else {
    return `${title} (${year})`;
  }
}

/**
 * Format a contract citation
 * @param {Object} document Contract document
 * @returns {string} Formatted citation
 */
function formatContractCitation(document) {
  const { title, publishedDate } = document;
  
  // Extract year
  const year = extractYear(publishedDate);
  
  // Format as "Agreement Title (Date)"
  return `${title} (${year})`;
}

/**
 * Extract year from a date string or return current year
 * @param {string} dateString Date string in any common format
 * @returns {string} Extracted year
 */
function extractYear(dateString) {
  if (!dateString) {
    return new Date().getFullYear().toString();
  }
  
  // Try to parse date string
  const date = new Date(dateString);
  
  if (!isNaN(date.getTime())) {
    return date.getFullYear().toString();
  }
  
  // Try to extract 4-digit year from string
  const yearMatch = dateString.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    return yearMatch[0];
  }
  
  // Default to current year
  return new Date().getFullYear().toString();
}

/**
 * Format a legal citation according to a specific citation style
 * @param {string} citation Raw citation
 * @param {string} style Citation style (e.g., 'bluebook', 'oscola', 'aglc')
 * @returns {string} Formatted citation
 */
function formatWithStyle(citation, style = 'bluebook') {
  // This would implement full citation style formatting rules
  // For MVP, we just return the citation
  return citation;
}

module.exports = {
  formatCitations,
  formatSingleCitation,
  formatWithStyle
};
