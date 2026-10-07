import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/big-shoulders/800.css';
import '@fontsource/big-shoulders/900.css';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/jetbrains-mono';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
