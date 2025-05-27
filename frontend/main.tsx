import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

try {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Application failed to start:', error);
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 2rem; color: red; font-family: sans-serif;">
        <h2>Application Error</h2>
        <p>Failed to initialize application</p>
        <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
        <button onclick="window.location.reload()">Refresh Page</button>
      </div>
    `;
  }
}