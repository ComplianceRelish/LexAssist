/**
 * Hybrid retrieval system combining vector search, BM25 and legal-specific heuristics
 * for optimal legal document retrieval
 */
const { generateEmbeddings } = require('../../transformer_models/legal_embeddings/case_law_embeddings');
const { pineconeClient } = require('../../storage/vector_db/pinecone_client');
const { supabase } = require('../../storage/document_store/supabase_client');
const { jurisdictionService } = require('../../utils/jurisdiction/jurisdiction_detector');
const { citationRanker } = require('../../utils/citation_utils/citation_ranker');

class LegalSearchService {
  /**
   * Perform hybrid search combining vector search and metadata filtering
   * 
   * @param {Object} options Search options
   * @param {string} options.query Search query
   * @param {string} options.userId User ID for personalization
   * @param {string} options.jurisdictionId Jurisdiction filter
   * @param {string} options.legalDomainId Legal domain filter
   * @param {Object} options.filters Additional filters
   * @param {number} options.limit Maximum number of results
   * @returns {Object} Search results with metadata
   */
  async search(options) {
    const {
      query,
      userId,
      jurisdictionId,
      legalDomainId,
      filters = {},
      limit = 10
    } = options;

    try {
      // 1. Generate embeddings for the query
      const queryEmbedding = await generateEmbeddings(query);
      
      // 2. Prepare metadata filters
      const metadataFilters = this._buildMetadataFilters({
        jurisdictionId,
        legalDomainId,
        ...filters
      });
      
      // 3. Perform vector search in Pinecone
      const vectorResults = await this._performVectorSearch(
        queryEmbedding,
        metadataFilters,
        Math.min(limit * 3, 30) // Get more results than needed for reranking
      );
      
      // 4. Perform keyword search in Supabase for diversity
      const keywordResults = await this._performKeywordSearch(
        query,
        metadataFilters,
        Math.min(limit * 2, 20)
      );
      
      // 5. Combine and deduplicate results
      const combinedResults = this._combineResults(vectorResults, keywordResults);
      
      // 6. Apply citation-aware reranking
      const rerankedResults = await this._rerank(query, combinedResults);
      
      // 7. Take top results
      const finalResults = rerankedResults.slice(0, limit);
      
      // 8. Fetch full document data for results
      const enrichedResults = await this._enrichResults(finalResults);
      
      // 9. Save search history if user is authenticated
      if (userId) {
        await this._saveSearchHistory(userId, query, jurisdictionId, legalDomainId);
      }
      
      return {
        query,
        results: enrichedResults,
        totalFound: combinedResults.length,
        metadata: {
          jurisdictionId,
          legalDomainId,
          filters
        }
      };
    } catch (error) {
      console.error('Hybrid search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }
  
  /**
   * Build metadata filters for vector search
   * @private
   * @param {Object} filters Filter criteria
   * @returns {Object} Formatted metadata filters
   */
  _buildMetadataFilters(filters) {
    const metadataFilters = {};
    
    if (filters.jurisdictionId) {
      metadataFilters.jurisdiction_id = filters.jurisdictionId;
    }
    
    if (filters.legalDomainId) {
      metadataFilters.legal_domain_id = filters.legalDomainId;
    }
    
    if (filters.documentType) {
      metadataFilters.document_type = filters.documentType;
    }
    
    // Add other filters as needed
    
    return metadataFilters;
  }
  
  /**
   * Perform vector search using Pinecone
   * @private
   * @param {Array} embedding Query embedding
   * @param {Object} filters Metadata filters
   * @param {number} limit Result limit
   * @returns {Array} Vector search results
   */
  async _performVectorSearch(embedding, filters, limit) {
    const queryRequest = {
      vector: embedding,
      topK: limit,
      includeMetadata: true
    };
    
    // Add filters if present
    if (Object.keys(filters).length > 0) {
      queryRequest.filter = filters;
    }
    
    const results = await pineconeClient.query(queryRequest);
    
    return results.matches.map(match => ({
      id: match.id,
      score: match.score,
      documentId: match.metadata.document_id,
      chunkId: match.metadata.chunk_id,
      source: 'vector',
      metadata: match.metadata
    }));
  }
  
  /**
   * Perform keyword search using Supabase
   * @private
   * @param {string} query Search query
   * @param {Object} filters Metadata filters
   * @param {number} limit Result limit
   * @returns {Array} Keyword search results
   */
  async _performKeywordSearch(query, filters, limit) {
    // Create text search query
    let textSearchQuery = supabase
      .from('document_chunks')
      .select(`
        id,
        document_id,
        chunk_text,
        chunk_index,
        metadata,
        documents(id, title, document_type, jurisdiction_id, legal_domain_id)
      `)
      .textSearch('chunk_text', query)
      .limit(limit);
    
    // Apply filters
    if (filters.jurisdictionId) {
      textSearchQuery = textSearchQuery.filter('documents.jurisdiction_id', 'eq', filters.jurisdictionId);
    }
    
    if (filters.legalDomainId) {
      textSearchQuery = textSearchQuery.filter('documents.legal_domain_id', 'eq', filters.legalDomainId);
    }
    
    const { data, error } = await textSearchQuery;
    
    if (error) {
      console.error('Keyword search error:', error);
      return [];
    }
    
    return data.map((item, index) => ({
      id: `keyword_${item.id}`,
      score: 1 - (index * 0.05), // Simple decreasing score
      documentId: item.document_id,
      chunkId: item.id,
      source: 'keyword',
      metadata: {
        ...item.metadata,
        document_id: item.document_id,
        text: item.chunk_text.substring(0, 1000)
      }
    }));
  }
  
  /**
   * Combine and deduplicate results from multiple sources
   * @private
   * @param {Array} vectorResults Vector search results
   * @param {Array} keywordResults Keyword search results
   * @returns {Array} Combined unique results
   */
  _combineResults(vectorResults, keywordResults) {
    // Combine all results
    const allResults = [...vectorResults, ...keywordResults];
    
    // Deduplicate by chunk ID
    const uniqueMap = new Map();
    for (const result of allResults) {
      const key = result.chunkId;
      
      // If this is a new result or has a higher score than existing one
      if (!uniqueMap.has(key) || result.score > uniqueMap.get(key).score) {
        uniqueMap.set(key, result);
      }
    }
    
    // Convert back to array and sort by score
    return Array.from(uniqueMap.values())
      .sort((a, b) => b.score - a.score);
  }
  
  /**
   * Rerank search results using legal-specific algorithms
   * @private
   * @param {string} query Original query
   * @param {Array} results Combined search results
   * @returns {Array} Reranked results
   */
  async _rerank(query, results) {
    // Apply citation-aware ranking boost
    const boostedResults = await citationRanker.applyCitationBoost(results);
    
    // Sort by adjusted score
    return boostedResults.sort((a, b) => b.adjustedScore - a.adjustedScore);
  }
  
  /**
   * Enrich results with full document and chunk data
   * @private
   * @param {Array} results Search results to enrich
   * @returns {Array} Enriched results with document data
   */
  async _enrichResults(results) {
    if (results.length === 0) return [];
    
    // Get unique document IDs
    const documentIds = [...new Set(results.map(r => r.documentId))];
    
    // Fetch document data
    const { data: documents } = await supabase
      .from('documents')
      .select('*, jurisdiction(*), legal_domain(*)')
      .in('id', documentIds);
    
    // Create document lookup
    const documentMap = documents.reduce((map, doc) => {
      map[doc.id] = doc;
      return map;
    }, {});
    
    // Fetch chunks data for highlighting
    const chunkIds = results.map(r => r.chunkId);
    const { data: chunks } = await supabase
      .from('document_chunks')
      .select('*')
      .in('id', chunkIds);
    
    // Create chunk lookup
    const chunkMap = chunks.reduce((map, chunk) => {
      map[chunk.id] = chunk;
      return map;
    }, {});
    
    // Combine data
    return results.map(result => {
      const document = documentMap[result.documentId];
      const chunk = chunkMap[result.chunkId];
      
      return {
        id: result.id,
        score: result.adjustedScore || result.score,
        document: {
          id: document.id,
          title: document.title,
          documentType: document.document_type,
          citation: document.citation,
          jurisdiction: document.jurisdiction,
          legalDomain: document.legal_domain
        },
        chunk: {
          id: chunk.id,
          chunkIndex: chunk.chunk_index,
          chunkText: chunk.chunk_text,
          metadata: chunk.metadata
        },
        highlights: this._generateHighlights(chunk.chunk_text, result.metadata.text)
      };
    });
  }
  
  /**
   * Generate text highlights for search results
   * @private
   * @param {string} fullText Full chunk text
   * @param {string} snippetText Snippet from metadata (may contain match context)
   * @returns {Array} Highlighted text segments
   */
  _generateHighlights(fullText, snippetText) {
    // Simplified highlight generation
    // In a real implementation, this would use query terms to highlight relevant parts
    const maxLen = 200;
    const highlights = [];
    
    // Take the beginning of the text as a highlight if it's short enough
    if (fullText.length <= maxLen * 2) {
      highlights.push(fullText.substring(0, maxLen));
    } else {
      // Try to find a good snippet from the middle
      const middleStart = Math.floor(fullText.length / 2) - Math.floor(maxLen / 2);
      highlights.push(
        fullText.substring(0, maxLen),
        fullText.substring(middleStart, middleStart + maxLen)
      );
    }
    
    return highlights;
  }
  
  /**
   * Save search history entry
   * @private
   * @param {string} userId User ID
   * @param {string} query Search query
   * @param {string} jurisdictionId Jurisdiction ID
   * @param {string} legalDomainId Legal domain ID
   */
  async _saveSearchHistory(userId, query, jurisdictionId, legalDomainId) {
    try {
      await supabase
        .from('search_history')
        .insert({
          user_id: userId,
          query,
          jurisdiction_id: jurisdictionId,
          legal_domain_id: legalDomainId
        });
    } catch (error) {
      console.error('Error saving search history:', error);
      // Non-critical error, don't throw
    }
  }
  
  /**
   * Find similar documents to a specific document
   * @param {string} documentId Document ID to find similar documents for
   * @param {number} limit Maximum number of results
   * @returns {Array} Similar documents
   */
  async findSimilarDocuments(documentId, limit = 5) {
    try {
      // Fetch document chunks
      const { data: chunks } = await supabase
        .from('document_chunks')
        .select('id, vector_id')
        .eq('document_id', documentId)
        .limit(1); // Get first chunk for similarity search
        
      if (!chunks || chunks.length === 0) {
        throw new Error('Document not found or has no chunks');
      }
      
      // Get the vector ID of the first chunk
      const vectorId = chunks[0].vector_id;
      
      if (!vectorId) {
        throw new Error('Document has no vector embedding');
      }
      
      // Find similar vectors excluding the same document
      const results = await pineconeClient.query({
        id: vectorId,
        topK: limit + 5, // Get extra for filtering
        includeMetadata: true
      });
      
      // Filter out chunks from the same document
      const filteredResults = results.matches
        .filter(match => match.metadata.document_id !== documentId)
        .slice(0, limit);
        
      // Convert to standard result format
      return this._enrichResults(filteredResults.map(match => ({
        id: match.id,
        score: match.score,
        documentId: match.metadata.document_id,
        chunkId: match.metadata.chunk_id,
        metadata: match.metadata
      })));
    } catch (error) {
      console.error('Error finding similar documents:', error);
      throw new Error(`Similar document search failed: ${error.message}`);
    }
  }
  
  /**
   * Get citation network for a document
   * @param {string} documentId Document ID
   * @param {number} depth Network depth (levels of citations)
   * @returns {Array} Citation network
   */
  async getCitationNetwork(documentId, depth = 1) {
    try {
      const visitedDocuments = new Set();
      const network = [];
      
      await this._getCitationsRecursive(documentId, depth, visitedDocuments, network);
      
      return network;
    } catch (error) {
      console.error('Error getting citation network:', error);
      throw new Error(`Citation network retrieval failed: ${error.message}`);
    }
  }
  
  /**
   * Recursively get citations to build network
   * @private
   * @param {string} documentId Document ID
   * @param {number} depthLeft Remaining depth to traverse
   * @param {Set} visitedDocuments Set of already visited document IDs
   * @param {Array} network Citation network being built
   */
  async _getCitationsRecursive(documentId, depthLeft, visitedDocuments, network) {
    if (depthLeft <= 0 || visitedDocuments.has(documentId)) {
      return;
    }
    
    visitedDocuments.add(documentId);
    
    // Get outgoing citations (this document cites others)
    const { data: outgoing } = await supabase
      .from('citations')
      .select(`
        id, citation_text, context, 
        target_document:target_document_id(id, title, citation, document_type)
      `)
      .eq('source_document_id', documentId);
      
    // Get incoming citations (other documents cite this one)
    const { data: incoming } = await supabase
      .from('citations')
      .select(`
        id, citation_text, context,
        source_document:source_document_id(id, title, citation, document_type)
      `)
      .eq('target_document_id', documentId);
      
    // Add all citations to the network
    if (outgoing) {
      for (const citation of outgoing) {
        network.push({
          id: citation.id,
          sourceDocument: { id: documentId },
          targetDocument: citation.target_document,
          citationText: citation.citation_text,
          context: citation.context,
          direction: 'outgoing'
        });
        
        // Recursively get next level
        if (depthLeft > 1) {
          await this._getCitationsRecursive(
            citation.target_document.id,
            depthLeft - 1,
            visitedDocuments,
            network
          );
        }
      }
    }
    
    if (incoming) {
      for (const citation of incoming) {
        network.push({
          id: citation.id,
          sourceDocument: citation.source_document,
          targetDocument: { id: documentId },
          citationText: citation.citation_text,
          context: citation.context,
          direction: 'incoming'
        });
        
        // Recursively get next level
        if (depthLeft > 1) {
          await this._getCitationsRecursive(
            citation.source_document.id,
            depthLeft - 1,
            visitedDocuments,
            network
          );
        }
      }
    }
  }

  /**
   * Get legal concepts related to a query
   * @param {string} query Search query
   * @param {string} domainId Domain ID to limit concepts
   * @returns {Array} Related legal concepts
   */
  async getLegalConcepts(query, domainId) {
    try {
      // This is a simplified version
      // In a real implementation, this would use the knowledge graph
      
      // For now, just return empty array
      return [];
    } catch (error) {
      console.error('Error getting legal concepts:', error);
      throw new Error(`Legal concept retrieval failed: ${error.message}`);
    }
  }
  
  /**
   * Generate suggested follow-up queries
   * @param {string} originalQuery Original search query
   * @param {Array} results Search results
   * @returns {Array} Suggested follow-up queries
   */
  async generateSuggestedQueries(originalQuery, results) {
    // This would use an LLM in production
    // For now return static suggestions based on the query
    
    const suggestions = [];
    
    if (originalQuery.includes('section')) {
      suggestions.push(
        `${originalQuery} case law`,
        `${originalQuery} amendments`
      );
    } else if (originalQuery.includes('v.')) {
      suggestions.push(
        `${originalQuery} precedents`,
        `${originalQuery} overruled`
      );
    } else {
      suggestions.push(
        `${originalQuery} recent cases`,
        `${originalQuery} legal principle`
      );
    }
    
    return suggestions.slice(0, 3); // Return max 3 suggestions
  }
  
  /**
   * Find related legal concepts from the knowledge graph
   * @param {string} query Search query
   * @returns {Array} Related legal concepts
   */
  async findRelatedConcepts(query) {
    // Simplified implementation
    // In production, this would query the knowledge graph
    
    return []; // Empty for now
  }
}

module.exports = {
  legalSearchService: new LegalSearchService()
};
