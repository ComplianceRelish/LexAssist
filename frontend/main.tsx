import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Changed from App.css to index.css
import './App.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to initialize app:', error);
  rootElement.innerHTML = `
    <div style="padding: 2rem; color: red; font-family: sans-serif;">
      <h1>Application Error</h1>
      <p>Failed to load the application. Please refresh or contact support.</p>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
}
