import React, { useState, useRef, useEffect, useCallback } from 'react';
import { aiChatStream, ChatMessage } from './utils/api';
import './ChatPanel.css';

interface ChatPanelProps {
  briefContext: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTED_QUESTIONS = [
  "What are the strongest arguments for the petitioner?",
  "List all applicable sections and their provisions",
  "What precedents should I cite in court?",
  "What are the potential weaknesses in this case?",
  "Draft a summary of arguments for filing",
  "What evidence do I need to collect?",
  "Explain the limitation period for this case",
  "What interim reliefs can I seek?",
];

const ChatPanel: React.FC<ChatPanelProps> = ({ briefContext, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const cancelRef = useRef<(() => void) | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);
    setStreamingText('');

    let accumulated = '';

    const cancel = await aiChatStream(
      newMessages,
      briefContext,
      (chunk) => {
        accumulated += chunk;
        setStreamingText(accumulated);
      },
      () => {
        setMessages(prev => [...prev, { role: 'assistant', content: accumulated }]);
        setStreamingText('');
        setIsStreaming(false);
      },
      (error) => {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${error}` }]);
        setStreamingText('');
        setIsStreaming(false);
      }
    );

    cancelRef.current = cancel;
  }, [messages, briefContext, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleStop = () => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
    if (streamingText) {
      setMessages(prev => [...prev, { role: 'assistant', content: streamingText + '\n\n[Stopped]' }]);
    }
    setStreamingText('');
    setIsStreaming(false);
  };

  const handleClear = () => {
    setMessages([]);
    setStreamingText('');
    setIsStreaming(false);
  };

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    // Convert markdown-style formatting
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={i} className="chat-h4">{line.slice(4)}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={i} className="chat-h3">{line.slice(3)}</h3>;
      }
      // Bold
      let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Inline code
      processed = processed.replace(/`(.+?)`/g, '<code>$1</code>');
      // Bullet points
      if (processed.startsWith('- ') || processed.startsWith('* ')) {
        return <li key={i} className="chat-li" dangerouslySetInnerHTML={{ __html: processed.slice(2) }} />;
      }
      // Numbered items
      const numMatch = processed.match(/^(\d+)\.\s/);
      if (numMatch) {
        return <li key={i} className="chat-li-num" dangerouslySetInnerHTML={{ __html: processed.slice(numMatch[0].length) }} />;
      }
      // Empty lines
      if (!processed.trim()) return <br key={i} />;
      // Normal paragraph
      return <p key={i} className="chat-p" dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="chat-panel-overlay">
      <div className="chat-panel">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="chat-ai-indicator">
              <span className="chat-ai-dot"></span>
              <span>LexAssist AI</span>
            </div>
            {briefContext && (
              <span className="chat-context-badge">Case context loaded</span>
            )}
          </div>
          <div className="chat-header-actions">
            <button onClick={handleClear} className="chat-btn-ghost" title="Clear chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/>
              </svg>
            </button>
            <button onClick={onClose} className="chat-btn-ghost" title="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && !streamingText && (
            <div className="chat-welcome">
              <div className="chat-welcome-icon">⚖️</div>
              <h3>LexAssist AI Legal Assistant</h3>
              <p>Ask me anything about Indian law, your case strategy, applicable sections, or relevant precedents.</p>
              {briefContext && (
                <p className="chat-welcome-context">
                  I have your case brief loaded. Ask me questions about it!
                </p>
              )}
              <div className="chat-suggestions">
                {SUGGESTED_QUESTIONS.slice(0, briefContext ? 6 : 4).map((q, i) => (
                  <button
                    key={i}
                    className="chat-suggestion-chip"
                    onClick={() => sendMessage(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`chat-message chat-message-${msg.role}`}>
              <div className="chat-message-avatar">
                {msg.role === 'user' ? '👤' : '⚖️'}
              </div>
              <div className="chat-message-content">
                {msg.role === 'assistant' ? (
                  <div className="chat-markdown">{renderContent(msg.content)}</div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Streaming response */}
          {isStreaming && streamingText && (
            <div className="chat-message chat-message-assistant">
              <div className="chat-message-avatar">⚖️</div>
              <div className="chat-message-content">
                <div className="chat-markdown">{renderContent(streamingText)}</div>
                <span className="chat-cursor">▌</span>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isStreaming && !streamingText && (
            <div className="chat-message chat-message-assistant">
              <div className="chat-message-avatar">⚖️</div>
              <div className="chat-message-content">
                <div className="chat-thinking">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="chat-input-area">
          <div className="chat-input-wrapper">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your case, legal provisions, precedents..."
              rows={1}
              disabled={isStreaming}
              className="chat-textarea"
            />
            {isStreaming ? (
              <button type="button" onClick={handleStop} className="chat-btn-stop" title="Stop generating">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="chat-btn-send"
                title="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            )}
          </div>
          <div className="chat-input-footer">
            <span>Powered by Claude AI • Indian Law Specialist</span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
