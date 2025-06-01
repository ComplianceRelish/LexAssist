const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../../storage/document_store/supabase_client');
const { hierarchicalChunking } = require('./hierarchical_chunking');
const { metadataEnrichment } = require('./metadata_enrichment');
const { generateEmbeddings } = require('../../transformer_models/legal_embeddings/case_law_embeddings');
const { pineconeClient } = require('../../storage/vector_db/pinecone_client');
const { extractCitations } = require('../../utils/citation_utils/citation_parser');

/**
 * Document processor service for ingesting legal documents
 */
class DocumentProcessor {
  /**
   * Process a legal document for RAG
   * @param {Object} documentData Document data and metadata
   * @returns {Object} Processed document information
   */
  async processDocument(documentData) {
    try {
      const {
        title,
        content,
        documentType,
        filePath,
        citation,
        jurisdictionId,
        legalDomainId,
        userId,
        caseId,
        sourceId,
        publishedDate
      } = documentData;

      // 1. Store document metadata in Supabase
      const { data: document, error } = await supabase
        .from('documents')
        .insert({
          title,
          document_type: documentType,
          file_path: filePath,
          content: content,
          citation: citation,
          jurisdiction_id: jurisdictionId,
          legal_domain_id: legalDomainId,
          user_id: userId,
          case_id: caseId,
          source_id: sourceId,
          published_date: publishedDate,
          embedding_status: 'processing'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error storing document metadata:', error);
        throw new Error(`Failed to store document metadata: ${error.message}`);
      }

      // 2. Extract citations from the document
      const citations = await extractCitations(content, documentType);

      // 3. Create document chunks with hierarchical chunking
      const chunkingStrategy = this._getChunkingStrategy(documentType);
      const chunks = await hierarchicalChunking.chunkDocument(content, chunkingStrategy);

      // 4. Enrich chunks with metadata
      const enrichedChunks = await metadataEnrichment.enrichChunks(chunks, {
        documentId: document.id,
        title,
        documentType,
        citation,
        jurisdictionId,
        legalDomainId,
        citations
      });

      // 5. Store chunks in Supabase with proper references
      const chunksData = [];
      for (let i = 0; i < enrichedChunks.length; i++) {
        const chunk = enrichedChunks[i];
        const { data: chunkData, error: chunkError } = await supabase
          .from('document_chunks')
          .insert({
            document_id: document.id,
            chunk_index: i,
            chunk_text: chunk.text,
            metadata: chunk.metadata
          })
          .select('*')
          .single();

        if (chunkError) {
          console.error(`Error storing chunk ${i}:`, chunkError);
          continue;
        }

        chunksData.push(chunkData);
      }

      // 6. Generate embeddings for each chunk
      const embeddingPromises = enrichedChunks.map(async (chunk, index) => {
        // Generate embedding for the chunk
        const embedding = await generateEmbeddings(chunk.text, documentType);
        const vectorId = `doc_${document.id}_chunk_${index}`;

        // Add embedding to Pinecone
        await pineconeClient.upsert({
          id: vectorId,
          values: embedding,
          metadata: {
            document_id: document.id,
            chunk_id: chunksData[index]?.id,
            title,
            document_type: documentType,
            chunk_index: index,
            text: chunk.text.substring(0, 1000), // Store truncated text in metadata
            citation: citation,
            jurisdiction_id: jurisdictionId,
            legal_domain_id: legalDomainId
          }
        });

        // Update document chunks with vector_id
        await supabase
          .from('document_chunks')
          .update({ vector_id: vectorId })
          .eq('id', chunksData[index].id);

        // Store vector reference
        await supabase
          .from('vector_references')
          .insert({
            document_id: document.id,
            chunk_id: chunksData[index].id,
            vector_id: vectorId,
            database_name: 'pinecone',
            index_name: process.env.PINECONE_INDEX_NAME,
            metadata: {
              embedding_model: 'legal-embeddings',
              document_type: documentType
            }
          });

        return { vectorId, chunkId: chunksData[index].id };
      });

      // Wait for all embeddings to be generated and stored
      await Promise.all(embeddingPromises);

      // 7. Store any extracted citations in the database
      if (citations && citations.length > 0) {
        const citationsPromises = citations.map(async (citation) => {
          // First try to find the target document by citation
          const { data: targetDocument } = await supabase
            .from('documents')
            .select('id')
            .eq('citation', citation.targetCitation)
            .maybeSingle();

          if (targetDocument) {
            // Store the citation relationship
            return supabase
              .from('citations')
              .insert({
                source_document_id: document.id,
                target_document_id: targetDocument.id,
                citation_text: citation.text,
                context: citation.context
              });
          }
        });

        await Promise.allSettled(citationsPromises);
      }

      // 8. Update document status to completed
      await supabase
        .from('documents')
        .update({ embedding_status: 'completed' })
        .eq('id', document.id);

      return {
        documentId: document.id,
        title: document.title,
        chunkCount: chunksData.length,
        citationsCount: citations.length,
        status: 'completed'
      };
    } catch (error) {
      console.error('Document processing error:', error);
      await supabase
        .from('documents')
        .update({ embedding_status: 'failed' })
        .eq('id', documentData.id);
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  /**
   * Get appropriate chunking strategy based on document type
   * @private
   * @param {string} documentType Type of legal document
   * @returns {Object} Chunking strategy configuration
   */
  _getChunkingStrategy(documentType) {
    switch (documentType.toLowerCase()) {
      case 'case_law':
      case 'judgment':
        return require('./legal_chunking_strategies/case_law_chunking').strategy;
      case 'statute':
      case 'legislation':
        return require('./legal_chunking_strategies/statute_chunking').strategy;
      case 'contract':
      case 'agreement':
        return require('./legal_chunking_strategies/contract_chunking').strategy;
      default:
        // Default generic chunking strategy
        return {
          chunkSize: 1000,
          overlapSize: 200,
          preserveSections: true
        };
    }
  }
}

module.exports = {
  documentProcessor: new DocumentProcessor()
};
