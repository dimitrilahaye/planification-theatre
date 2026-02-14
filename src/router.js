/**
 * Routeur hash simple : #/ (landing) et #/app (application)
 */
export const ROUTES = { landing: 'landing', app: 'app' };

export function getRoute() {
  const hash = (window.location.hash || '#/').slice(1).replace(/^\/+/, '');
  if (hash === 'app' || hash.startsWith('app/')) return ROUTES.app;
  return ROUTES.landing;
}

export function navigateTo(route) {
  if (route === ROUTES.app) {
    window.location.hash = '#/app';
  } else {
    window.location.hash = '#/';
  }
}

export function initRouter(onRouteChange) {
  const handler = () => onRouteChange(getRoute());
  window.addEventListener('hashchange', handler);
  handler();
  return () => window.removeEventListener('hashchange', handler);
}
