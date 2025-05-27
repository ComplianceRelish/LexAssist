import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import './App.css';

// Simple component to test if rendering works
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

// Simple class-based error boundary
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: '20px', color: 'red', backgroundColor: '#ffeeee', border: '1px solid red', margin: '20px'}}>
          <h2>Something went wrong</h2>
          <p>There was an error rendering the application.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// Simple App component
function App() {
  return (
    <Router>
      <div className="app">
        <TestComponent />
      </div>
    </Router>
  );
}

// Wrap App in ErrorBoundary before exporting
export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
