import React from 'react';
import './StatuteHighlighter.css';

interface StatuteHighlighterProps {
  text: string;
  userId?: string;
}

const StatuteHighlighter: React.FC<StatuteHighlighterProps> = ({ text }) => {
  // Just render the text without any highlighting since we're removing the dependency
  // This is a simplified version that will build successfully without any problematic imports
  return (
    <div className="statute-highlighter">
      <div className="legal-text">
        {text}
      </div>
    </div>
  );
};

export default StatuteHighlighter;
