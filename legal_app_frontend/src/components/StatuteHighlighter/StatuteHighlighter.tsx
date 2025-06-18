import React, { useState, useEffect } from 'react';
import { apiService, LegalTextAnalysisResponse } from '../../services/api.service';
import './StatuteHighlighter.css';
import { Tooltip, CircularProgress, Box, Typography, Chip, Alert } from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';

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
        <Tooltip 
          key={`statute-${index}`}
          title={
            <Box p={1}>
              <Typography variant="subtitle2">{statute.act} {statute.section}</Typography>
              <Typography variant="body2">{statute.title}</Typography>
            </Box>
          }
          arrow
        >
          <span className="highlighted-statute">
            {text.substring(statute.startIndex, statute.endIndex)}
            <GavelIcon fontSize="small" className="statute-icon" />
          </span>
        </Tooltip>
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
      <Box textAlign="center" my={2}>
        <CircularProgress size={20} /> 
        <Typography variant="body2" color="textSecondary" ml={1} component="span">
          Identifying statutes...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <div>
        <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>
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
        <Box mt={2}>
          <Typography variant="subtitle2" gutterBottom>Referenced Statutes:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {statutes.map((statute, index) => (
              <Chip 
                key={`chip-${index}`}
                icon={<GavelIcon />}
                label={`${statute.act} ${statute.section}`}
                color="primary"
                variant="outlined"
                size="small"
                title={statute.title}
              />
            ))}
          </Box>
        </Box>
      )}
      {!inlegalBERTAvailable && (
        <Alert severity="info" sx={{ mt: 2 }}>
          InLegalBERT is currently unavailable. Statute highlighting is disabled.
        </Alert>
      )}
    </div>
  );
};

export default StatuteHighlighter;
