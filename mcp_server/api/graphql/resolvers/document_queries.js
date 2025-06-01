const { ApolloError } = require('apollo-server-express');
const { supabase } = require('../../../storage/document_store/supabase_client');
const { documentProcessor } = require('../../../rag_engine/document_processing/document_ingestion');

// GraphQL resolver for document operations
const documentQueryResolvers = {
  Query: {
    // Get documents (filtered by case or user if specified)
    documents: async (_, { caseId, userId }, { user }) => {
      try {
        let query = supabase
          .from('documents')
          .select('*, jurisdiction(*), legal_domain(*), source:legal_sources(*)');
          
        // Apply filters if provided
        if (caseId) {
          query = query.eq('case_id', caseId);
        }
        
        if (userId) {
          query = query.eq('user_id', userId);
        }
        
        // Execute query
        const { data, error } = await query;
        
        if (error) throw error;
        
        return data.map(doc => ({
          id: doc.id,
          title: doc.title,
          documentType: doc.document_type,
          jurisdiction: doc.jurisdiction,
          legalDomain: doc.legal_domain,
          filePath: doc.file_path,
          content: doc.content,
          citation: doc.citation,
          source: doc.source,
          publishedDate: doc.published_date,
          createdAt: doc.created_at,
          updatedAt: doc.updated_at
        }));
      } catch (error) {
        console.error('Error in documents resolver:', error);
        throw new ApolloError('Failed to retrieve documents', 'DOCUMENT_ERROR');
      }
    },
    
    // Get a specific document by ID
    document: async (_, { id }, { user }) => {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*, jurisdiction(*), legal_domain(*), source:legal_sources(*), case:cases(*), user:profiles(*)')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        if (!data) throw new Error('Document not found');
        
        return {
          id: data.id,
          title: data.title,
          documentType: data.document_type,
          jurisdiction: data.jurisdiction,
          legalDomain: data.legal_domain,
          filePath: data.file_path,
          content: data.content,
          citation: data.citation,
          source: data.source,
          case: data.case,
          user: data.user,
          publishedDate: data.published_date,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
      } catch (error) {
        console.error('Error in document resolver:', error);
        throw new ApolloError('Failed to retrieve document', 'DOCUMENT_ERROR');
      }
    },
    
    // Get document chunks for a specific document
    documentChunks: async (_, { documentId }, { user }) => {
      try {
        const { data, error } = await supabase
          .from('document_chunks')
          .select('*')
          .eq('document_id', documentId)
          .order('chunk_index', { ascending: true });
          
        if (error) throw error;
        
        return data.map(chunk => ({
          id: chunk.id,
          document: { id: chunk.document_id },
          chunkIndex: chunk.chunk_index,
          chunkText: chunk.chunk_text,
          metadata: chunk.metadata
        }));
      } catch (error) {
        console.error('Error in documentChunks resolver:', error);
        throw new ApolloError('Failed to retrieve document chunks', 'DOCUMENT_ERROR');
      }
    }
  },
  
  Mutation: {
    // Process a new document (upload, extract text, chunk, embed)
    processDocument: async (_, { input }, { user }) => {
      try {
        const { 
          title, documentType, jurisdictionId, legalDomainId, 
          content, filePath, citation, sourceId, publishedDate, caseId 
        } = input;
        
        if (!user) throw new Error('Authentication required');
        
        // Create document record
        const { data: document, error } = await supabase
          .from('documents')
          .insert({
            title,
            document_type: documentType,
            jurisdiction_id: jurisdictionId,
            legal_domain_id: legalDomainId,
            content,
            file_path: filePath,
            citation,
            source_id: sourceId,
            published_date: publishedDate,
            case_id: caseId,
            user_id: user.id,
            embedding_status: 'pending'
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Start asynchronous document processing
        documentProcessor.processDocument(document.id, {
          content,
          filePath
        });
        
        return {
          id: document.id,
          title: document.title,
          documentType: document.document_type,
          createdAt: document.created_at,
          updatedAt: document.updated_at
        };
      } catch (error) {
        console.error('Error in processDocument mutation:', error);
        throw new ApolloError('Failed to process document', 'DOCUMENT_ERROR');
      }
    },
    
    // Delete a document
    deleteDocument: async (_, { id }, { user }) => {
      try {
        if (!user) throw new Error('Authentication required');
        
        // Delete document chunks
        const { error: chunkError } = await supabase
          .from('document_chunks')
          .delete()
          .eq('document_id', id);
        
        if (chunkError) throw chunkError;
        
        // Delete vector references
        const { error: vectorError } = await supabase
          .from('vector_references')
          .delete()
          .eq('document_id', id);
        
        if (vectorError) throw vectorError;
        
        // Delete document
        const { error } = await supabase
          .from('documents')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        return true;
      } catch (error) {
        console.error('Error in deleteDocument mutation:', error);
        throw new ApolloError('Failed to delete document', 'DOCUMENT_ERROR');
      }
    }
  }
};

module.exports = documentQueryResolvers;
