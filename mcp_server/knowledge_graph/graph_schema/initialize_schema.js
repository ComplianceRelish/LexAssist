const { executeQuery } = require('../neo4j_client/connection_manager');

/**
 * Initialize the Neo4j schema with constraints and indexes
 */
async function initializeSchema() {
  try {
    console.log('Initializing Neo4j schema...');
    
    // Create constraints for entities
    await executeQuery(`
      CREATE CONSTRAINT document_id IF NOT EXISTS
      FOR (d:Document) 
      REQUIRE d.id IS UNIQUE
    `);
    
    await executeQuery(`
      CREATE CONSTRAINT legal_concept_id IF NOT EXISTS
      FOR (c:LegalConcept) 
      REQUIRE c.id IS UNIQUE
    `);
    
    await executeQuery(`
      CREATE CONSTRAINT jurisdiction_id IF NOT EXISTS
      FOR (j:Jurisdiction) 
      REQUIRE j.id IS UNIQUE
    `);
    
    await executeQuery(`
      CREATE CONSTRAINT court_id IF NOT EXISTS
      FOR (c:Court) 
      REQUIRE c.id IS UNIQUE
    `);
    
    await executeQuery(`
      CREATE CONSTRAINT legal_domain_id IF NOT EXISTS
      FOR (d:LegalDomain) 
      REQUIRE d.id IS UNIQUE
    `);
    
    await executeQuery(`
      CREATE CONSTRAINT statute_id IF NOT EXISTS
      FOR (s:Statute) 
      REQUIRE s.id IS UNIQUE
    `);
    
    await executeQuery(`
      CREATE CONSTRAINT case_law_id IF NOT EXISTS
      FOR (c:CaseLaw) 
      REQUIRE c.id IS UNIQUE
    `);
    
    // Create indexes for common lookups
    await executeQuery(`
      CREATE INDEX document_type_index IF NOT EXISTS
      FOR (d:Document) 
      ON (d.document_type)
    `);
    
    await executeQuery(`
      CREATE INDEX citation_index IF NOT EXISTS
      FOR ()-[r:CITES]->() 
      ON (r.citation_text)
    `);
    
    await executeQuery(`
      CREATE INDEX jurisdiction_hierarchy_index IF NOT EXISTS
      FOR ()-[r:PART_OF]->() 
      ON (r.level)
    `);
    
    await executeQuery(`
      CREATE INDEX concept_hierarchy_index IF NOT EXISTS
      FOR ()-[r:IS_A]->() 
      ON (r.relationship_type)
    `);
    
    console.log('Neo4j schema initialized successfully');
  } catch (error) {
    console.error('Error initializing Neo4j schema:', error);
    throw error;
  }
}

module.exports = {
  initializeSchema
};
