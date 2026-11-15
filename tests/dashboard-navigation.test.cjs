const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

function navigation(pathname, onNavigate) {
  const calls = [];
  const items = ['home', 'cart', 'inventory', 'menu'].map(icon => ({ icon, label: icon }));
  const context = { exports: {}, require(name) {
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === 'react') return { useCallback: fn => fn, useId: () => 'host', useState: initial => [initial, () => {}] };
    if (name === 'expo-router') return { useFocusEffect() {}, router: {
      dismissTo: route => calls.push(['dismissTo', route]), navigate: route => calls.push(['navigate', route]),
    } };
    if (name === 'react-native') return { Keyboard: { dismiss: () => calls.push(['dismissKeyboard']) }, StyleSheet: { create: value => value }, View: 'View' };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ bottom: 0 }) };
    if (name === '@/components/dashboard/bottom-navigation') return { BottomNavigation: 'BottomNavigation' };
    if (name === '@/components/menu/owner-menu-drawer') return { OwnerMenuDrawer: 'Drawer' };
    if (name === '@/state/auth-flow') return { useAuthFlow: () => ({ owner: { id: 'demo' } }) };
    if (name === '@/state/navigation-motion') return { navigationItems: items, useNavigationMotion: () => ({ pathname, role: 'owner', selectedIndex: pathname === '/owner-dashboard' ? 0 : 2, setMenuSelection() {} }) };
    throw Error(name);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/dashboard/dashboard-navigation.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, context);
  const node = context.exports.DashboardNavigation({ onHome: () => calls.push(['onHome']), onUnavailable() {}, onNavigate });
  return { calls, press: node.props.children[0].props.children.props.onPress };
}

test('Home returns to the retained Dashboard through the existing navigation guard', () => {
  let action;
  const h = navigation('/owner-inventory', next => { action = next; });
  h.press('home'); assert.deepEqual(h.calls, []);
  action(); assert.deepEqual(h.calls, [['dismissKeyboard'], ['dismissTo', '/owner-dashboard']]);
});

test('Home on the Dashboard retains the existing scroll callback and other destinations', () => {
  const h = navigation('/owner-dashboard');
  h.press('home'); assert.deepEqual(h.calls, [['onHome']]);
  h.press('inventory'); assert.deepEqual(h.calls.at(-1), ['navigate', '/owner-inventory']);
});
