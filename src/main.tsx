import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { applyPalette } from './theme';

applyPalette();

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
