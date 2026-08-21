import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'flowbite-react';
import App from './App';
import { flowbiteTheme } from './theme/flowbiteTheme';
import './index.css';
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={flowbiteTheme}>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
