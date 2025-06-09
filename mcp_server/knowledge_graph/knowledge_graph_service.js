const { v4: uuidv4 } = require('uuid');
const { executeQuery } = require('./neo4j_client/connection_manager');
const { CypherQueryBuilder } = require('./neo4j_client/query_builder');
const { initializeSchema } = require('./graph_schema/initialize_schema');

class KnowledgeGraphService {
  /**
   * Initialize the knowledge graph service
   */
  async initialize() {
    await initializeSchema();
  }
  
  /**
   * Add a document to the knowledge graph
   * @param {Object} document Document data
   * @returns {Promise<Object>} Created document node
   */
  async addDocument(document) {
    const { 
      id = uuidv4(), 
      title, 
      documentType, 
      citation, 
      jurisdictionId,
      legalDomainId,
      content,
      publishedDate
    } = document;
    
    const documentProps = {
      id,
      title,
      document_type: documentType,
      citation,
      jurisdiction_id: jurisdictionId,
      legal_domain_id: legalDomainId,
      content_preview: content ? content.substring(0, 500) : null,
      published_date: publishedDate,
      created_at: new Date().toISOString()
    };
    
    // Create document node
    const { query, params } = CypherQueryBuilder.createNode(documentType, documentProps);
    const result = await executeQuery(query, params);
    
    // Link to jurisdiction if provided
    if (jurisdictionId) {
      await this.linkDocumentToJurisdiction(id, jurisdictionId);
    }
    
    // Link to legal domain if provided
    if (legalDomainId) {
      await this.linkDocumentToLegalDomain(id, legalDomainId);
    }
    
    return result.records[0].get('n').properties;
  }
  
  /**
   * Add a citation relationship between documents
   * @param {string} sourceId Source document ID
   * @param {string} targetId Target document ID
   * @param {string} citationText Citation text
   * @returns {Promise<Object>} Created relationship
   */
  async addCitation(sourceId, targetId, citationText) {
    const query = `
      MATCH (source:Document {id: $sourceId})
      MATCH (target:Document {id: $targetId})
      CREATE (source)-[r:CITES {citation_text: $citationText, created_at: $timestamp}]->(target)
      RETURN source, r, target
    `;
    
    const params = {
      sourceId,
      targetId,
      citationText,
      timestamp: new Date().toISOString()
    };
    
    const result = await executeQuery(query, params);
    return result.records.length > 0 ? result.records[0].get('r').properties : null;
  }
  
  /**
   * Add a legal concept to the knowledge graph
   * @param {Object} concept Legal concept data
   * @returns {Promise<Object>} Created concept node
   */
  async addLegalConcept(concept) {
    const {
      id = uuidv4(),
      name,
      description,
      legalDomainId
    } = concept;
    
    const conceptProps = {
      id,
      name,
      description,
      legal_domain_id: legalDomainId,
      created_at: new Date().toISOString()
    };
    
    const { query, params } = CypherQueryBuilder.createNode('LegalConcept', conceptProps);
    const result = await executeQuery(query, params);
    
    // Link to legal domain if provided
    if (legalDomainId) {
      await this.linkConceptToLegalDomain(id, legalDomainId);
    }
    
    return result.records[0].get('n').properties;
  }
  
  /**
   * Link a document to a legal concept
   * @param {string} documentId Document ID
   * @param {string} conceptId Concept ID
   * @param {string} relationshipType Type of relationship
   * @returns {Promise<Object>} Created relationship
   */
  async linkDocumentToConcept(documentId, conceptId, relationshipType = 'DISCUSSES') {
    const query = `
      MATCH (doc:Document {id: $documentId})
      MATCH (concept:LegalConcept {id: $conceptId})
      CREATE (doc)-[r:${relationshipType} {created_at: $timestamp}]->(concept)
      RETURN doc, r, concept
    `;
    
    const params = {
      documentId,
      conceptId,
      timestamp: new Date().toISOString()
    };
    
    const result = await executeQuery(query, params);
    return result.records.length > 0 ? result.records[0].get('r').properties : null;
  }
  
  /**
   * Link a document to a jurisdiction
   * @param {string} documentId Document ID
   * @param {string} jurisdictionId Jurisdiction ID
   * @returns {Promise<Object>} Created relationship
   */
  async linkDocumentToJurisdiction(documentId, jurisdictionId) {
    const query = `
      MATCH (doc:Document {id: $documentId})
      MATCH (jurisdiction:Jurisdiction {id: $jurisdictionId})
      CREATE (doc)-[r:BELONGS_TO {created_at: $timestamp}]->(jurisdiction)
      RETURN doc, r, jurisdiction
    `;
    
    const params = {
      documentId,
      jurisdictionId,
      timestamp: new Date().toISOString()
    };
    
    const result = await executeQuery(query, params);
    return result.records.length > 0 ? result.records[0].get('r').properties : null;
  }
  
  /**
   * Link a document to a legal domain
   * @param {string} documentId Document ID
   * @param {string} legalDomainId Legal domain ID
   * @returns {Promise<Object>} Created relationship
   */
  async linkDocumentToLegalDomain(documentId, legalDomainId) {
    const query = `
      MATCH (doc:Document {id: $documentId})
      MATCH (domain:LegalDomain {id: $legalDomainId})
      CREATE (doc)-[r:CATEGORIZED_AS {created_at: $timestamp}]->(domain)
      RETURN doc, r, domain
    `;
    
    const params = {
      documentId,
      legalDomainId,
      timestamp: new Date().toISOString()
    };
    
    const result = await executeQuery(query, params);
    return result.records.length > 0 ? result.records[0].get('r').properties : null;
  }
  
  /**
   * Link a concept to a legal domain
   * @param {string} conceptId Concept ID
   * @param {string} legalDomainId Legal domain ID
   * @returns {Promise<Object>} Created relationship
   */
  async linkConceptToLegalDomain(conceptId, legalDomainId) {
    const query = `
      MATCH (concept:LegalConcept {id: $conceptId})
      MATCH (domain:LegalDomain {id: $legalDomainId})
      CREATE (concept)-[r:BELONGS_TO {created_at: $timestamp}]->(domain)
      RETURN concept, r, domain
    `;
    
    const params = {
      conceptId,
      legalDomainId,
      timestamp: new Date().toISOString()
    };
    
    const result = await executeQuery(query, params);
    return result.records.length > 0 ? result.records[0].get('r').properties : null;
  }
  
  /**
   * Get citation network for a document
   * @param {string} documentId Document ID
   * @param {number} depth Network depth (default: 2)
   * @returns {Promise<Array>} Citation network
   */
  async getCitationNetwork(documentId, depth = 2) {
    const query = `
      MATCH path = (d:Document {id: $documentId})-[:CITES*1..${depth}]->(cited)
      RETURN path
      UNION
      MATCH path = (citing)-[:CITES*1..${depth}]->(d:Document {id: $documentId})
      RETURN path
    `;
    
    const params = { documentId };
    const result = await executeQuery(query, params);
    
    // Transform the result into a network structure
    const network = {
      nodes: new Map(),
      edges: new Map()
    };
    
    result.records.forEach(record => {
      const path = record.get('path');
      const segments = path.segments;
      
      segments.forEach(segment => {
        const startNode = segment.start;
        const endNode = segment.end;
        const relationship = segment.relationship;
        
        // Add nodes
        network.nodes.set(startNode.identity.toString(), {
          id: startNode.identity.toString(),
          properties: startNode.properties
        });
        
        network.nodes.set(endNode.identity.toString(), {
          id: endNode.identity.toString(),
          properties: endNode.properties
        });
        
        // Add edge
        const edgeId = `${startNode.identity}-${relationship.type}-${endNode.identity}`;
        network.edges.set(edgeId, {
          id: edgeId,
          from: startNode.identity.toString(),
          to: endNode.identity.toString(),
          type: relationship.type,
          properties: relationship.properties
        });
      });
    });
    
    return {
      nodes: Array.from(network.nodes.values()),
      edges: Array.from(network.edges.values())
    };
  }
  
  /**
   * Find related legal concepts for a document
   * @param {string} documentId Document ID
   * @returns {Promise<Array>} Related concepts
   */
  async findRelatedConcepts(documentId) {
    const query = `
      MATCH (d:Document {id: $documentId})-[:DISCUSSES]->(c:LegalConcept)
      RETURN c AS concept
      UNION
      MATCH (d:Document {id: $documentId})-[:CITES]->(cited)-[:DISCUSSES]->(c:LegalConcept)
      RETURN c AS concept
    `;
    
    const params = { documentId };
    const result = await executeQuery(query, params);
    
    return result.records.map(record => record.get('concept').properties);
  }
}

module.exports = {
  knowledgeGraphService: new KnowledgeGraphService()
};
