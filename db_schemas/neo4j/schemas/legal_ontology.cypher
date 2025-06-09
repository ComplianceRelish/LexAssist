// Legal ontology schema for concepts and relationships
CREATE CONSTRAINT concept_name IF NOT EXISTS ON (c:LegalConcept) ASSERT c.name IS UNIQUE;

// Legal principles
CREATE CONSTRAINT principle_id IF NOT EXISTS ON (p:LegalPrinciple) ASSERT p.id IS UNIQUE;

// Doctrine nodes
CREATE CONSTRAINT doctrine_id IF NOT EXISTS ON (d:Doctrine) ASSERT d.id IS UNIQUE;

// Create relationship types for legal reasoning
// APPLIES_TO: A principle applies to a specific legal domain
// SUPPORTS: A case or statute supports a legal principle
// CONTRADICTS: A case or statute contradicts a legal principle
// DISCUSSES: A document discusses a legal concept
// ESTABLISHES: A case establishes a legal principle or doctrine
// OVERRULES: A case overrules a previous case
// DISTINGUISHES: A case distinguishes itself from another case

// Create indexes for common relationship traversals
CREATE INDEX principle_application IF NOT EXISTS FOR ()-[r:APPLIES_TO]->() ON (r.strength);
CREATE INDEX precedent_strength IF NOT EXISTS FOR ()-[r:SUPPORTS]->() ON (r.strength);
CREATE INDEX doctrine_establishment IF NOT EXISTS FOR ()-[r:ESTABLISHES]->() ON (r.significance);
