import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Demande au système de ne jamais vider le stockage de l'app quand l'appareil manque de place.
navigator.storage?.persist?.().catch(() => {});

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Une nouvelle version prend la main juste après l'ouverture → on recharge une fois pour l'afficher tout de suite.
  // Jamais en pleine utilisation (au-delà de 10 s) : elle s'affichera simplement à la prochaine ouverture.
  const hadController = !!navigator.serviceWorker.controller;
  const openedAt = Date.now();
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded || Date.now() - openedAt > 10_000) return;
    reloaded = true;
    window.location.reload();
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }));
}
