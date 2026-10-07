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
          sections were never live and would restyle tables, cards and modals people already use.
          The modal close (X) is the one other piece installed: flowbite's stock gray-400 icon measured
          2.47:1 on a white modal. */}
      <ThemeProvider theme={{ button: flowbiteTheme.theme.button, modal: { header: { close: flowbiteTheme.theme.modal.header.close } } }}>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
