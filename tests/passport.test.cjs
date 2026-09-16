const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/screens/PassportScreen.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;

function render(suggestions) {
  const passport = {
    suggestions, visitedPlaces: 2, visitedCities: 1,
    nextGoal: { name: 'Cartographe', current: 1, target: 5 },
    badges: [{ name: 'Éclaireur', unlocked: true }, { name: 'Cartographe', unlocked: false }],
  };
  const states = [false, passport, null, null, false];
  let index = 0, effectDependencies;
  const dependencies = {
    react: {
      createElement: (type, props, ...children) => ({ type, props, children }),
      useState: () => [states[index++], () => {}],
      useEffect: (_, deps) => { effectDependencies = deps; },
    },
    'react-native': { StyleSheet: { create: x => x }, ...Object.fromEntries(['View', 'Text', 'ScrollView', 'ActivityIndicator', 'TouchableOpacity', 'FlatList', 'Modal'].map(x => [x, x])) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    '../context/LanguageContext': { useLanguage: () => ({ t: x => x, translateText: x => x }) },
    '../context/AuthContext': { useAuth: () => ({ isGuest: false, user: { sub: 'user-1' }, passportRevision: 3 }) },
    '../config': {}, '../api/passport': {},
  };
  const exports = {};
  new Function('require', 'exports', code)(name => dependencies[name], exports);
  const tree = exports.default();
  const nodes = [];
  function visit(node) {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    nodes.push(node);
    node.children?.forEach(visit);
  }
  visit(tree);
  return { nodes, effectDependencies };
}

test('separate counts preserve backend progress and badges even with many rejections', () => {
  const { nodes, effectDependencies } = render({ total: 3, approved: 1, pending: 2, rejected: 40 });
  const texts = nodes.filter(x => x.type === 'Text').map(x => x.children.join(''));
  assert.ok(texts.includes('Suggestions validées : 1'));
  assert.ok(texts.includes('En attente : 2'));
  assert.ok(texts.includes('Refusées : 40'));
  assert.ok(texts.includes('1 / 5'));
  assert.ok(nodes.some(x => x.type === 'View' && x.props?.style?.[1]?.width === '20%'));
  assert.deepEqual(nodes.filter(x => x.type === 'Ionicons' && x.props.name.startsWith('shield')).map(x => x.props.name), ['shield-checkmark', 'shield-outline']);
  assert.deepEqual(effectDependencies, [false, 'user-1', 3]);
});

test('older backend responses display zero rejected suggestions', () => {
  const { nodes } = render({ total: 3, approved: 1, pending: 2 });
  assert.ok(nodes.some(x => x.type === 'Text' && x.children.join('') === 'Refusées : 0'));
});
