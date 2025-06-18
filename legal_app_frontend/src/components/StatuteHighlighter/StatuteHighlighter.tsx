import React, { useState, useEffect } from 'react';
import { apiService, LegalTextAnalysisResponse } from '../../services/api.service';
import './StatuteHighlighter.css';
import { OverlayTrigger, Tooltip, Spinner, Alert, Badge } from 'react-bootstrap';
import { FaGavel } from 'react-icons/fa';

interface StatuteHighlighterProps {
  text: string;
  jurisdiction?: string;
  onAnalysisComplete?: (analysis: LegalTextAnalysisResponse) => void;
}

interface HighlightedStatute {
  act: string;
  section: string;
  title: string;
  startIndex: number;
  endIndex: number;
}

const StatuteHighlighter: React.FC<StatuteHighlighterProps> = ({ 
  text, 
  jurisdiction = 'IN',
  onAnalysisComplete 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedText, setHighlightedText] = useState<React.ReactNode[]>([]);
  const [statutes, setStatutes] = useState<HighlightedStatute[]>([]);
  const [inlegalBERTAvailable, setInlegalBERTAvailable] = useState<boolean>(true);

  useEffect(() => {
    // Check if inlegalBERT is available
    const checkInLegalBERTStatus = async () => {
      try {
        const status = await apiService.checkInLegalBERTStatus();
        setInlegalBERTAvailable(status.status === 'ok');
      } catch (error) {
        console.error('Error checking inlegalBERT status:', error);
        setInlegalBERTAvailable(false);
      }
    };

    checkInLegalBERTStatus();
  }, []);

  useEffect(() => {
    if (text && text.length > 5 && inlegalBERTAvailable) {
      analyzeText();
    }
  }, [text, inlegalBERTAvailable]);

  const analyzeText = async () => {
    if (!text || text.length < 5) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const analysis = await apiService.analyzeStatutes(text, jurisdiction);
      
      if (analysis && analysis.statutes && analysis.statutes.length > 0) {
        // Find statutes in the text and mark their positions
        const foundStatutes: HighlightedStatute[] = [];
        
        analysis.statutes.forEach(statute => {
          const fullStatuteText = `${statute.act} ${statute.section}`;
          let startIndex = text.indexOf(fullStatuteText);
          
          // If exact match not found, try to find the section number
          if (startIndex === -1) {
            startIndex = text.indexOf(statute.section);
          }
          
          // If section not found, try to find just the act name
          if (startIndex === -1) {
            startIndex = text.indexOf(statute.act);
          }
          
          if (startIndex !== -1) {
            foundStatutes.push({
              ...statute,
              startIndex,
              endIndex: startIndex + fullStatuteText.length
            });
          }
        });
        
        setStatutes(foundStatutes);
        highlightStatutesInText(foundStatutes);
      } else {
        // No statutes found, just show original text
        setHighlightedText([text]);
      }
      
      if (onAnalysisComplete) {
        onAnalysisComplete(analysis);
      }
      
    } catch (err) {
      console.error('Error analyzing text:', err);
      setError('Error identifying statutes in the text. Falling back to regular view.');
      setHighlightedText([text]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const highlightStatutesInText = (foundStatutes: HighlightedStatute[]) => {
    if (foundStatutes.length === 0) {
      setHighlightedText([text]);
      return;
    }
    
    // Sort statutes by their position in the text
    foundStatutes.sort((a, b) => a.startIndex - b.startIndex);
    
    const fragments: React.ReactNode[] = [];
    let lastIndex = 0;
    
    foundStatutes.forEach((statute, index) => {
      if (statute.startIndex > lastIndex) {
        // Add text before the statute
        fragments.push(text.substring(lastIndex, statute.startIndex));
      }
      
      // Add highlighted statute
      fragments.push(
        <OverlayTrigger
          key={`statute-${index}`}
          placement="top"
          overlay={
            <Tooltip id={`tooltip-${index}`}>
              <div className="p-1">
                <div className="fw-bold">{statute.act} {statute.section}</div>
                <div>{statute.title}</div>
              </div>
            </Tooltip>
          }
        >
          <span className="highlighted-statute">
            {text.substring(statute.startIndex, statute.endIndex)}
            <FaGavel size="sm" className="statute-icon" />
          </span>
        </OverlayTrigger>
      );
      
      lastIndex = statute.endIndex;
    });
    
    // Add any remaining text
    if (lastIndex < text.length) {
      fragments.push(text.substring(lastIndex));
    }
    
    setHighlightedText(fragments);
  };

  if (isAnalyzing) {
    return (
      <div className="text-center my-2">
        <Spinner animation="border" size="sm" />
        <span className="ms-2 text-muted">
          Identifying statutes...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Alert variant="warning" className="mb-2">{error}</Alert>
        <div>{text}</div>
      </div>
    );
  }

  return (
    <div className="statute-highlighter">
      <div className="highlighted-content">
        {highlightedText}
      </div>
      {statutes.length > 0 && (
        <div className="mt-3">
          <h6 className="mb-2">Referenced Statutes:</h6>
          <div className="d-flex flex-wrap gap-2">
            {statutes.map((statute, index) => (
              <Badge 
                key={`chip-${index}`}
                bg="primary"
                className="p-2"
                title={statute.title}
              >
                <FaGavel className="me-1" />
                {`${statute.act} ${statute.section}`}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {!inlegalBERTAvailable && (
        <Alert variant="info" className="mt-2">
          InLegalBERT is currently unavailable. Statute highlighting is disabled.
        </Alert>
      )}
    </div>
  );
};

export default StatuteHighlighter;
