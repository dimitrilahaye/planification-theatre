/**
 * Routeur hash : #/ (landing), #/classes, #/siblings, #/schedule
 */
export const ROUTES = { landing: 'landing', classes: 'classes', siblings: 'siblings', schedule: 'schedule' };

const VALID_ROUTES = new Set(Object.values(ROUTES));

export function getRoute() {
  const hash = (window.location.hash || '#/').slice(1).replace(/^\/+/, '').split('/')[0];
  if (hash === 'app') return ROUTES.classes; // rétrocompat
  return VALID_ROUTES.has(hash) ? hash : ROUTES.landing;
}

export function navigateTo(route) {
  if (route === ROUTES.landing) {
    window.location.hash = '#/';
  } else if (VALID_ROUTES.has(route)) {
    window.location.hash = `#/${route}`;
  }
}

export function initRouter(onRouteChange) {
  const handler = () => onRouteChange(getRoute());
  window.addEventListener('hashchange', handler);
  handler();
  return () => window.removeEventListener('hashchange', handler);
}
