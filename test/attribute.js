import test, {is} from 'tst'
import h from 'hyperf'
import v from 'value-ref'
import {AttributeTemplatePart} from '../src/api.js'
import templize from '../src/index.js'
import {tick} from 'wait-please'

test('attr: updates the given attribute from partList when updateParent is called', () => {
  const el = document.createElement('div')
  const attr = document.createAttribute('class')
  const instance = { element:el, attr, parts: [] }//new AttributeValueSetter(el, attr)
  const part = new AttributeTemplatePart(instance)
  instance.parts = [part]
  part.value = 'foo'
  is(el.getAttribute('class'), 'foo')
})

test('attr: updates the AttributeValue which updates the Attr whenever it receives a new value', () => {
  const el = document.createElement('div')
  const attr = document.createAttribute('class')
  const instance = { element:el, attr, parts: [] }//new AttributeValueSetter(el, attr)
  instance.parts = [new AttributeTemplatePart(instance), new AttributeTemplatePart(instance)]
  instance.parts[0].value = 'hello'
  instance.parts[1].value = ' world' // NOTE: space here
  is(el.getAttribute('class'), 'hello world')

  instance.parts[0].value = 'goodbye'
  is(el.getAttribute('class'), 'goodbye world')
})

test('attribute: binds function', async () => {
  let el = h`<div x={{x}} onclick="{{ inc }}"></div>`
  let x = v(0)
  templize(el, { x, inc: ()=>x.value++ })
  is(x.value, 0)
  is(el.x, 0)
  el.click()

  await tick()
  is(x.value, 1)
  is(el.x, 1)
})
