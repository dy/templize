import test, {is} from './lib/tst.js'
import {TemplateInstance} from '../src/api.js'

const originalHTML = `Hello {{x}}!`
const processor = {
  calls:0,
  createCallback() {
    return this.processCallback(...arguments)
  },

  processCallback(instance, parts, params) {
    if (typeof params !== 'object' || !params) return
    for (const part of parts) {
      if (part.expression in params) {
        const value = params[part.expression] ?? ''
        part.value = value
        this.calls++
      }
    }
  }
}

test('processor: creates a processor calling the given function when the param exists', () => {
  let template = document.createElement('template')
  template.innerHTML = originalHTML

  processor.calls = 0
  const instance = new TemplateInstance(template, {x: 'world'}, processor)
  is(processor.calls, 2)
  instance.update({x: 'foo'})
  is(processor.calls, 2)
  instance.update({})
  is(processor.calls, 2)
})

test('processor: does not process parts with no param for the expression', () => {
  let template = document.createElement('template')
  template.innerHTML = originalHTML

  processor.calls = 0
  const instance = new TemplateInstance(template, {}, processor)
  is(processor.calls, 0)
  instance.update({y: 'world'})
  is(processor.calls, 0)
})
