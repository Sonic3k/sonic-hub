import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/kanit/800-italic.css';
import '@fontsource/kanit/900-italic.css';
import '@fontsource/barlow-semi-condensed/500.css';
import '@fontsource/barlow-semi-condensed/600.css';
import '@fontsource/barlow-semi-condensed/700.css';
import './styles.css';
import App from './App';
import { takeCodeFromAddress } from './code';

// a game that links back here may hand the visitor's code over in the address: taken before anything reads the address
takeCodeFromAddress();
window.addEventListener('hashchange', takeCodeFromAddress);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
