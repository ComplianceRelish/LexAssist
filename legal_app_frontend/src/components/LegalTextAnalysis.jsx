import React, { useState } from 'react';
import { Form, Button, Alert, Spinner, Card } from 'react-bootstrap';
import { legalAiService } from '../services/legalAiService';

const LegalTextAnalysis = () => {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!text) {
      setError('Please enter some legal text to analyze');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const results = await legalAiService.analyzeText(text);
      setAnalysis(results);
    } catch (err) {
      setError(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="legal-text-analysis py-3">
      <h3>Legal Text Analysis</h3>
      <p className="text-muted">
        Analyze legal text to extract key information and metrics.
      </p>
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Enter legal text to analyze</Form.Label>
          <Form.Control
            as="textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter legal text to analyze"
            rows={8}
          />
        </Form.Group>
        
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
              Analyzing...
            </>
          ) : 'Analyze Text'}
        </Button>
      </Form>
      
      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}
      
      {analysis && (
        <div className="mt-4">
          <h4>Analysis Results</h4>
          <Card>
            <Card.Body>
              <div className="row">
                <div className="col-md-4">
                  <div className="d-flex flex-column align-items-center mb-3">
                    <h6>Text Complexity</h6>
                    <div className="display-6">{(analysis.text_complexity * 100).toFixed(0)}%</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="d-flex flex-column align-items-center mb-3">
                    <h6>Token Count</h6>
                    <div className="display-6">{analysis.token_count}</div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="d-flex flex-column align-items-center mb-3">
                    <h6>Embedding Size</h6>
                    <div className="display-6">{analysis.embedding_dimension}</div>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LegalTextAnalysis;
