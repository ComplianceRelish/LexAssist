// Node labels
CREATE CONSTRAINT document_id IF NOT EXISTS ON (d:Document) ASSERT d.id IS UNIQUE;
CREATE CONSTRAINT legal_concept_id IF NOT EXISTS ON (c:LegalConcept) ASSERT c.id IS UNIQUE;
CREATE CONSTRAINT jurisdiction_id IF NOT EXISTS ON (j:Jurisdiction) ASSERT j.id IS UNIQUE;
CREATE CONSTRAINT court_id IF NOT EXISTS ON (c:Court) ASSERT c.id IS UNIQUE;
CREATE CONSTRAINT legal_domain_id IF NOT EXISTS ON (d:LegalDomain) ASSERT d.id IS UNIQUE;
CREATE CONSTRAINT statute_id IF NOT EXISTS ON (s:Statute) ASSERT s.id IS UNIQUE;
CREATE CONSTRAINT case_law_id IF NOT EXISTS ON (c:CaseLaw) ASSERT c.id IS UNIQUE;

// Document type labels
// Documents can be either CaseLaw, Statute, or other types
CREATE CONSTRAINT document_type_id IF NOT EXISTS ON (d:Document) ASSERT d.document_type IS NOT NULL;

// Citation relationship index for fast traversal
CREATE INDEX citation_index IF NOT EXISTS FOR ()-[r:CITES]->() ON (r.citation_text);

// Hierarchical jurisdiction indexing
CREATE INDEX jurisdiction_hierarchy IF NOT EXISTS FOR ()-[r:PART_OF]->() ON (r.level);

// Legal concept hierarchy
CREATE INDEX concept_hierarchy IF NOT EXISTS FOR ()-[r:IS_A]->() ON (r.relationship_type);
