/**
 * Citation ranker for boosting document relevance based on citation network
 * Implements authority-based ranking for legal documents
 */
const { supabase } = require('../../storage/document_store/supabase_client');

class CitationRanker {
  /**
   * Apply citation boost to search results based on authority
   * @param {Array} results Search results to boost
   * @returns {Array} Results with adjusted scores
   */
  async applyCitationBoost(results) {
    try {
      if (!results || results.length === 0) {
        return results;
      }

      // Get unique document IDs
      const documentIds = [...new Set(results.map(r => r.documentId))];
      
      // Get citation data for these documents
      const citationData = await this._getCitationData(documentIds);
      
      // Get authority scores
      const authorityScores = await this._calculateAuthorityScores(documentIds, citationData);
      
      // Apply boosts to search results
      const boostedResults = results.map(result => {
        const docId = result.documentId;
        const baseScore = result.score;
        
        // Apply citation-based boost
        const authorityScore = authorityScores[docId] || 0;
        const citationBoost = authorityScore * 0.3; // Weight for citation authority
        
        // Apply recency boost if available
        const recencyBoost = this._calculateRecencyBoost(result.metadata);
        
        // Calculate adjusted score
        const adjustedScore = baseScore + (baseScore * citationBoost) + recencyBoost;
        
        return {
          ...result,
          adjustedScore,
          authorityScore,
          recencyBoost
        };
      });
      
      return boostedResults;
    } catch (error) {
      console.error('Error applying citation boost:', error);
      // Return original results if boosting fails
      return results.map(result => ({
        ...result,
        adjustedScore: result.score
      }));
    }
  }
  
  /**
   * Get citation data for documents
   * @private
   * @param {Array} documentIds Document IDs
   * @returns {Object} Citation data
   */
  async _getCitationData(documentIds) {
    // Get outgoing citations (documents citing other documents)
    const { data: outgoingCitations, error: outgoingError } = await supabase
      .from('citations')
      .select('source_document_id, target_document_id')
      .in('source_document_id', documentIds);
      
    if (outgoingError) {
      console.error('Error fetching outgoing citations:', outgoingError);
      return { outgoing: {}, incoming: {} };
    }
    
    // Get incoming citations (documents cited by others)
    const { data: incomingCitations, error: incomingError } = await supabase
      .from('citations')
      .select('source_document_id, target_document_id')
      .in('target_document_id', documentIds);
      
    if (incomingError) {
      console.error('Error fetching incoming citations:', incomingError);
      return { outgoing: {}, incoming: {} };
    }
    
    // Process into maps for easier access
    const outgoing = this._processOutgoingCitations(outgoingCitations);
    const incoming = this._processIncomingCitations(incomingCitations);
    
    return { outgoing, incoming };
  }
  
  /**
   * Process outgoing citations into a map
   * @private
   * @param {Array} citations Outgoing citations
   * @returns {Object} Map of document IDs to cited documents
   */
  _processOutgoingCitations(citations) {
    const result = {};
    
    for (const citation of citations) {
      const sourceId = citation.source_document_id;
      const targetId = citation.target_document_id;
      
      if (!result[sourceId]) {
        result[sourceId] = [];
      }
      
      result[sourceId].push(targetId);
    }
    
    return result;
  }
  
  /**
   * Process incoming citations into a map
   * @private
   * @param {Array} citations Incoming citations
   * @returns {Object} Map of document IDs to citing documents
   */
  _processIncomingCitations(citations) {
    const result = {};
    
    for (const citation of citations) {
      const sourceId = citation.source_document_id;
      const targetId = citation.target_document_id;
      
      if (!result[targetId]) {
        result[targetId] = [];
      }
      
      result[targetId].push(sourceId);
    }
    
    return result;
  }
  
  /**
   * Calculate authority scores for documents using a simplified PageRank-like algorithm
   * @private
   * @param {Array} documentIds Document IDs
   * @param {Object} citationData Citation data
   * @returns {Object} Map of document IDs to authority scores
   */
  async _calculateAuthorityScores(documentIds, citationData) {
    const { outgoing, incoming } = citationData;
    
    // Initialize scores
    const scores = {};
    for (const docId of documentIds) {
      scores[docId] = 1.0; // Start with base score
    }
    
    // Damping factor (similar to PageRank)
    const dampingFactor = 0.85;
    
    // Number of iterations
    const iterations = 3; // Simplified for performance
    
    // Execute iterations of score propagation
    for (let i = 0; i < iterations; i++) {
      const newScores = { ...scores };
      
      for (const docId of documentIds) {
        // Base score component
        let score = (1 - dampingFactor);
        
        // Get documents citing this document
        const citingDocs = incoming[docId] || [];
        
        // Add weighted scores from citing documents
        for (const citingDocId of citingDocs) {
          // Get outgoing citation count for the citing document
          const citingDocOutgoingCount = (outgoing[citingDocId] || []).length;
          
          if (citingDocOutgoingCount > 0 && scores[citingDocId]) {
            // Weight by citing document's score divided by its outgoing citations
            score += dampingFactor * (scores[citingDocId] / citingDocOutgoingCount);
          }
        }
        
        newScores[docId] = score;
      }
      
      // Update scores for next iteration
      Object.assign(scores, newScores);
    }
    
    // Normalize scores
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      for (const docId in scores) {
        scores[docId] = scores[docId] / maxScore;
      }
    }
    
    return scores;
  }
  
  /**
   * Calculate recency boost based on document metadata
   * @private
   * @param {Object} metadata Document metadata
   * @returns {number} Recency boost factor
   */
  _calculateRecencyBoost(metadata) {
    if (!metadata || !metadata.publishedDate) {
      return 0;
    }
    
    try {
      const publishedDate = new Date(metadata.publishedDate);
      const currentYear = new Date().getFullYear();
      const documentYear = publishedDate.getFullYear();
      
      // Calculate years since publication
      const yearDiff = currentYear - documentYear;
      
      // Apply diminishing boost for more recent documents
      if (yearDiff <= 0) {
        return 0.2; // Maximum boost for current year
      } else if (yearDiff <= 5) {
        return 0.2 - (yearDiff * 0.04); // Linear decline over 5 years
      } else {
        return 0; // No recency boost for older documents
      }
    } catch (error) {
      return 0; // Default to no boost if date parsing fails
    }
  }
}

module.exports = {
  citationRanker: new CitationRanker()
};
