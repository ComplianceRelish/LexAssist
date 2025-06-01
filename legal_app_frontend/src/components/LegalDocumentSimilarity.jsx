import React, { useState } from 'react';
import { legalAiService } from '../services/legalAiService';

const LegalDocumentSimilarity = () => {
  const [document1, setDocument1] = useState('');
  const [document2, setDocument2] = useState('');
  const [similarity, setSimilarity] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
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
    } catch (err) {
      setError(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const getSimilarityColor = () => {
    if (similarity === null) return 'bg-secondary';
    if (similarity > 0.8) return 'bg-success';
    if (similarity > 0.5) return 'bg-warning';
    return 'bg-danger';
  };
  
  return (
    <div className="legal-document-similarity">
      <h2>Legal Document Similarity</h2>
      <p className="text-muted">
        Compare two legal texts to calculate their semantic similarity
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="row">
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label>Document 1</label>
              <textarea
                className="form-control"
                value={document1}
                onChange={(e) => setDocument1(e.target.value)}
                placeholder="Enter first legal document"
                rows={8}
              />
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="form-group mb-3">
              <label>Document 2</label>
              <textarea
                className="form-control"
                value={document2}
                onChange={(e) => setDocument2(e.target.value)}
                placeholder="Enter second legal document"
                rows={8}
              />
            </div>
          </div>
        </div>
        
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Calculating...' : 'Calculate Similarity'}
        </button>
      </form>
      
      {error && (
        <div className="alert alert-danger mt-3">
          {error}
        </div>
      )}
      
      {similarity !== null && (
        <div className="results mt-4 text-center">
          <h3>Similarity Score</h3>
          <div className={`similarity-score ${getSimilarityColor()} text-white p-3 rounded`}>
            <h1>{(similarity * 100).toFixed(2)}%</h1>
          </div>
          <p className="mt-2">
            {similarity > 0.8 ? 'Very similar documents' : 
             similarity > 0.5 ? 'Moderately similar documents' : 
             'Documents are not very similar'}
          </p>
        </div>
      )}
    </div>
  );
};

export default LegalDocumentSimilarity;
