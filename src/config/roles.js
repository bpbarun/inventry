// Defines which routes each role can access and where to land by default.
// Add a role here when you add one to the backend.

export const ROLE_ACCESS = {
  admin:  ['/', '/branches', '/categories', '/products', '/purchases', '/stock-in', '/stock-out', '/import'],
  seller: ['/stock-out'],
  buyer:  ['/purchases', '/stock-in'],
};

// Default landing page after login (or after an unauthorised redirect)
export const ROLE_HOME = {
  admin:  '/',
  seller: '/stock-out',
  buyer:  '/purchases',
};
