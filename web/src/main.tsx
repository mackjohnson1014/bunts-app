import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerServiceWorker } from './push';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register early so the worker is installed and ready before anyone taps
// "Enable alerts" -- subscribing needs an active registration.
void registerServiceWorker();
