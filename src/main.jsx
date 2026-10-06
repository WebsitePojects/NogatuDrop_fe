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
      {/* Only the button colors are installed: the theme file nests everything under `theme`, so passing
          the whole object styled nothing and Approve/Reject/Verify rendered as plain text. The other
          sections were never live and would restyle tables, cards and modals people already use. */}
      <ThemeProvider theme={{ button: flowbiteTheme.theme.button }}>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
