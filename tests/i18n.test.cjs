const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const catalog = {};
const source = fs.readFileSync(path.join(__dirname, '../src/i18n/translations.ts'), 'utf8');
new Function('exports', ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText)(catalog);
const { translations, translate, languages } = catalog;

test('every message has four translations with matching interpolation fields', () => {
  const fields = value => (value.match(/\{\w+\}/g) || []).sort();
  for (const [key, values] of Object.entries(translations)) {
    assert.equal(values.length, 4, key);
    for (const value of values) {
      assert.ok(value.trim(), key);
      assert.deepEqual(fields(value), fields(key), key);
    }
    for (const { code } of languages) assert.ok(translate(code, key), key);
  }
});

test('interpolation preserves user content and zero counts', () => {
  assert.equal(translate('de', '{name} a été ajouté à votre passeport.', { name: 'Orval $&' }),
    'Orval $& wurde deinem Reisepass hinzugefügt.');
  assert.equal(translate('it', 'Mes Découvertes ({count})', { count: 0 }), 'Le mie scoperte (0)');
});

test('French and unknown server badge names fall back without losing content', () => {
  assert.equal(translate('fr', 'Ville'), 'Ville');
  assert.equal(translate('nl', 'Unknown badge'), 'Unknown badge');
  assert.equal(translate('en', 'toString'), 'toString');
  assert.equal(translate('nl', 'Ville'), 'Stad');
  assert.equal(translate('it', 'Ville'), 'Città');
  assert.equal(translate('en', 'Ville'), 'City');
  assert.equal(translate('de', 'Ville'), 'Stadt');
});
