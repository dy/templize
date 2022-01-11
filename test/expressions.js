import test, {is, throws} from './lib/tst.js'
import {tick} from './lib/wait-please.js'
import templize from '../src/index.js'
import { expressions } from '../src/processor.js'

test('expressions: {{ foo }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ text }}</p>`

  const params = templize(el, { text: 'abc'}, expressions)
  is(el.innerHTML, '<p>abc</p>')
  params.text = 'def'
  is(el.innerHTML, '<p>def</p>')
  params.text = 'ghi'
  is(el.innerHTML, '<p>def</p>')

  await tick()
  is(el.innerHTML, '<p>ghi</p>')
})


test('expressions: {{ foo.bar }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ foo.bar }}</p>`

  templize(el, { foo: {bar: 'abc'}}, expressions)
  is(el.innerHTML, '<p>abc</p>')
  throws(() => params.foo = null)

  // safe-path
  let el2 = document.createElement('div')
  el2.innerHTML = `<p>{{ foo?.bar }}</p>`
  const params = templize(el2, { foo: {bar: 'abc'}}, expressions)
  is(el2.innerHTML, '<p>abc</p>')
  params.foo = null
  is(el2.innerHTML, '<p></p>')
})

test('expressions: {{ foo(bar, baz) }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ foo(bar, baz) }}</p>`

  const params = templize(el, { foo: (bar, baz) => bar + baz, bar: 'a', baz: 'bc' }, expressions)
  is(el.innerHTML, '<p>abc</p>')
})

// Boolean operators | `{{ !foo }}`, `{{ foo && bar \|\| baz }}` |
// Ternary | `{{ foo ? bar : baz }}` |
// Primitives | `{{ 'foo' }}`, `{{ true }}`, `{{ 0.1 }}` |
// Comparison | `{{ foo == 1 }}`, `{{ bar != 2 }}` |
// Math operators | `{{ a * 2 + b / 3 }}` | See [common operators](https://github.com/spectjs/subscript#design).
// Pipe | `{{ bar \| foo }}` | Same as `{{ foo(bar) }}`.
// <!-- Loop | `{{ item, idx in list }}` | `params.d` | Used for `:for` directive only -->
// <!-- Spread | `{{ ...foo }}` | `params.foo` | Used to pass multiple attributes or nodes -->
// <!-- Default fallback | `{{ foo || bar }}` | `params.foo`, `params.bar` | -->
