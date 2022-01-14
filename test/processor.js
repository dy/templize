import v from '../node_modules/spect/v.js'
import test, {is, throws} from '../node_modules/tst/tst.js'
import {TemplateInstance} from '../src/api.js'
import {tick} from '../node_modules/wait-please/index.js'
import templize from '../src/index.js'
import exprProcessor from '../src/processor.js'

const originalHTML = `Hello {{x}}!`
const processor = {
  create:0,
  process:0,
  createCallback() {
    this.create++
  },

  processCallback(instance, parts, params) {
    if (typeof params !== 'object' || !params) return
    for (const part of parts) {
      if (part.expression in params) {
        const value = params[part.expression] ?? ''
        part.value = value
        this.process++
      }
    }
  }
}

test('processor: creates a processor calling the given function when the param exists', () => {
  let template = document.createElement('template')
  template.innerHTML = originalHTML

  processor.create = 0
  const instance = new TemplateInstance(template, {x: 'world'}, processor)
  is(processor.create, 1)
  is(processor.process, 1)
  instance.update({x: 'foo'})
  is(processor.process, 2)
  instance.update({})
  is(processor.process, 2)
})

test('processor: does not process parts with no param for the expression', () => {
  let template = document.createElement('template')
  template.innerHTML = originalHTML

  processor.create = 0
  processor.process = 0
  const instance = new TemplateInstance(template, {}, processor)
  is(processor.create, 1)
  is(processor.process, 0)
  instance.update({y: 'world'})
  is(processor.create, 1)
  is(processor.process, 0)
})



test('expressions: {{ foo }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ text }}</p>`

  const params = templize(el, { text: 'abc'}, exprProcessor)
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

  templize(el, { foo: {bar: 'abc'}}, exprProcessor)
  is(el.innerHTML, '<p>abc</p>')
  throws(() => params.foo = null)

  // safe-path
  let el2 = document.createElement('div')
  el2.innerHTML = `<p>{{ foo?.bar }}</p>`
  const params = templize(el2, { foo: {bar: 'abc'}}, exprProcessor)
  is(el2.innerHTML, '<p>abc</p>')
  params.foo = null
  is(el2.innerHTML, '<p></p>')
})

test('expressions: {{ foo(bar, baz) }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ foo(bar, baz) }}</p>`

  const params = templize(el, { foo: (bar, baz) => bar + baz, bar: 'a', baz: 'bc' }, exprProcessor)
  is(el.innerHTML, '<p>abc</p>')
})

test('expressions: {{ !foo && bar || baz }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ !foo && bar || baz }}</p>`

  const params = templize(el, { foo: 0, bar: '', baz: 1 }, exprProcessor)
  is(el.innerHTML, '<p>1</p>')
})

test('expressions: {{ !foo ? bar : baz }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ !foo ? bar : baz }}</p>`

  const params = templize(el, { foo: 0, bar: 1, baz: 2 }, exprProcessor)
  is(el.innerHTML, '<p>1</p>')
})

test('expressions: literals', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ true }}</p>`

  templize(el, null, exprProcessor)
  is(el.innerHTML, '<p>true</p>')


  let el2 = document.createElement('div')
  el2.innerHTML = `<p>{{ "abc" }}</p>`

  templize(el2, null, exprProcessor)
  is(el2.innerHTML, '<p>abc</p>')


  let el3 = document.createElement('div')
  el3.innerHTML = `<p>{{ -1e-2 }}</p>`

  templize(el3, null, exprProcessor)
  is(el3.innerHTML, '<p>-0.01</p>')
})

test('expressions: {{ foo == bar }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ foo == bar }}</p>`

  const params = templize(el, { foo: 0, bar: 0 }, exprProcessor)
  is(el.innerHTML, '<p>true</p>')
})

test('expressions: {{ a * 2 + b / 3 }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ a * 2 + b / 3 }}</p>`

  const params = templize(el, { a: 2, b: 3 }, exprProcessor)
  is(el.innerHTML, '<p>5</p>')
})

test('expressions: {{ bar | foo }}', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ bar | foo }}</p>`

  const params = templize(el, { foo: a => a.toUpperCase(), bar: 'abc' }, exprProcessor)
  is(el.innerHTML, '<p>ABC</p>')
})

test.skip('expressions: missing args', async () => {
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ boo }}</p>`

  throws(() => templize(el, { foo: 1 }, exprProcessor))
  is(el.innerHTML, '<p></p>')
})



test('reactivity: basic', async () => {
  let text = v('foo')
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ text }}</p>`

  templize(el, { text }, exprProcessor)

  await tick(2)
  is(el.innerHTML, '<p>foo</p>')

  text.value = 'bar'
  is(el.innerHTML, '<p>bar</p>')

  text[Symbol.dispose]()
})
