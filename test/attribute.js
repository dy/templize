import test, {is} from './lib/tst.js'
import {AttributeTemplatePart} from '../src/api.js'

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

