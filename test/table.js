
import test, {is, any} from './lib/tst.js'
import {TemplateInstance} from '../src/api.js'

test('table: default HTML behavior', () => {
  let tpl = document.createElement('template')
  tpl.innerHTML = `<table>123</table>`
  let instance = new TemplateInstance(tpl)

  const el = document.createElement('div')
  el.appendChild(instance)
  is(el.innerHTML, `123<table></table>`)
})

test('table: <table>{{ rows }}</table>', () => {
  let tpl = document.createElement('template')
  tpl.innerHTML = `<table>{{ rows }}</table>`
  let instance = new TemplateInstance(tpl)

  const el = document.createElement('div')
  el.appendChild(instance)
  is(el.innerHTML, `<table></table>`)

  const table = document.createElement('table')
  table.innerHTML = `<tr><td>1</td><td>a</td></tr><tr><td>2</td><td>b</td></tr>`
  instance.update({ rows: table.childNodes })
  any(el.innerHTML, [
    `<table><tr><td>1</td><td>a</td></tr><tr><td>2</td><td>b</td></tr></table>`,
    `<table><tbody><tr><td>1</td><td>a</td></tr><tr><td>2</td><td>b</td></tr></tbody></table>`
  ])
})

test('table: <table><!-- -->{{ rows }}</table>', () => {
  let tpl = document.createElement('template')
  tpl.innerHTML = `<table><!-- -->{{ rows }}</table>`
  let instance = new TemplateInstance(tpl)

  const el = document.createElement('div')
  el.appendChild(instance)
  is(el.innerHTML, `<table><!-- --></table>`)

  const table = document.createElement('table')
  table.innerHTML = `<tr><td>1</td><td>a</td></tr><tr><td>2</td><td>b</td></tr>`
  instance.update({ rows: table.childNodes })
  any(el.innerHTML, [
    `<table><!-- --><tr><td>1</td><td>a</td></tr><tr><td>2</td><td>b</td></tr></table>`,
    `<table><!-- --><tbody><tr><td>1</td><td>a</td></tr><tr><td>2</td><td>b</td></tr></tbody></table>`
  ])
})

test('table: <tbody>{{ rows }}</tbody>', () => {
  let tpl = document.createElement('template')
  tpl.innerHTML = `<table><tbody>{{ rows }}</tbody></table>`
  let instance = new TemplateInstance(tpl)

  const el = document.createElement('div')
  el.appendChild(instance)
  is(el.innerHTML, `<table><tbody></tbody></table>`)

  const table = document.createElement('table')
  table.innerHTML = `<tr><td>1</td><td>a</td></tr><tr><td>2</td><td>b</td></tr>`
  instance.update({ rows: table.querySelector('tbody').childNodes })
  is(el.innerHTML, `<table><tbody><tr><td>1</td><td>a</td></tr><tr><td>2</td><td>b</td></tr></tbody></table>`)
})

test('table: {{text}}<table><tr><td>1</td></tr></table>', () => {
  let tpl = document.createElement('template')
  tpl.innerHTML = `{{ text }}<table><tr><td>1</td></tr></table>`
  let instance = new TemplateInstance(tpl, {text:'abc'})

  const el = document.createElement('div')
  el.appendChild(instance)
  any(el.innerHTML, [
    `abc<table><tr><td>1</td></tr></table>`,
    `abc<table><tbody><tr><td>1</td></tr></tbody></table>`
  ])
})

test('table: <table><thead>{{ rows }}</thead></table>', () => {
  // NOTE: thead, see next
  let tpl = document.createElement('template')
  tpl.innerHTML = `<table><thead>{{ thead }}</thead><tr>{{ tcontent }}</tr></table>`

  const table = document.createElement('table')
  table.innerHTML = `<tr><th>a</th></tr>`
  let thead = [...(table.querySelector('tbody')||table).childNodes][0]
  table.innerHTML = `<tr><td>1</td></tr>`
  let tcontent = [...(table.querySelector('tbody')||table).firstChild.childNodes][0]

  let instance = new TemplateInstance(tpl, {thead, tcontent})

  const el = document.createElement('div')
  el.appendChild(instance)
  any(el.innerHTML, [
    `<table><thead><tr><th>a</th></tr></thead><tr><td>1</td></tr></table>`,
    `<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>1</td></tr></tbody></table>`
  ])
})

test.todo('table: {{ thead }}{{ tbody }}<table><thead></thead></table>', () => {
  // NOTE: if you wrap content into <thead> - also wrap into <tbody>
})

test.todo('table: <table>{{a}}<tbody></tbody>{{b}}</table> → {{a}}{{b}}<table><tbody></tbody></table>', () => {
})

test.todo('table: <table>{{a}}{{b}}<tbody></tbody></table> → {{a}}{{b}}<table><tbody></tbody></table>', () => {
})

test.todo('table: <table><tr>{{ a }}</tr></table>', () => {
})

test.todo('table: <table>{{ a }}<tr></tr></table>', () => {
})

test.todo('table: <table><tr></tr>{{ a }}</table>', () => {
})

test.todo('table: <table><thead><tr>{{ a }}</tr></thead><tr>{{ b }}</tr></table>', () => {
})

test.todo('table: {{ prefix }}<table><thead>{{ thead }}</thead>{{ tbody }}</table>', () => {
})

test.todo('table: <table>{{thead}}<tbody><!-- ... --></tbody></table>', () => {
})
