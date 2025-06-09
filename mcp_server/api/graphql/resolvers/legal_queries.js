const { ApolloError } = require('apollo-server-express');
const { legalSearchService } = require('../../../rag_engine/retrieval/hybrid_retriever');
const { queryAnalyzer } = require('../../../ai_agents/utility_agents/citation_agent');
const { jurisdictionService } = require('../../../utils/jurisdiction/jurisdiction_detector');

// GraphQL resolver for legal queries
const legalQueryResolvers = {
  Query: {
    // Legal research query with comprehensive results
    legalSearch: async (_, { input }, { user }) => {
      try {
        const { query, jurisdictionId, legalDomainId, filters, limit = 10 } = input;
        
        // Analyze the query for legal domain and jurisdiction if not explicitly provided
        const analyzedQuery = await queryAnalyzer.analyzeQuery(query, {
          providedJurisdictionId: jurisdictionId,
          providedLegalDomainId: legalDomainId
        });
        
        // Get jurisdiction information
        const jurisdiction = jurisdictionId ? 
          await jurisdictionService.getJurisdiction(jurisdictionId) :
          analyzedQuery.detectedJurisdiction;
        
        // Perform the hybrid search using RAG engine
        const searchResults = await legalSearchService.search({
          query,
          userId: user?.id,
          jurisdictionId: jurisdiction?.id || jurisdictionId,
          legalDomainId: analyzedQuery.detectedDomain?.id || legalDomainId,
          filters,
          limit
        });
        
        // Extract related legal concepts from the query
        const relatedConcepts = await legalSearchService.findRelatedConcepts(query);
        
        // Generate suggested follow-up queries
        const suggestedQueries = await legalSearchService.generateSuggestedQueries(query, searchResults.results);
        
        return {
          query,
          results: searchResults.results.map(result => ({
            id: result.id,
            document: result.document,
            chunk: result.chunk,
            score: result.score,
            highlights: result.highlights || []
          })),
          suggestedQueries,
          relatedConcepts,
          jurisdiction: jurisdiction,
          legalDomain: analyzedQuery.detectedDomain
        };
      } catch (error) {
        console.error('Error in legalSearch resolver:', error);
        throw new ApolloError('Failed to perform legal search', 'SEARCH_ERROR');
      }
    },
    
    // Find similar documents to a specific document
    similarDocuments: async (_, { documentId, limit = 5 }, { user }) => {
      try {
        const results = await legalSearchService.findSimilarDocuments(documentId, limit);
        return results.map(result => ({
          id: result.id,
          document: result.document,
          chunk: result.chunk,
          score: result.score,
          highlights: result.highlights || []
        }));
      } catch (error) {
        console.error('Error in similarDocuments resolver:', error);
        throw new ApolloError('Failed to find similar documents', 'SEARCH_ERROR');
      }
    },
    
    // Get citation network for a document
    citationNetwork: async (_, { documentId, depth = 1 }, { user }) => {
      try {
        const citations = await legalSearchService.getCitationNetwork(documentId, depth);
        return citations;
      } catch (error) {
        console.error('Error in citationNetwork resolver:', error);
        throw new ApolloError('Failed to retrieve citation network', 'CITATION_ERROR');
      }
    },
    
    // Get legal concepts related to a query or domain
    legalConcepts: async (_, { query, domainId }, { user }) => {
      try {
        const concepts = await legalSearchService.getLegalConcepts(query, domainId);
        return concepts;
      } catch (error) {
        console.error('Error in legalConcepts resolver:', error);
        throw new ApolloError('Failed to retrieve legal concepts', 'CONCEPT_ERROR');
      }
    }
  }
};

module.exports = legalQueryResolvers;
