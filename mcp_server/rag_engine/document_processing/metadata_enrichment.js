/**
 * Metadata enrichment service for document chunks
 * Adds contextual legal information to enhance retrieval
 */
class MetadataEnrichment {
  /**
   * Enrich document chunks with legal metadata
   * @param {Array} chunks Array of document chunks
   * @param {Object} metadata Document metadata
   * @returns {Array} Enriched chunks
   */
  async enrichChunks(chunks, metadata) {
    const {
      documentId,
      title,
      documentType,
      citation,
      jurisdictionId,
      legalDomainId,
      citations = []
    } = metadata;
    
    // Basic metadata to add to all chunks
    const baseMetadata = {
      document_id: documentId,
      document_title: title,
      document_type: documentType,
      citation: citation,
      jurisdiction_id: jurisdictionId,
      legal_domain_id: legalDomainId,
      enrichment_version: '1.0',
      processed_date: new Date().toISOString()
    };
    
    // Analyze citations to enrich with referenced document context
    const citationMap = this._createCitationMap(citations);
    
    // Process each chunk to add metadata
    return chunks.map((chunk, index) => {
      // Combine base metadata with chunk-specific metadata
      const enrichedMetadata = {
        ...baseMetadata,
        ...chunk.metadata,
        chunk_index: index,
        total_chunks: chunks.length
      };
      
      // Add citation information if present in this chunk
      const chunkCitations = this._findCitationsInChunk(chunk.text, citationMap);
      if (chunkCitations.length > 0) {
        enrichedMetadata.citations = chunkCitations;
      }
      
      // Add legal entity recognition if enabled
      if (this._shouldPerformEntityRecognition(documentType)) {
        const entities = this._extractLegalEntities(chunk.text);
        if (entities.length > 0) {
          enrichedMetadata.legal_entities = entities;
        }
      }
      
      // Special metadata for different document types
      this._addDocumentTypeSpecificMetadata(enrichedMetadata, chunk.text, documentType);
      
      // Return enriched chunk
      return {
        text: chunk.text,
        metadata: enrichedMetadata
      };
    });
  }
  
  /**
   * Create a map of citation texts to citation metadata for quick lookup
   * @private
   * @param {Array} citations Document citations
   * @returns {Map} Map of citation patterns to citation metadata
   */
  _createCitationMap(citations) {
    const map = new Map();
    
    for (const citation of citations) {
      // Create regex patterns for citation variations
      const patterns = this._generateCitationVariants(citation.text);
      
      for (const pattern of patterns) {
        map.set(pattern, {
          targetCitation: citation.targetCitation,
          targetDocumentId: citation.targetDocumentId,
          context: citation.context
        });
      }
    }
    
    return map;
  }
  
  /**
   * Find citations in chunk text using citation map
   * @private
   * @param {string} text Chunk text
   * @param {Map} citationMap Map of citation patterns
   * @returns {Array} Citations found in chunk
   */
  _findCitationsInChunk(text, citationMap) {
    const foundCitations = [];
    
    for (const [pattern, citationData] of citationMap.entries()) {
      const regex = new RegExp(pattern, 'i');
      
      if (regex.test(text)) {
        foundCitations.push({
          citation_text: pattern,
          target_citation: citationData.targetCitation,
          target_document_id: citationData.targetDocumentId
        });
      }
    }
    
    return foundCitations;
  }
  
  /**
   * Generate variations of a citation text for robust matching
   * @private
   * @param {string} citationText Original citation text
   * @returns {Array} Citation text variations
   */
  _generateCitationVariants(citationText) {
    // Create common variations like abbreviations, different formats, etc.
    const variants = [
      citationText,
      citationText.replace(/\s+/g, ' ').trim() // Normalize whitespace
    ];
    
    // Add more sophisticated variants based on legal citation patterns
    // This is simplified - a real implementation would include more comprehensive rules
    
    // Example: "AIR 2019 SC 1234" might be cited as "AIR 2019 SC 1234", "(2019) 1 SCC 1234", etc.
    
    return variants;
  }
  
  /**
   * Determine if entity recognition should be performed
   * @private
   * @param {string} documentType Document type
   * @returns {boolean} Whether to perform entity recognition
   */
  _shouldPerformEntityRecognition(documentType) {
    // Simplified logic for when to perform entity recognition
    const typesForEntityRecognition = ['case_law', 'judgment', 'contract', 'agreement'];
    return typesForEntityRecognition.includes(documentType.toLowerCase());
  }
  
  /**
   * Extract legal entities from text
   * @private
   * @param {string} text Chunk text
   * @returns {Array} Extracted legal entities
   */
  _extractLegalEntities(text) {
    // This is a placeholder for actual legal entity recognition
    // In a real implementation, this would use NER models trained on legal text
    
    const entities = [];
    
    // Extremely simplified pattern matching for demo purposes only
    // Real implementation would use proper NLP/NER
    
    // Look for potential legal principles (very naive approach)
    const principlePhrases = [
      'principle of', 'doctrine of', 'rule of', 'right to'
    ];
    
    for (const phrase of principlePhrases) {
      const regex = new RegExp(`${phrase}\\s+([A-Za-z\\s]+?)(?:\\.|,|;|:)`, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        if (match[1] && match[1].trim().length > 3) {
          entities.push({
            type: 'legal_principle',
            text: `${phrase} ${match[1].trim()}`,
            position: match.index
          });
        }
      }
    }
    
    return entities;
  }
  
  /**
   * Add document type specific metadata
   * @private
   * @param {Object} metadata Metadata object to augment
   * @param {string} text Chunk text
   * @param {string} documentType Document type
   */
  _addDocumentTypeSpecificMetadata(metadata, text, documentType) {
    switch (documentType.toLowerCase()) {
      case 'case_law':
      case 'judgment':
        // Extract judgment-specific information
        this._addJudgmentMetadata(metadata, text);
        break;
        
      case 'statute':
      case 'legislation':
        // Extract statute-specific information
        this._addStatuteMetadata(metadata, text);
        break;
        
      case 'contract':
      case 'agreement':
        // Extract contract-specific information
        this._addContractMetadata(metadata, text);
        break;
        
      default:
        // No special handling for unknown document types
        break;
    }
  }
  
  /**
   * Add judgment-specific metadata
   * @private
   * @param {Object} metadata Metadata object to augment
   * @param {string} text Chunk text
   */
  _addJudgmentMetadata(metadata, text) {
    // Check if this chunk contains an order/direction
    if (/(?:hereby order|direct|declare|hold that)/i.test(text)) {
      metadata.contains_order = true;
    }
    
    // Check if this chunk contains a ratio decidendi
    if (/(?:ratio|principle|for these reasons)/i.test(text)) {
      metadata.contains_ratio = true;
    }
    
    // Check if this chunk contains a dissent
    if (/(?:dissent|dissenting|disagree|differ|contrary view)/i.test(text)) {
      metadata.contains_dissent = true;
    }
  }
  
  /**
   * Add statute-specific metadata
   * @private
   * @param {Object} metadata Metadata object to augment
   * @param {string} text Chunk text
   */
  _addStatuteMetadata(metadata, text) {
    // Check if this chunk contains definitions
    if (/(?:means|shall mean|is defined as|refers to)/i.test(text)) {
      metadata.contains_definition = true;
    }
    
    // Check if this chunk contains penalties
    if (/(?:punishable|imprisonment|fine|penalty|liable to)/i.test(text)) {
      metadata.contains_penalty = true;
    }
    
    // Check if this chunk contains procedural rules
    if (/(?:procedure|shall be|must be filed|time limit)/i.test(text)) {
      metadata.contains_procedure = true;
    }
  }
  
  /**
   * Add contract-specific metadata
   * @private
   * @param {Object} metadata Metadata object to augment
   * @param {string} text Chunk text
   */
  _addContractMetadata(metadata, text) {
    // Check if this chunk contains obligations
    if (/(?:shall|must|obligated to|required to|undertakes to)/i.test(text)) {
      metadata.contains_obligation = true;
    }
    
    // Check if this chunk contains conditions
    if (/(?:provided that|subject to|conditional upon|in the event)/i.test(text)) {
      metadata.contains_condition = true;
    }
    
    // Check if this chunk contains termination provisions
    if (/(?:terminate|termination|expiry|expiration|end of|cease)/i.test(text)) {
      metadata.contains_termination = true;
    }
  }
}

module.exports = {
  metadataEnrichment: new MetadataEnrichment()
};
