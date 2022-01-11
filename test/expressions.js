import test, {is} from './lib/tst.js'
import {tick} from './lib/wait-please.js'
import templize from '../src/index.js'
import { expressions } from '../src/processor.js'

test.only('expressions: readme', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ text }}</p>`

  const params = templize(el, { text: 'abc'})
  is(el.innerHTML, '<p>abc</p>')
  params.text = 'def'
  is(el.innerHTML, '<p>def</p>')
  params.text = 'ghi'
  is(el.innerHTML, '<p>def</p>')

  await tick()
  is(el.innerHTML, '<p>ghi</p>')
})


// Part | Expression |  Note
// ---|---|---
// Direct Value | `{{ foo }}` |
// Property | `{{ foo.bar }}`, `{{ foo['bar'] }}` | Path-safe, allows null-ish paths.
// Function call | `{{ foo(bar, baz) }}`, `{{ foo.bar(baz) }}` |
// Boolean operators | `{{ !foo }}`, `{{ foo && bar \|\| baz }}` |
// Ternary | `{{ foo ? bar : baz }}` |
// Primitives | `{{ 'foo' }}`, `{{ true }}`, `{{ 0.1 }}` |
// Comparison | `{{ foo == 1 }}`, `{{ bar != 2 }}` |
// Math operators | `{{ a * 2 + b / 3 }}` | See [common operators](https://github.com/spectjs/subscript#design).
// Pipe | `{{ bar \| foo }}` | Same as `{{ foo(bar) }}`.
// <!-- Loop | `{{ item, idx in list }}` | `params.d` | Used for `:for` directive only -->
// <!-- Spread | `{{ ...foo }}` | `params.foo` | Used to pass multiple attributes or nodes -->
// <!-- Default fallback | `{{ foo || bar }}` | `params.foo`, `params.bar` | -->
