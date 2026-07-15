import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'lenis/dist/lenis.css';
import './styles/fonts.css';
import './styles/production.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
