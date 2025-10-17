export class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.authRequiredRoutes = [];

    window.addEventListener('popstate', () => {
      this.handleRoute();
    });
  }

  register(path, handler, requireAuth = false) {
    this.routes[path] = handler;
    if (requireAuth) {
      this.authRequiredRoutes.push(path);
    }
  }

  navigate(path) {
    window.history.pushState({}, '', path);
    this.handleRoute();
  }

  requireAuth(checkFunction) {
    this.authCheck = checkFunction;
  }

  handleRoute() {
    const path = window.location.pathname;
    const search = window.location.search;
    const params = new URLSearchParams(search);

    if (this.authCheck && this.authRequiredRoutes.includes(path)) {
      const isAuthenticated = this.authCheck();
      if (!isAuthenticated) {
        window.history.pushState({}, '', '/login');
        this.routes['/login']?.();
        return;
      }
    }

    let handler = this.routes[path];

    if (!handler) {
      const matchedRoute = Object.keys(this.routes).find(route => {
        const regex = new RegExp('^' + route.replace(/:\w+/g, '([^/]+)') + '$');
        return regex.test(path);
      });

      if (matchedRoute) {
        handler = this.routes[matchedRoute];
      }
    }

    if (handler) {
      this.currentRoute = path;
      handler(params);
    } else {
      this.routes['/']?.();
    }
  }

  init() {
    this.handleRoute();
  }
}

export const router = new Router();

export function navigateTo(path) {
  router.navigate(path);
}
