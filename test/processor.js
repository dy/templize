import v from 'value-ref'
import test, {is, throws} from 'tst'
import {TemplateInstance} from '../template-parts.js'
import {tick, time} from 'wait-please'
import templize from '../templize.js'
import exprProcessor, { states } from '../processor.js'
import h from 'hyperf'

const originalHTML = `Hello {{x}}!`
const processor = {
  createCalls:0,
  processCalls:0,
  createCallback() {
    this.createCalls++
  },

  processCallback(instance, parts, params) {
    if (typeof params !== 'object' || !params) return
    for (const part of parts) {
      if (part.expression in params) {
        const value = params[part.expression] ?? ''
        part.value = value
        this.processCalls++
      }
    }
  }
}

test('processor: creates a processor calling the given function when the param exists', () => {
  let template = document.createElement('template')
  template.innerHTML = originalHTML

  processor.createCalls = 0
  const instance = new TemplateInstance(template, {x: 'world'}, processor)
  is(processor.createCalls, 1)
  is(processor.processCalls, 1)
  instance.update({x: 'foo'})
  is(processor.processCalls, 2)
  instance.update({})
  is(processor.processCalls, 2)
})

test('processor: does not process parts with no param for the expression', () => {
  let template = document.createElement('template')
  template.innerHTML = originalHTML

  processor.createCalls = 0
  processor.processCalls = 0
  const instance = new TemplateInstance(template, {}, processor)
  is(processor.createCalls, 1)
  is(processor.processCalls, 0)
  instance.update({y: 'world'})
  is(processor.createCalls, 1)
  is(processor.processCalls, 0)
})

test('processor: template cannot modify init state', () => {
  let text = v('foo')
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ count++, text }}</p>`

  let init = {count:0, text}
  templize(el, init, exprProcessor)

  is(init, {count:0, text})
})

test('processor: dont init twice, dont change the template data', () => {
  let text = v('foo')
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ count(), text }}</p>`

  let x = 0
  let init = {count:()=>x++, text}
  templize(el, init, exprProcessor)
  console.log('---')
  templize(el, init, exprProcessor)
  console.log('---')
  templize(el, init, exprProcessor)

  is(x, 1)
})


test('reactivity: internal observable should be evaluated by value', t => {
  let el = h`<p>{{ a.x ? 1 : 2 }}</p>`
  let params = templize(el, {a:{x:v(false)}})
  is(el.innerHTML, "2")

  params.a.x.value = true
  is(el.innerHTML, "1")
})

test('reactivity: properly garbage-collected', async () => {
  let text = v('foo'), init
  let el = document.createElement('div')
  el.innerHTML = `<p>{{ text }}</p>`

  templize(el, init={ text }, exprProcessor)

  await tick(2)
  is(el.innerHTML, '<p>foo</p>')

  text.value = 'bar'
  is(el.innerHTML, '<p>bar</p>')

  if (typeof global === 'undefined' || !global.gc) return

  await gc()

  text.value = 'baz'
  await tick(2)
  is(el.innerHTML, '<p>baz</p>')

  init = text = null
  await gc()

  is(states.get(el).text, undefined)
  is(el.innerHTML, '<p>baz</p>')
})

async function gc() {
  console.log('---collect garbage')
  await time(100)
  await global.gc()
  // eval("%CollectGarbage('all')");
  await time(100)
}
