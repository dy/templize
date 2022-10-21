import test, { is } from 'tst'
import h from 'hyperf'
import templize from '../templize.js'
import { signal } from '@preact/signals'


test('reactivity: @preact/signals', () => {
  let el = h`<div><h1>{{ user }}</h1></div>`;
  let user = signal('abc');
  templize(el, { user });
  is(el.innerHTML, '<h1>abc</h1>');
})

test('reactivity: empty fields', () => {
  let user = signal(null);
  let a = document.createElement('div')
  templize(a, { user })
  user.value = 123
  is(a.innerHTML, '');
})