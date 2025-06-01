import React, { useState } from 'react';
import { Form, Button, Alert, Spinner, Card, ProgressBar } from 'react-bootstrap';
import legalAiService from '../services/legalAiService';

const LegalDocumentSimilarity: React.FC = () => {
  const [document1, setDocument1] = useState<string>('');
  const [document2, setDocument2] = useState<string>('');
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!document1 || !document2) {
      setError('Please enter both documents');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await legalAiService.getSimilarity(document1, document2);
      setSimilarity(result);
    } catch (err: any) {
      setError(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getSimilarityVariant = (): string => {
    if (similarity === null) return 'secondary';
    if (similarity > 0.8) return 'success';
    if (similarity > 0.5) return 'info';
    if (similarity > 0.3) return 'warning';
    return 'danger';
  };
  
  const getSimilarityText = (): string => {
    if (similarity === null) return '';
    if (similarity > 0.8) return 'Very Similar';
    if (similarity > 0.5) return 'Moderately Similar';
    if (similarity > 0.3) return 'Somewhat Similar';
    return 'Not Similar';
  };
  
  return (
    <div className="legal-document-similarity py-3">
      <h3>Legal Document Similarity</h3>
      <p className="text-muted">
        Compare two legal texts to find their semantic similarity.
      </p>
      
      <Form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6">
            <Form.Group className="mb-3">
              <Form.Label>Document 1</Form.Label>
              <Form.Control
                as="textarea"
                value={document1}
                onChange={(e) => setDocument1(e.target.value)}
                placeholder="Enter first legal document"
                rows={8}
              />
            </Form.Group>
          </div>
          
          <div className="col-md-6">
            <Form.Group className="mb-3">
              <Form.Label>Document 2</Form.Label>
              <Form.Control
                as="textarea"
                value={document2}
                onChange={(e) => setDocument2(e.target.value)}
                placeholder="Enter second legal document"
                rows={8}
              />
            </Form.Group>
          </div>
        </div>
        
        <Button 
          type="submit" 
          variant="primary"
          disabled={isLoading}
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
              Calculating...
            </>
          ) : 'Calculate Similarity'}
        </Button>
      </Form>
      
      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}
      
      {similarity !== null && (
        <Card className="mt-4">
          <Card.Body className="text-center">
            <h4>Similarity Score</h4>
            <h2>{(similarity * 100).toFixed(2)}%</h2>
            <ProgressBar
              now={similarity * 100}
              variant={getSimilarityVariant()}
              className="my-3"
            />
            <div className="text-muted">{getSimilarityText()}</div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default LegalDocumentSimilarity;
