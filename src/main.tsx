import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('アプリの表示領域を取得できませんでした。');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
