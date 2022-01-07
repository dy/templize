import test, {is} from './lib/tst.js'
import {TemplateInstance} from '../src/api.js'

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
