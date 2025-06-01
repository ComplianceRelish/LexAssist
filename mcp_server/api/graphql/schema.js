const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # Main types
  type User {
    id: ID!
    email: String!
    fullName: String
    organization: String
    subscription: Subscription
    lastActive: String
  }

  type Subscription {
    id: ID!
    planType: String!
    status: String!
    startDate: String!
    endDate: String
  }

  type LegalDomain {
    id: ID!
    name: String!
    parentDomain: LegalDomain
    subDomains: [LegalDomain]
    description: String
  }

  type Jurisdiction {
    id: ID!
    name: String!
    level: JurisdictionLevel!
    parent: Jurisdiction
    children: [Jurisdiction]
    description: String
  }

  enum JurisdictionLevel {
    INTERNATIONAL
    NATIONAL
    STATE
    LOCAL
  }

  type LegalSource {
    id: ID!
    name: String!
    sourceType: String!
    jurisdiction: Jurisdiction
    weight: Int!
  }

  type Client {
    id: ID!
    name: String!
    email: String
    phone: String
    address: String
    notes: String
    user: User!
    cases: [Case]
  }

  type Case {
    id: ID!
    title: String!
    caseNumber: String
    jurisdiction: Jurisdiction
    legalDomain: LegalDomain
    status: String!
    description: String
    client: Client
    user: User!
    diaryEntries: [CaseDiaryEntry]
    documents: [Document]
    createdAt: String!
    updatedAt: String!
  }

  type CaseDiaryEntry {
    id: ID!
    case: Case!
    entryText: String!
    entryDate: String!
    entryType: String
  }

  type Document {
    id: ID!
    title: String!
    documentType: String!
    jurisdiction: Jurisdiction
    legalDomain: LegalDomain
    filePath: String
    content: String
    citation: String
    source: LegalSource
    publishedDate: String
    user: User
    case: Case
    chunks: [DocumentChunk]
    citations: [Citation]
    createdAt: String!
    updatedAt: String!
  }

  type DocumentChunk {
    id: ID!
    document: Document!
    chunkIndex: Int!
    chunkText: String!
    metadata: JSON
  }

  type Citation {
    id: ID!
    sourceDocument: Document!
    targetDocument: Document!
    citationText: String!
    context: String
  }

  type SearchResult {
    id: ID!
    document: Document!
    chunk: DocumentChunk
    score: Float!
    highlights: [String]
  }

  # Complex types for legal research
  type LegalResearchResult {
    query: String!
    results: [SearchResult]
    suggestedQueries: [String]
    relatedConcepts: [LegalConcept]
    jurisdiction: Jurisdiction
    legalDomain: LegalDomain
  }

  type LegalConcept {
    id: ID!
    name: String!
    description: String
    relatedConcepts: [LegalConcept]
    relevantDocuments: [Document]
  }

  # JSON scalar for flexible metadata
  scalar JSON

  # Input types for mutations
  input LegalSearchInput {
    query: String!
    jurisdictionId: ID
    legalDomainId: ID
    filters: JSON
    limit: Int
  }

  input DocumentProcessInput {
    title: String!
    documentType: String!
    jurisdictionId: ID
    legalDomainId: ID
    content: String
    filePath: String
    citation: String
    sourceId: ID
    publishedDate: String
    caseId: ID
  }

  # Queries
  type Query {
    # User related queries
    me: User
    user(id: ID!): User
    
    # Reference data queries
    legalDomains(parentId: ID): [LegalDomain]
    jurisdictions(level: JurisdictionLevel, parentId: ID): [Jurisdiction]
    legalSources(jurisdictionId: ID): [LegalSource]
    
    # Client and case management
    clients: [Client]
    client(id: ID!): Client
    cases(clientId: ID, status: String): [Case]
    case(id: ID!): Case
    caseDiaryEntries(caseId: ID!): [CaseDiaryEntry]
    
    # Document management
    documents(caseId: ID, userId: ID): [Document]
    document(id: ID!): Document
    documentChunks(documentId: ID!): [DocumentChunk]
    
    # Legal research
    legalSearch(input: LegalSearchInput!): LegalResearchResult
    similarDocuments(documentId: ID!, limit: Int): [SearchResult]
    citationNetwork(documentId: ID!, depth: Int): [Citation]
    legalConcepts(query: String, domainId: ID): [LegalConcept]
  }

  # Mutations
  type Mutation {
    # User management
    updateProfile(fullName: String, organization: String): User
    
    # Client management
    createClient(name: String!, email: String, phone: String, address: String, notes: String): Client
    updateClient(id: ID!, name: String, email: String, phone: String, address: String, notes: String): Client
    deleteClient(id: ID!): Boolean
    
    # Case management
    createCase(title: String!, clientId: ID, caseNumber: String, jurisdictionId: ID, legalDomainId: ID, description: String): Case
    updateCase(id: ID!, title: String, clientId: ID, caseNumber: String, jurisdictionId: ID, legalDomainId: ID, status: String, description: String): Case
    deleteCase(id: ID!): Boolean
    
    # Case diary entries
    addCaseDiaryEntry(caseId: ID!, entryText: String!, entryDate: String, entryType: String): CaseDiaryEntry
    updateCaseDiaryEntry(id: ID!, entryText: String, entryDate: String, entryType: String): CaseDiaryEntry
    deleteCaseDiaryEntry(id: ID!): Boolean
    
    # Document management
    processDocument(input: DocumentProcessInput!): Document
    deleteDocument(id: ID!): Boolean
    
    # Legal research
    saveSearch(query: String!, jurisdictionId: ID, legalDomainId: ID): Boolean
  }
`;

module.exports = typeDefs;
