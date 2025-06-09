// src/components/LegalAI/StreamingQueryInterface.jsx

import React, { useState, useRef, useEffect } from 'react';

const StreamingQueryInterface = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef(null);

  const handleStreamQuery = async () => {
    if (!query.trim()) return;

    setIsStreaming(true);
    setResponse('');

    try {
      const token = localStorage.getItem('accessToken');
      
      // Create EventSource for streaming
      const eventSource = new EventSource(
        `${process.env.REACT_APP_API_URL}/api/legal-query/stream`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'content') {
          setResponse(prev => prev + data.content);
        } else if (data.type === 'complete') {
          setIsStreaming(false);
          eventSource.close();
        } else if (data.type === 'error') {
          console.error('Streaming error:', data.content);
          setIsStreaming(false);
          eventSource.close();
        }
      };

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error);
        setIsStreaming(false);
        eventSource.close();
      };

      // Send the query via POST (you'll need to modify this)
      await fetch(`${process.env.REACT_APP_API_URL}/api/legal-query/stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query.trim(),
          query_type: 'legal_advice'
        })
      });

    } catch (error) {
      console.error('Failed to start streaming:', error);
      setIsStreaming(false);
    }
  };

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      setIsStreaming(false);
    }
  };

  return (
    <div className="streaming-query-interface">
      <div className="query-input mb-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter your legal question..."
          rows={4}
          className="form-control"
          disabled={isStreaming}
        />
      </div>
      
      <div className="control-buttons mb-3">
        <button
          onClick={handleStreamQuery}
          disabled={isStreaming || !query.trim()}
          className="btn btn-primary me-2"
        >
          {isStreaming ? 'Analyzing...' : 'Ask Legal AI'}
        </button>
        
        {isStreaming && (
          <button onClick={stopStreaming} className="btn btn-secondary">
            Stop
          </button>
        )}
      </div>

      <div className="response-area">
        <div className="response-header d-flex justify-content-between">
          <h5>AI Response</h5>
          {isStreaming && (
            <div className="streaming-indicator">
              <span className="spinner-border spinner-border-sm me-2"></span>
              Streaming...
            </div>
          )}
        </div>
        
        <div className="response-content p-3 border rounded">
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
            {response}
            {isStreaming && <span className="cursor-blink">|</span>}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default StreamingQueryInterface;