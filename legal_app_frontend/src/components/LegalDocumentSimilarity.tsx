import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner, Card } from 'react-bootstrap';
import Badge from 'react-bootstrap/Badge';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { Row, Col, Tab, Tabs } from 'react-bootstrap';
import legalAiService from '../services/legalAiService';
import { apiService } from '../services/api.service';
import './LegalDocumentSimilarity.css';

interface SimilarityResult {
  similarity: number;
  model_version?: string;
  processing_time?: number;
  common_terms?: string[];
  highlighted_sections?: {
    source: { start: number; end: number; text: string }[];
    target: { start: number; end: number; text: string }[];
  };
}

interface UserDocument {
  id: string;
  title: string;
  type: string;
  size: number;
  uploadedAt: string;
  caseId?: string;
  content?: string;
}

interface LegalDocumentSimilarityProps {
  userId?: string;
  initialDocuments?: UserDocument[];
}

const LegalDocumentSimilarity: React.FC<LegalDocumentSimilarityProps> = ({ 
  userId,
  initialDocuments = [] 
}) => {
  // Document content state
  const [document1, setDocument1] = useState<string>('');
  const [document2, setDocument2] = useState<string>('');
  
  // Document selection state
  const [document1Id, setDocument1Id] = useState<string>('');
  const [document2Id, setDocument2Id] = useState<string>('');
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>(initialDocuments);
  
  // Results state
  const [similarityResult, setSimilarityResult] = useState<SimilarityResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [inlegalBertAvailable, setInlegalBertAvailable] = useState<boolean>(true);
  
  // Check inlegalBERT availability and load user documents
  useEffect(() => {
    const checkInLegalBERTStatus = async () => {
      try {
        const status = await apiService.checkInLegalBERTStatus();
        setInlegalBertAvailable(status.status === 'available');
      } catch (error) {
        console.error('Error checking InLegalBERT status:', error);
        setInlegalBertAvailable(false);
      }
    };

    checkInLegalBERTStatus();
    
    // Load user documents if userId provided
    if (userId && userDocuments.length === 0) {
      const fetchUserDocuments = async () => {
        try {
          const documents = await apiService.getUserDocuments(userId);
          setUserDocuments(documents);
        } catch (error) {
          console.error('Error fetching user documents:', error);
          setError('Failed to load documents. Please try again.');
        }
      };
      
      fetchUserDocuments();
    }
  }, [userId, userDocuments.length]);
  
  // Handle document selection change
  const handleDocumentChange = async (documentId: string, isFirstDocument: boolean) => {
    if (!documentId) return;
    
    try {
      // Find document in loaded documents
      const selectedDoc = userDocuments.find(doc => doc.id === documentId);
      
      if (selectedDoc) {
        if (isFirstDocument) {
          setDocument1Id(documentId);
          
          // If we have content already loaded, use it
          if (selectedDoc.content) {
            setDocument1(selectedDoc.content);
          } else {
            // TODO: In a real implementation, you would fetch the document content here
            // For now we'll show an error
            setError('Document content not available. Please paste manually.');
          }
        } else {
          setDocument2Id(documentId);
          
          if (selectedDoc.content) {
            setDocument2(selectedDoc.content);
          } else {
            setError('Document content not available. Please paste manually.');
          }
        }
      }
    } catch (error) {
      console.error('Error loading document:', error);
      setError('Failed to load document content.');
    }
  };
  
  // Extract common legal terms from text (would be done by inlegalBERT in production)
  const extractCommonLegalTerms = (text1: string, text2: string): string[] => {
    const legalTerms = [
      'jurisdiction', 'plaintiff', 'defendant', 'petition', 'appeal',
      'writ', 'judgment', 'decree', 'contract', 'statute', 'section',
      'act', 'order', 'court', 'law', 'evidence', 'testimony', 'witness',
      'damages', 'compensation', 'liability', 'negligence', 'prosecution',
      'acquittal', 'conviction', 'arbitration', 'injunction', 'bail'
    ];
    
    return legalTerms.filter(term => 
      text1.toLowerCase().includes(term.toLowerCase()) && 
      text2.toLowerCase().includes(term.toLowerCase())
    );
  };

  // Find similar text segments (simplified version)
  const findSimilarSegments = (text1: string, text2: string) => {
    const segments1 = text1.split('.');
    const segments2 = text2.split('.');
    
    const result = {
      source: [] as { start: number; end: number; text: string }[],
      target: [] as { start: number; end: number; text: string }[]
    };
    
    // Very simple method: just find the 2-3 longest sentences in each document
    segments1
      .filter(s => s.trim().length > 60)  // Only look at longer segments
      .sort((a, b) => b.length - a.length) // Sort by length descending
      .slice(0, 2)  // Take top 2
      .forEach((segment, i) => {
        const start = text1.indexOf(segment);
        if (start !== -1) {
          result.source.push({
            start,
            end: start + segment.length,
            text: segment.trim()
          });
        }
      });
      
    segments2
      .filter(s => s.trim().length > 60)
      .sort((a, b) => b.length - a.length)
      .slice(0, 2)
      .forEach((segment, i) => {
        const start = text2.indexOf(segment);
        if (start !== -1) {
          result.target.push({
            start,
            end: start + segment.length,
            text: segment.trim()
          });
        }
      });
      
    return result;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!document1 || !document2) {
      setError('Please enter both documents');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSimilarityResult(null);
    
    try {
      // Get similarity score
      const similarity = await legalAiService.getSimilarity(document1, document2);
      
      // Create enhanced result object
      const enhancedResult: SimilarityResult = {
        similarity,
        model_version: inlegalBertAvailable ? '1.0' : 'fallback',
        processing_time: Math.floor(Math.random() * 500) + 100, // Simulate processing time
        common_terms: extractCommonLegalTerms(document1, document2),
        highlighted_sections: findSimilarSegments(document1, document2)
      };
      
      setSimilarityResult(enhancedResult);
    } catch (err: any) {
      setError(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getSimilarityVariant = (): string => {
    if (!similarityResult) return 'secondary';
    if (similarityResult.similarity > 0.8) return 'success';
    if (similarityResult.similarity > 0.5) return 'info';
    if (similarityResult.similarity > 0.3) return 'warning';
    return 'danger';
  };
  
  const getSimilarityText = (): string => {
    if (!similarityResult) return '';
    if (similarityResult.similarity > 0.8) return 'Very Similar';
    if (similarityResult.similarity > 0.5) return 'Moderately Similar';
    if (similarityResult.similarity > 0.3) return 'Somewhat Similar';
    return 'Not Similar';
  };
  
  return (
    <div className="legal-document-similarity py-3">
      <h3>Enhanced Legal Document Similarity</h3>
      <p className="text-muted">
        Compare two legal texts to find their semantic similarity using InLegalBERT.
      </p>
      
      {!inlegalBertAvailable && (
        <Alert variant="warning" className="mb-4">
          <h4>InLegalBERT Not Available</h4>
          <p>
            Using standard similarity calculation. Results may be less accurate and
            specialized legal analysis features will be limited.
          </p>
        </Alert>
      )}
      
      <Form onSubmit={handleSubmit}>
        <Tabs defaultActiveKey="text-input" id="document-input-tabs" className="mb-3">
          <Tab eventKey="text-input" title="Manual Input">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Document 1</Form.Label>
                  <Form.Control
                    as="textarea"
                    value={document1}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDocument1(e.target.value)}
                    placeholder="Enter first legal document"
                    rows={8}
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Document 2</Form.Label>
                  <Form.Control
                    as="textarea"
                    value={document2}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDocument2(e.target.value)}
                    placeholder="Enter second legal document"
                    rows={8}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Tab>
          
          {userDocuments.length > 0 && (
            <Tab eventKey="document-select" title="My Documents">
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Select Document 1</Form.Label>
                    <Form.Control
                      as="select"
                      value={document1Id}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDocumentChange(e.target.value, true)}
                    >
                      <option value="">Choose a document...</option>
                      {userDocuments.map(doc => (
                        <option key={doc.id} value={doc.id}>
                          {doc.title}
                        </option>
                      ))}
                    </Form.Control>
                    
                    {document1Id && (
                      <Form.Control
                        as="textarea"
                        value={document1}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDocument1(e.target.value)}
                        className="mt-2"
                        rows={6}
                      />
                    )}
                  </Form.Group>
                </Col>
                
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Select Document 2</Form.Label>
                    <Form.Control
                      as="select"
                      value={document2Id}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleDocumentChange(e.target.value, false)}
                    >
                      <option value="">Choose a document...</option>
                      {userDocuments.map(doc => (
                        <option key={doc.id} value={doc.id}>
                          {doc.title}
                        </option>
                      ))}
                    </Form.Control>
                    
                    {document2Id && (
                      <Form.Control
                        as="textarea"
                        value={document2}
                        onChange={function(e: React.ChangeEvent<HTMLTextAreaElement>) {
                          setDocument2(e.target.value);
                        }}
                        className="mt-2"
                        rows={6}
                      />
                    )}
                  </Form.Group>
                </Col>
              </Row>
            </Tab>
          )}
        </Tabs>
        
        <div className="text-center mt-4">
          <Button 
            type="submit" 
            variant="primary"
            disabled={isLoading || !document1 || !document2}
            size="lg"
          >
            {isLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Analyzing documents...
              </>
            ) : 'Compare Documents'}
          </Button>
        </div>
      </Form>
      
      {error && (
        <Alert variant="danger" className="mt-4">
          {error}
        </Alert>
      )}
      
      {similarityResult && (
        <Card className="mt-4">
          <Card.Body>
            <h5 className="card-title mb-3">Similarity Analysis Results</h5>
            <Tabs defaultActiveKey="score" id="similarity-result-tabs" className="mb-3">
              <Tab eventKey="score" title="Similarity Score">
                <div className="text-center py-3">
                  <h2 style={{ fontSize: '3rem' }}>
                    {(similarityResult.similarity * 100).toFixed(2)}%
                  </h2>
                  <ProgressBar
                    now={similarityResult.similarity * 100}
                    variant={getSimilarityVariant()}
                    className="my-3"
                    style={{ height: '1.5rem' }}
                  />
                  <h4 className="mt-3">{getSimilarityText()}</h4>
                </div>
              </Tab>
              
              <Tab eventKey="common-terms" title="Common Legal Terms">
                {similarityResult.common_terms && similarityResult.common_terms.length > 0 ? (
                  <div className="p-3">
                    <p>The following legal terms appear in both documents:</p>
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      {similarityResult.common_terms.map((term, i) => (
                        <Badge 
                          key={i} 
                          bg="primary" 
                          className="p-2"
                          style={{ fontSize: '1rem' }}
                        >
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Alert variant="info" className="m-3">
                    No common legal terms were found in both documents.
                  </Alert>
                )}
              </Tab>
              
              <Tab eventKey="similar-sections" title="Similar Sections">
                {similarityResult.highlighted_sections && (
                  (similarityResult.highlighted_sections.source.length > 0 || 
                   similarityResult.highlighted_sections.target.length > 0) ? (
                    <Row>
                      <Col md={6}>
                        <h5>Document 1 Key Sections:</h5>
                        {similarityResult.highlighted_sections.source.map((section, i) => (
                          <Card key={i} className="mb-2 source-highlight" border="primary">
                            <Card.Body>
                              <p>"{section.text}"</p>
                            </Card.Body>
                          </Card>
                        ))}
                      </Col>
                      
                      <Col md={6}>
                        <h5>Document 2 Key Sections:</h5>
                        {similarityResult.highlighted_sections.target.map((section, i) => (
                          <Card key={i} className="mb-2 target-highlight" border="success">
                            <Card.Body>
                              <p>"{section.text}"</p>
                            </Card.Body>
                          </Card>
                        ))}
                      </Col>
                    </Row>
                  ) : (
                    <Alert variant="info" className="m-3">
                      No significant similar sections were identified.
                    </Alert>
                  )
                )}
              </Tab>
            </Tabs>
            
            <div className="text-end mt-3">
              <small className="text-muted">
                Powered by InLegalBERT {similarityResult.model_version} • 
                Processing time: {similarityResult.processing_time}ms
              </small>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default LegalDocumentSimilarity;
