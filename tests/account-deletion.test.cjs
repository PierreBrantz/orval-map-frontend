const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  new Function('require', 'exports', code)(name => {
    assert.ok(name in dependencies, `Unexpected import ${name}`);
    return dependencies[name];
  }, exports);
  return exports;
}

test('DELETE sends the exact password, JSON headers and stored bearer token; 204 needs no response body', async () => {
  const originalFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url, ...options };
    return { ok: true, status: 204 };
  };
  try {
    const api = load('src/api/api.ts', {
      '@react-native-async-storage/async-storage': { getItem: async () => 'test-token' },
      '../config': { API_BASE_URL: 'https://example.test' },
    });
    const auth = load('src/api/auth.ts', { './api': api });
    await auth.deleteCurrentAccount(' secret with spaces ');
    assert.equal(request.url, 'https://example.test/api/account');
    assert.equal(request.method, 'DELETE');
    assert.equal(request.headers.Authorization, 'Bearer test-token');
    assert.equal(request.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(request.body), { password: ' secret with spaces ' });
    let sessionReset = false;
    api.setUnauthorizedHandler(async () => { sessionReset = true; });
    global.fetch = async () => ({ ok: false, status: 401 });
    await assert.rejects(auth.deleteCurrentAccount('secret'), /SESSION_EXPIRED/);
    assert.equal(sessionReset, true);
  } finally { global.fetch = originalFetch; }
});

test('empty passwords make no request; status errors use the agreed messages', async () => {
  let calls = 0, status = 400;
  const auth = load('src/api/auth.ts', { './api': {
    authenticatedFetch: async () => { calls++; return { ok: false, status }; },
  } });
  await assert.rejects(auth.deleteCurrentAccount('  '), /Veuillez saisir votre mot de passe/);
  assert.equal(calls, 0);
  for (const [code, message] of [
    [400, 'Veuillez saisir votre mot de passe.'], [401, 'SESSION_EXPIRED'],
    [403, 'Le mot de passe est incorrect.'], [500, 'Impossible de supprimer le compte pour le moment.'],
  ]) {
    status = code;
    await assert.rejects(auth.deleteCurrentAccount('secret'), error => error.message === message);
  }
});

test('successful local cleanup clears user state and resets navigation to required login', async () => {
  const states = [];
  let index = 0, removed, fail = true;
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    createElement: (_, props) => props.value,
    useState: initial => {
      const i = index++;
      if (!(i in states)) states[i] = initial;
      return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
    },
    useRef: value => ({ current: value }),
    useEffect: () => {},
  };
  const { AuthProvider } = load('src/context/AuthContext.tsx', {
    react,
    '@react-native-async-storage/async-storage': {
      multiRemove: async keys => { if (fail) throw new Error('Storage unavailable'); removed = keys; },
    },
    'jwt-decode': {}, '../api/api': {}, '../api/passport': {}, '../config': {},
  });
  const render = () => { index = 0; return AuthProvider({ children: null }); };
  let context = render();
  await assert.rejects(context.finishAccountDeletion(), /Storage unavailable/);
  assert.equal(render().navigationVersion, 0);
  fail = false;
  await context.finishAccountDeletion();
  context = render();
  assert.deepEqual(removed, ['jwtToken', 'orval_places_cache_v1', 'orval_places_cache_v2']);
  assert.equal(context.user, null);
  assert.equal(context.visitedPlaceIds.size, 0);
  assert.equal(context.isLoginRequired, true);
  assert.equal(context.isLoginVisible, true);
  assert.equal(context.navigationVersion, 1);
});
