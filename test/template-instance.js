import test, {is} from './lib/tst.js'
import TemplateInstance from '../src/index.js'
import {AttributeTemplatePart} from '../src/api.js'


test('create: applies data to templated text nodes', () => {
  const template = document.createElement('template')
  const originalHTML = `{{x}}`
  template.innerHTML = originalHTML
  const instance = new TemplateInstance(template, {x: 'Hello world'})
  is(template.innerHTML, originalHTML)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `Hello world`)
})
test('create: can render into partial text nodes', () => {
  const template = document.createElement('template')
  const originalHTML = `Hello {{x}}!`
  template.innerHTML = originalHTML
  const instance = new TemplateInstance(template, {x: 'world'})
  is(template.innerHTML, originalHTML)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `Hello world!`)
})
test('create: can render nested text nodes', () => {
  const template = document.createElement('template')
  const originalHTML = '<div><div>Hello {{x}}!</div></div>'
  template.innerHTML = originalHTML
  const instance = new TemplateInstance(template, {x: 'world'})
  is(template.innerHTML, originalHTML)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<div><div>Hello world!</div></div>`)
})
test('create: applies data to templated attributes', () => {
  const template = document.createElement('template')
  const originalHTML = `<div class="{{y}}"></div>`
  template.innerHTML = originalHTML
  const instance = new TemplateInstance(template, {y: 'foo'})
  is(template.innerHTML, originalHTML)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<div class="foo"></div>`)
})
test('create: can render into partial attribute nodes', () => {
  const template = document.createElement('template')
  const originalHTML = `<div class="my-{{y}}-state"></div>`
  template.innerHTML = originalHTML
  const instance = new TemplateInstance(template, {y: 'foo'})
  is(template.innerHTML, originalHTML)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<div class="my-foo-state"></div>`)
})
test('create: can render into many values', () => {
  const template = document.createElement('template')
  const originalHTML = `<div class="my-{{x}}-state {{y}}">{{z}}</div>`
  template.innerHTML = originalHTML
  const instance = new TemplateInstance(template, {x: 'foo', y: 'bar', z: 'baz'})
  is(template.innerHTML, originalHTML)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<div class="my-foo-state bar">baz</div>`)
})
test('create: it allows spaces inside template part identifiers', () => {
  const template = document.createElement('template')
  const originalHTML = `<div class="my-{{ x }}-state {{ y }}">{{         z          }}</div>`
  template.innerHTML = originalHTML
  const instance = new TemplateInstance(template, {x: 'foo', y: 'bar', z: 'baz'})
  is(template.innerHTML, originalHTML)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<div class="my-foo-state bar">baz</div>`)
})
test.only('create: never writes mustache syntax into an instantiated template even if no state given', () => {
  const template = document.createElement('template')
  const originalHTML = `<div class="my-{{ x }}-state {{ y }}">{{ z }}</div>`
  template.innerHTML = originalHTML
  const instance = new TemplateInstance(template)
  is(template.innerHTML, originalHTML)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<div class="my--state "></div>`)
})

test('update: updates all nodes with new values', () => {
  const template = document.createElement('template')
  const originalHTML = `<div class="my-{{ x }}-state {{ y }}">{{ z }}</div>`
  template.innerHTML = originalHTML
  const instance = new TemplateInstance(template, {x: 'foo', y: 'bar', z: 'baz'})
  is(template.innerHTML, originalHTML)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<div class="my-foo-state bar">baz</div>`)
  instance.update({x: 'bing', y: 'bong', z: 'quux'})
  is(root.innerHTML, `<div class="my-bing-state bong">quux</div>`)
})

test('update: performs noop when update() is called with partial args', () => {
  const template = document.createElement('template')
  const originalHTML = `<div class="my-{{ x }}-state {{ y }}">{{ z }}</div>`
  template.innerHTML = originalHTML
  const instance = new TemplateInstance(template, {x: 'foo', y: 'bar', z: 'baz'})
  is(template.innerHTML, originalHTML)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<div class="my-foo-state bar">baz</div>`)
  instance.update({y: 'boo'})
  is(root.innerHTML, `<div class="my-foo-state boo">baz</div>`)
})

test('update: is a noop when update() is called with no args', () => {
  const template = document.createElement('template')
  const originalHTML = `<div class="my-{{ x }}-state {{ y }}">{{ z }}</div>`
  template.innerHTML = originalHTML
  const instance = new TemplateInstance(template, {x: 'foo', y: 'bar', z: 'baz'})
  is(template.innerHTML, originalHTML)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<div class="my-foo-state bar">baz</div>`)
  instance.update()
  is(root.innerHTML, `<div class="my-foo-state bar">baz</div>`)
})



const propertyIdentityOrBooleanAttribute = {
  createCallback() {
    return this.processCallback(...arguments)
  },

  processCallback(instance, parts, params) {
    if (typeof params !== 'object' || !params) return
    for (const part of parts) {
      if (part.expression in params) {
        const value = params[part.expression] ?? ''

        // boolean attr
        if (
          typeof value === 'boolean' &&
          part instanceof AttributeTemplatePart &&
          typeof part.element[part.attributeName] === 'boolean'
        ) part.booleanValue = value
        else part.value = value
      }
    }
  }
}

test('update: allows attributes to be toggled on and off', () => {
  const template = document.createElement('template')
  template.innerHTML = `<div hidden="{{ hidden }}"></div>`
  const instance = new TemplateInstance(template, {hidden: true}, propertyIdentityOrBooleanAttribute)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<div hidden=""></div>`)
  instance.update({hidden: false})
  is(root.innerHTML, `<div></div>`)
  instance.update({hidden: 'hidden'})
  is(root.innerHTML, `<div hidden="hidden"></div>`)
})

test('update: allows attributes to be toggled on even when starting off', () => {
  const template = document.createElement('template')
  template.innerHTML = `<div hidden="{{ hidden }}"></div>`
  const instance = new TemplateInstance(template, {hidden: false}, propertyIdentityOrBooleanAttribute)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<div></div>`)
  instance.update({hidden: true})
  is(root.innerHTML, `<div hidden=""></div>`)
  instance.update({hidden: false})
  is(root.innerHTML, `<div></div>`)
})

test('update: only toggles attributes with boolean class properties', () => {
  const template = document.createElement('template')
  template.innerHTML = `<input required="{{a}}" aria-disabled="{{a}}" hidden="{{a}}" value="{{a}}"/>`
  const instance = new TemplateInstance(template, {a: false}, propertyIdentityOrBooleanAttribute)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<input aria-disabled="false" value="false">`)
  instance.update({a: true})
  is(root.innerHTML, `<input aria-disabled="true" value="true" required="" hidden="">`)
  instance.update({a: false})
  is(root.innerHTML, `<input aria-disabled="false" value="false">`)
})

test('update: clears mustache when no args given', () => {
  const template = document.createElement('template')
  template.innerHTML = `<input required="{{a}}" aria-disabled="{{a}}" hidden="{{b}}" value="{{b}}"/>`
  const instance = new TemplateInstance(template, null, propertyIdentityOrBooleanAttribute)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<input required="" aria-disabled="" hidden="" value="">`)
})

test('update: is a noop when `update()` is called with no args', () => {
  const template = document.createElement('template')
  template.innerHTML = `<input required="{{a}}" aria-disabled="{{a}}" hidden="{{b}}" value="{{b}}"/>`
  const instance = new TemplateInstance(template, {a: false, b: true}, propertyIdentityOrBooleanAttribute)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<input aria-disabled="false" hidden="" value="true">`)
  instance.update()
  is(root.innerHTML, `<input aria-disabled="false" hidden="" value="true">`)
})

test('update: is a noop when `update()` is called with no args', () => {
  const template = document.createElement('template')
  template.innerHTML = `<input required="{{a}}" aria-disabled="{{a}}" hidden="{{b}}" value="{{b}}"/>`
  const instance = new TemplateInstance(template, {a: false, b: true}, propertyIdentityOrBooleanAttribute)
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<input aria-disabled="false" hidden="" value="true">`)
  instance.update({b: false})
  is(root.innerHTML, `<input aria-disabled="false" value="false">`)
})


test('update: replaces an empty replace() call with an empty text node', () => {
  const template = document.createElement('template')
  template.innerHTML = `<div>{{a}}</div>`
  const instance = new TemplateInstance(
    template,
    {a: true},
    {
      createCallback() { return this.processCallback(...arguments) },
      processCallback(instance, parts, params) {
        if (typeof params !== 'object' || !params) return
        for (const part of parts) {
          if (part.expression in params) {
            const value = params[part.expression] ?? ''
            part.replace()
            part.replace()
            part.replace()
          }
        }
      }
    }
  )
  const root = document.createElement('div')
  root.appendChild(instance)
  is(root.innerHTML, `<div></div>`)
})
