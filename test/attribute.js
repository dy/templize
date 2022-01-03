import test, {is} from './lib/tst.js'
import {AttributeValueSetter, AttributeTemplatePart, TemplateInstance} from '../template-parts.js'

test('attr: updates the given attribute from partList when updateParent is called', () => {
  const el = document.createElement('div')
  const attr = document.createAttribute('class')
  const instance = new AttributeValueSetter(el, attr)
  const part = new AttributeTemplatePart(instance)
  part.value = 'foo'
  instance.partList = [part]
  instance.updateParent()
  is(el.getAttribute('class'), 'foo')
})

test('attr: updates the AttributeValue which updates the Attr whenever it receives a new value', () => {
  const el = document.createElement('div')
  const attr = document.createAttribute('class')
  const instance = new AttributeValueSetter(el, attr)
  instance.partList = [new AttributeTemplatePart(instance), new AttributeTemplatePart(instance)]
  instance.partList[0].value = 'hello'
  instance.partList[1].value = ' world' // NOTE: space here
  is(el.getAttribute('class'), 'hello world')

  instance.partList[0].value = 'goodbye'
  is(el.getAttribute('class'), 'goodbye world')
})

