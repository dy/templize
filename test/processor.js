import v from 'value-ref'
import test, {is, throws} from 'tst'
import {TemplateInstance} from '../src/api.js'
import {tick, time} from 'wait-please'
import templize from '../src/index.js'
import exprProcessor, { states, registry } from '../src/processor.js'
import h from 'hyperf'

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
  el.innerHTML = `<p>{{ count.x++, text }}</p>`

  let init = {count:{x:0}, text}
  templize(el, init, exprProcessor)
  templize(el, init, exprProcessor)
  templize(el, init, exprProcessor)

  is(init, {count:{x:1}, text})
})


test.only('reactivity: basic', async () => {
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

  init.text = text = null
  await gc()

  is(states.get(el)[1].text, undefined)
  is(el.innerHTML, '<p>baz</p>')
})

async function gc() {
  console.log('---collect garbage')
  await time(100)
  await global.gc()
  // eval("%CollectGarbage('all')");
  await time(100)
}
