/**
 * Routeur hash : #/ (landing), #/classes, #/siblings, #/schedule
 * Compatible GitHub Pages (base path /planification-theatre/)
 */
export const ROUTES = { landing: 'landing', classes: 'classes', siblings: 'siblings', schedule: 'schedule' };

const VALID_ROUTES = new Set(Object.values(ROUTES));

/** Href pour une route hash (gère le base path GitHub Pages) */
export function getHashHref(route) {
  const base = (typeof import.meta.env?.BASE_URL === 'string' ? import.meta.env.BASE_URL : '/').replace(/\/$/, '') || '';
  if (route === ROUTES.landing) return `${base || '/'}#/`;
  return `${base || '/'}#/${route}`;
}

export function getRoute() {
  const hash = (window.location.hash || '#/').slice(1).replace(/^\/+/, '').split('/')[0];
  if (hash === 'app') return ROUTES.classes; // rétrocompat
  return VALID_ROUTES.has(hash) ? hash : ROUTES.landing;
}

export function navigateTo(route) {
  window.location.href = getHashHref(route);
}

export function initRouter(onRouteChange) {
  const handler = () => onRouteChange(getRoute());
  window.addEventListener('hashchange', handler);
  handler();
  return () => window.removeEventListener('hashchange', handler);
}
