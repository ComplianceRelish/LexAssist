const { neo4jConnectionManager } = require('./knowledge_graph/neo4j_client/connection_manager');
const { knowledgeGraphService } = require('./knowledge_graph/knowledge_graph_service');

async function initializeServer() {
  try {
    // Initialize Neo4j connection
    await neo4jConnectionManager.initialize();
    
    // Initialize knowledge graph schema
    await knowledgeGraphService.initialize();
    
    // ... rest of your server initialization
    
    console.log('Server initialization completed');
  } catch (error) {
    console.error('Error initializing server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await neo4jConnectionManager.close();
  // ... other cleanup
  process.exit(0);
});

initializeServer();
