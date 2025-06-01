import React, { useState } from 'react';
import { legalAiService } from '../services/legalAiService';

const LegalTextCompletion = () => {
  const [inputText, setInputText] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
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
    } catch (err) {
      setError(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="legal-text-completion">
      <h2>Legal Text Completion</h2>
      <p className="text-muted">
        Enter legal text with [MASK] tokens to get predictions
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group mb-3">
          <textarea
            className="form-control"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter legal text with [MASK] tokens, e.g., 'The court [MASK] the petition.'"
            rows={5}
          />
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Complete Text'}
        </button>
      </form>
      
      {error && (
        <div className="alert alert-danger mt-3">
          {error}
        </div>
      )}
      
      {predictions.length > 0 && (
        <div className="results mt-4">
          <h3>Predictions</h3>
          <div className="list-group">
            {predictions.map((pred, index) => (
              <div key={index} className="list-group-item">
                <div className="d-flex justify-content-between">
                  <strong>{pred.token}</strong>
                  <span className="badge bg-primary">{(pred.score * 100).toFixed(2)}%</span>
                </div>
                <p className="mb-0">{pred.sequence}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalTextCompletion;
