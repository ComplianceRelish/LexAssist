import React, { useState, useRef, useEffect } from 'react';
import { analyzeBrief } from './utils/api';

interface BriefInputProps {
  isLoggedIn: boolean;
}

const BriefInput: React.FC<BriefInputProps> = ({ isLoggedIn }) => {
  const [brief, setBrief] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Clear timer on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    if (brief.trim()) {
      setLoading(true);
      try {
        const res = await analyzeBrief(brief);
        setResult(res);
      } catch (err) {
        setError((err as Error).message || 'Failed to analyze brief');
      } finally {
        setLoading(false);
      }
    }
  };

  
  const handleVoiceInput = () => {
    if (!isLoggedIn) {
      setShowLoginPrompt(true);
      return;
    }
    
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // In a real app, this would process the voice recording
      // For now, we'll just simulate it by adding a note to the brief
      const voiceText = "This is simulated voice input for the demo. In a real application, this would be the transcribed text from your voice recording.";
      const updatedBrief = brief ? `${brief}\n\n[Voice Input]:\n${voiceText}` : voiceText;
      setBrief(updatedBrief);
      
      // Submit the brief with voice input flag
      setLoading(true);
      setError(null);
      setResult(null);
      analyzeBrief(updatedBrief)
        .then(res => setResult(res))
        .catch(err => setError(err.message || 'Failed to analyze brief'))
        .finally(() => setLoading(false));
    } else {
      // Start recording
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="lex-card mb-8">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="brief" className="block text-lg font-medium text-gray-700 mb-2">
            Enter Your Case Brief
          </label>
          <textarea
            id="brief"
            rows={8}
            className="lex-input"
            placeholder="Describe your case in detail, including relevant facts, legal issues, and any specific questions you have..."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        {loading && <div className="text-blue-600 mb-2">Analyzing...</div>}
        {result && (
          <div className="bg-green-100 p-2 rounded mb-2">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center mb-4 sm:mb-0">
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`flex items-center px-4 py-2 rounded-md mr-4 ${
                isRecording 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isRecording ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                  Stop Recording ({formatTime(recordingTime)})
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  Voice Input
                </>
              )}
            </button>
            
            {showLoginPrompt && !isLoggedIn && (
              <span className="text-red-600 text-sm">
                Please log in to use this feature
              </span>
            )}
          </div>
          
          <button
            type="submit"
            className="lex-button-primary w-full sm:w-auto flex items-center justify-center"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
            </svg>
            Analyze Brief
          </button>
        </div>
      </form>
    </div>
  );
};

export default BriefInput;
