const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost/inventry-api/public/api';

// ── snake_case ↔ camelCase converters ────────────────────────────────────────
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

const INT_FIELDS = new Set([
  'id', 'branchId', 'categoryId', 'productId', 'purchaseId',
  'qty', 'stock', 'minStock', 'maxStock',
]);

function normalize(obj) {
  if (Array.isArray(obj)) return obj.map(normalize);
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      const camel = toCamel(k);
      let val = normalize(v);
      if (INT_FIELDS.has(camel) && val !== null && val !== '' && val !== undefined) {
        val = parseInt(val, 10);
      }
      acc[camel] = val;
      return acc;
    }, {});
  }
  return obj;
}

const toSnake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function denormalize(obj) {
  if (Array.isArray(obj)) return obj.map(denormalize);
  if (obj && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      acc[toSnake(k)] = denormalize(v);
      return acc;
    }, {});
  }
  return obj;
}

// ── Token state (module-level, access token lives in memory only) ─────────────
let _accessToken  = null;
let _refreshFn    = null;
let _refreshLock  = null; // deduplicates concurrent 401 retries

export function setAccessToken(token) { _accessToken = token; }
export function setRefreshFn(fn)      { _refreshFn = fn; }

// ── Core fetch helper ─────────────────────────────────────────────────────────
async function request(method, endpoint, body = null, _isRetry = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

  const options = { method, headers };
  if (body !== null) options.body = JSON.stringify(denormalize(body));

  const res = await fetch(`${BASE_URL}${endpoint}`, options);

  // 401 → try silent refresh once, then retry
  if (res.status === 401 && !_isRetry && _refreshFn) {
    if (!_refreshLock) {
      _refreshLock = _refreshFn().finally(() => { _refreshLock = null; });
    }
    const newToken = await _refreshLock;
    if (newToken) {
      return request(method, endpoint, body, true);
    }
    // Refresh failed — force login page
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  const json = await res.json();
  if (!res.ok) {
    const msg = json.messages?.error || json.message || 'API error';
    throw new Error(msg);
  }
  return normalize(json);
}

// ── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  login:   (data) => request('POST', '/auth/login',   data),
  refresh: (data) => request('POST', '/auth/refresh', data),
  logout:  (data) => request('POST', '/auth/logout',  data),
  me:      ()     => request('GET',  '/auth/me'),
};

// ── Branches ──────────────────────────────────────────────────────────────────
export const branchApi = {
  getAll:  ()           => request('GET',    '/branches'),
  getOne:  (id)         => request('GET',    `/branches/${id}`),
  create:  (data)       => request('POST',   '/branches', data),
  update:  (id, data)   => request('PUT',    `/branches/${id}`, data),
  remove:  (id)         => request('DELETE', `/branches/${id}`),
};

// ── Categories ────────────────────────────────────────────────────────────────
export const categoryApi = {
  getAll:  ()           => request('GET',    '/categories'),
  getOne:  (id)         => request('GET',    `/categories/${id}`),
  create:  (data)       => request('POST',   '/categories', data),
  update:  (id, data)   => request('PUT',    `/categories/${id}`, data),
  remove:  (id)         => request('DELETE', `/categories/${id}`),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const productApi = {
  getAll:   ()          => request('GET',    '/products'),
  getOne:   (id)        => request('GET',    `/products/${id}`),
  create:   (data)      => request('POST',   '/products', data),
  update:   (id, data)  => request('PUT',    `/products/${id}`, data),
  remove:   (id)        => request('DELETE', `/products/${id}`),
  lowStock: ()          => request('GET',    '/products/low-stock'),
};

// ── Purchases ─────────────────────────────────────────────────────────────────
export const purchaseApi = {
  getAll:  ()           => request('GET',    '/purchases'),
  getOne:  (id)         => request('GET',    `/purchases/${id}`),
  create:  (data)       => request('POST',   '/purchases', data),
  update:  (id, data)   => request('PUT',    `/purchases/${id}`, data),
  remove:  (id)         => request('DELETE', `/purchases/${id}`),
  receive: (id)         => request('POST',   `/purchases/${id}/receive`),
};

// ── Stock In ──────────────────────────────────────────────────────────────────
export const stockInApi = {
  getAll:  ()           => request('GET',    '/stock-in'),
  getOne:  (id)         => request('GET',    `/stock-in/${id}`),
  create:  (data)       => request('POST',   '/stock-in', data),
  remove:  (id)         => request('DELETE', `/stock-in/${id}`),
};

// ── Stock Out ─────────────────────────────────────────────────────────────────
export const stockOutApi = {
  getAll:  ()           => request('GET',    '/stock-out'),
  getOne:  (id)         => request('GET',    `/stock-out/${id}`),
  create:  (data)       => request('POST',   '/stock-out', data),
  remove:  (id)         => request('DELETE', `/stock-out/${id}`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => request('GET', '/dashboard'),
};

// ── Import ────────────────────────────────────────────────────────────────────
export const importApi = {
  products: (rows) => request('POST', '/import/products', { rows }),
};
