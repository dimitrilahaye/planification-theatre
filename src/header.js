/**
 * Header avec logo et navigation (Classes, Fratries, Horaires)
 */
import { ROUTES } from './router.js';

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
  <!-- 4 vagues / créneaux (A,B,C,D) évoquant le planning -->
  <path d="M4 22 Q16 14 28 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M4 18 Q16 10 28 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M4 14 Q16 6 28 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M4 10 Q16 2 28 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <!-- Petit point scène -->
  <circle cx="16" cy="16" r="2" fill="currentColor"/>
</svg>`;

export function renderAppHeader(container, currentRoute) {
  container.innerHTML = `
    <header class="app-header">
      <a href="#/" class="app-header-logo" title="Accueil">
        <span class="app-header-logo-icon">${LOGO_SVG}</span>
        <span class="app-header-logo-text">Planification théâtre</span>
      </a>
      <nav class="app-header-nav">
        <a href="#/classes" class="app-header-link${currentRoute === ROUTES.classes ? ' active' : ''}">Classes</a>
        <a href="#/siblings" class="app-header-link${currentRoute === ROUTES.siblings ? ' active' : ''}">Fratries</a>
        <a href="#/schedule" class="app-header-link${currentRoute === ROUTES.schedule ? ' active' : ''}">Horaires</a>
      </nav>
    </header>
  `;
}
