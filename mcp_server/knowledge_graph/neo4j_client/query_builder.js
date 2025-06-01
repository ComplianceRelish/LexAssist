class CypherQueryBuilder {
  /**
   * Create a node creation query
   * @param {string} label Node label
   * @param {Object} properties Node properties
   * @param {string} variableName Optional variable name for the node
   * @returns {Object} Query and parameters
   */
  static createNode(label, properties, variableName = 'n') {
    const params = { props: properties };
    const query = `CREATE (${variableName}:${label} $props) RETURN ${variableName}`;
    return { query, params };
  }

  /**
   * Create a relationship creation query
   * @param {string} fromLabel Source node label
   * @param {Object} fromProps Source node properties to match
   * @param {string} toLabel Target node label
   * @param {Object} toProps Target node properties to match
   * @param {string} relType Relationship type
   * @param {Object} relProps Relationship properties
   * @returns {Object} Query and parameters
   */
  static createRelationship(fromLabel, fromProps, toLabel, toProps, relType, relProps = {}) {
    const params = {
      fromProps,
      toProps,
      relProps
    };
    
    const query = `
      MATCH (a:${fromLabel}), (b:${toLabel})
      WHERE a = $fromProps AND b = $toProps
      CREATE (a)-[r:${relType} $relProps]->(b)
      RETURN a, r, b
    `;
    
    return { query, params };
  }

  /**
   * Find nodes by label and properties
   * @param {string} label Node label
   * @param {Object} properties Node properties to match
   * @returns {Object} Query and parameters
   */
  static findNodes(label, properties = {}) {
    const params = { props: properties };
    const whereClause = Object.keys(properties).length > 0 ? 'WHERE n = $props' : '';
    
    const query = `
      MATCH (n:${label})
      ${whereClause}
      RETURN n
    `;
    
    return { query, params };
  }

  /**
   * Find relationships between nodes
   * @param {string} fromLabel Source node label
   * @param {Object} fromProps Source node properties to match
   * @param {string} toLabel Target node label
   * @param {Object} toProps Target node properties to match
   * @param {string} relType Relationship type (optional)
   * @returns {Object} Query and parameters
   */
  static findRelationships(fromLabel, fromProps, toLabel, toProps, relType = null) {
    const params = {
      fromProps,
      toProps
    };
    
    const relPattern = relType ? `[r:${relType}]` : '[r]';
    
    const query = `
      MATCH (a:${fromLabel})-${relPattern}->(b:${toLabel})
      WHERE a = $fromProps AND b = $toProps
      RETURN a, r, b
    `;
    
    return { query, params };
  }

  /**
   * Find paths between nodes
   * @param {string} startLabel Start node label
   * @param {Object} startProps Start node properties
   * @param {string} endLabel End node label
   * @param {Object} endProps End node properties
   * @param {number} maxDepth Maximum path depth
   * @returns {Object} Query and parameters
   */
  static findPaths(startLabel, startProps, endLabel, endProps, maxDepth = 3) {
    const params = {
      startProps,
      endProps,
      maxDepth
    };
    
    const query = `
      MATCH path = (start:${startLabel})-[*1..${maxDepth}]->(end:${endLabel})
      WHERE start = $startProps AND end = $endProps
      RETURN path
    `;
    
    return { query, params };
  }

  /**
   * Search for nodes with text properties matching a query
   * @param {Array<string>} labels Node labels to search
   * @param {Array<string>} properties Node properties to search in
   * @param {string} searchText Text to search for
   * @param {number} limit Result limit
   * @returns {Object} Query and parameters
   */
  static textSearch(labels, properties, searchText, limit = 10) {
    const labelPattern = labels.join('|');
    const propMatches = properties.map(prop => `n.${prop} CONTAINS $searchText`).join(' OR ');
    
    const params = {
      searchText,
      limit: neo4j.int(limit)
    };
    
    const query = `
      MATCH (n:${labelPattern})
      WHERE ${propMatches}
      RETURN n
      LIMIT $limit
    `;
    
    return { query, params };
  }
}

module.exports = {
  CypherQueryBuilder
};
