const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/api/places.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;

function setup(pages, cached) {
  const requests = [], writes = [];
  const storage = {
    getItem: async key => key.endsWith('_v1') ? JSON.stringify({ timestamp: Date.now(), data: [{ id: 999 }] }) : cached ?? null,
    setItem: async (key, value) => { writes.push({ key, value: JSON.parse(value) }); },
  };
  const api = {
    authenticatedFetch: async endpoint => {
      requests.push(endpoint);
      const page = Number(new URL(endpoint, 'https://example.test').searchParams.get('page'));
      const body = pages[page];
      if (body instanceof Error) throw body;
      assert.ok(body, `Unexpected page ${page}`);
      return { ok: !body.status, status: body.status ?? 200, json: async () => body, text: async () => 'Server error' };
    },
  };
  const exports = {};
  new Function('require', 'exports', compiled)(name => {
    if (name === './api') return api;
    if (name === '@react-native-async-storage/async-storage') return storage;
    throw new Error(`Unexpected import ${name}`);
  }, exports);
  return { ...exports, requests, writes };
}

test('loads all pages, deduplicates IDs and caches only the complete list', async () => {
  const first = Array.from({ length: 20 }, (_, id) => ({ id }));
  const client = setup([{ content: first, totalPages: 2 }, { content: [{ id: 19 }, { id: 20 }], last: true }]);
  const result = await client.fetchPlaces('');
  assert.equal(result.length, 21);
  assert.equal(client.requests.length, 2);
  assert.deepEqual(client.writes[0].value.data, result);
  assert.equal(client.writes[0].key, 'orval_places_cache_v2');
});

test('short server pages without metadata continue until an empty page; filters apply to every request', async () => {
  const client = setup([{ content: [{ id: 1 }] }, { content: [{ id: 2 }] }, { content: [] }]);
  assert.deepEqual(await client.fetchPlaces('', 'BREWERY'), [{ id: 1 }, { id: 2 }]);
  assert.equal(client.requests.length, 3);
  assert.ok(client.requests.every(url => url.includes('placeType=BREWERY')));
  assert.equal(client.writes.length, 0);
});

test('a later page failure rejects instead of caching a partial map', async () => {
  const client = setup([{ content: [{ id: 1 }], last: false }, new Error('Offline')]);
  await assert.rejects(client.fetchPlaces(''), /Offline/);
  assert.equal(client.writes.length, 0);
});

test('corrupt cache falls back to the API and a complete fresh cache avoids requests', async () => {
  const client = setup([{ content: [], last: true }], '{broken');
  assert.deepEqual(await client.fetchPlaces(''), []);
  const cached = setup([], JSON.stringify({ timestamp: Date.now(), data: [{ id: 42 }] }));
  assert.deepEqual(await cached.fetchPlaces(''), [{ id: 42 }]);
  assert.equal(cached.requests.length, 0);
});

test('a server repeating the same page cannot cause an endless download', async () => {
  const client = setup([{ content: [{ id: 1 }] }, { content: [{ id: 1 }] }]);
  await assert.rejects(client.fetchPlaces(''), /pagination did not advance/);
  assert.equal(client.writes.length, 0);
});

test('moderation conflicts are distinguished from generic server failures', async () => {
  const conflict = setup([{ status: 409 }]);
  await assert.rejects(conflict.validatePlaceRequest('', 12, false), { message: 'Cette suggestion a déjà été traitée.' });
  const failure = setup([{ status: 500 }]);
  await assert.rejects(failure.validatePlaceRequest('', 12, true), /Erreur validation: 500/);
});
