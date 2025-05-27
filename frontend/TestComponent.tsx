import React from 'react';

const TestComponent: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f0f4f8', 
      borderRadius: '8px',
      margin: '40px auto',
      maxWidth: '600px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ color: '#0a2e5c' }}>LexAssist Test Page</h1>
      <p>If you can see this content, React is working correctly!</p>
      <p>This is a minimal test component to verify rendering.</p>
      <div style={{ marginTop: '20px' }}>
        <button style={{ 
          padding: '8px 16px', 
          backgroundColor: '#0a2e5c', 
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          Test Button
        </button>
      </div>
    </div>
  );
};

export default TestComponent;
