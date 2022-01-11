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

test('expressions: {{ !foo && bar || baz }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ !foo && bar || baz }}</p>`

  const params = templize(el, { foo: 0, bar: '', baz: 1 }, expressions)
  is(el.innerHTML, '<p>1</p>')
})

test('expressions: {{ !foo ? bar : baz }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ !foo ? bar : baz }}</p>`

  const params = templize(el, { foo: 0, bar: 1, baz: 2 }, expressions)
  is(el.innerHTML, '<p>1</p>')
})

test('expressions: literals', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ true }}</p>`

  templize(el, null, expressions)
  is(el.innerHTML, '<p>true</p>')


  let el2 = document.createElement('div')
  el2.innerHTML = `<p>{{ "abc" }}</p>`

  templize(el2, null, expressions)
  is(el2.innerHTML, '<p>abc</p>')


  let el3 = document.createElement('div')
  el3.innerHTML = `<p>{{ -1e-2 }}</p>`

  templize(el3, null, expressions)
  is(el3.innerHTML, '<p>-0.01</p>')
})

test('expressions: {{ foo == bar }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ foo == bar }}</p>`

  const params = templize(el, { foo: 0, bar: 0 }, expressions)
  is(el.innerHTML, '<p>true</p>')
})

test('expressions: {{ a * 2 + b / 3 }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ a * 2 + b / 3 }}</p>`

  const params = templize(el, { a: 2, b: 3 }, expressions)
  is(el.innerHTML, '<p>5</p>')
})

test('expressions: {{ bar | foo }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ bar | foo }}</p>`

  const params = templize(el, { foo: a => a.toUpperCase(), bar: 'abc' }, expressions)
  is(el.innerHTML, '<p>ABC</p>')
})

test.skip('expressions: missing args', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ boo }}</p>`

  throws(() => templize(el, { foo: 1 }, expressions))
  is(el.innerHTML, '<p></p>')
})

// <!-- Loop | `{{ item, idx in list }}` | `params.d` | Used for `:for` directive only -->
// <!-- Spread | `{{ ...foo }}` | `params.foo` | Used to pass multiple attributes or nodes -->
// <!-- Default fallback | `{{ foo || bar }}` | `params.foo`, `params.bar` | -->
