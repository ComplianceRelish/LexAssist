import React, { useState } from 'react';
import { Form, Button, Alert, Spinner, ListGroup, Badge } from 'react-bootstrap';
import legalAiService from '../services/legalAiService';

interface Prediction {
  token: string;
  score: number;
  sequence: string;
}

const LegalTextCompletion: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!inputText || !inputText.includes('[MASK]')) {
      setError('Please enter text with at least one [MASK] token');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const results = await legalAiService.fillMask(inputText);
      setPredictions(results);
    } catch (err: any) {
      setError(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleInsertMask = (): void => {
    setInputText(prev => prev + ' [MASK] ');
  };
  
  const examplePrompts: string[] = [
    "The court [MASK] the petition filed by the appellant.",
    "The petitioner seeks [MASK] of the order dated 10th January.",
    "According to Section 302 of IPC, whoever commits murder shall be [MASK] with death."
  ];
  
  return (
    <div className="legal-text-completion py-3">
      <h3>Legal Text Completion</h3>
      <p className="text-muted">
        Enter legal text with [MASK] tokens to get predictions for the masked words.
      </p>
      
      <div className="mb-3">
        <h6>Example prompts:</h6>
        <div className="d-flex flex-wrap gap-2">
          {examplePrompts.map((prompt, i) => (
            <Badge 
              key={i} 
              bg="light" 
              text="dark" 
              className="p-2 clickable"
              onClick={() => setInputText(prompt)}
              style={{ cursor: 'pointer' }}
            >
              {prompt}
            </Badge>
          ))}
        </div>
      </div>
      
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Enter legal text with [MASK] token</Form.Label>
          <div className="d-flex gap-2 mb-2">
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={handleInsertMask}
            >
              Insert [MASK] token
            </Button>
          </div>
          <Form.Control
            as="textarea"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text with [MASK] tokens"
            rows={5}
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
              Processing...
            </>
          ) : 'Complete Text'}
        </Button>
      </Form>
      
      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}
      
      {predictions.length > 0 && (
        <div className="mt-4">
          <h4>Predictions</h4>
          <ListGroup>
            {predictions.map((pred, index) => (
              <ListGroup.Item key={index} className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h5 className="mb-0">{pred.token}</h5>
                    <Badge bg="primary">{(pred.score * 100).toFixed(2)}%</Badge>
                  </div>
                  <div>{pred.sequence}</div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </div>
      )}
    </div>
  );
};

export default LegalTextCompletion;
