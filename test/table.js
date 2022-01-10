
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

test.only('table: <tbody>{{ rows }}</tbody>', () => {
  let tpl = document.createElement('template')
  tpl.innerHTML = `<table><tbody>{{ rows }}<tbody></table>`
  let instance = new TemplateInstance(tpl)

  const el = document.createElement('div')
  el.appendChild(instance)
  is(el.innerHTML, `<table><tbody></tbody></table>`)

  const table = document.createElement('table')
  table.innerHTML = `<tr></tr><td>1</td><td>a</td><tr><td>2</td><td>b</td></tr>`
  instance.update({ rows: table.childNodes })
  is(el.innerHTML, `<table><tbody><tr></tr><td>1</td><td>a</td><tr><td>2</td><td>b</td></tr></tbody></table>`)
})

test('table: should not affect deliberately inserted before', () => {
  let el = document.createElement('div')
  el.innerHTML = `{{ text }}<table></table>`
})


// tabulars: caption, colgroup, col, thead, tbody, tfoot, tr, td, th

// {{ rows }}<table><thead></thead></table> → is that thead or tbody?
// {{ thead }}{{ tbody }}<table><thead></thead></table>
// <table>{{a}}<tbody></tbody>{{b}}</table> → {{a}}{{b}}<table><tbody></tbody></table>
// <table>{{a}}{{b}}<tbody></tbody></table> → {{a}}{{b}}<table><tbody></tbody></table>
// <table><tr>{{ a }}</tr></table>
// <table>{{ a }}<tr></tr></table>
// <table><tr></tr>{{ a }}</table>
// <table><thead><tr>{{ a }}</tr></thead><tr>{{ b }}</tr></table>

// {{ prefix }}<table><thead>{{ thead }}</thead>{{ tbody }}</table>

// <table>
// {{theadGoesHere}}
// <tbody><!-- ... --></tbody>
// </table>
