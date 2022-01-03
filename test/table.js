
import test, {is} from './lib/tst.js'
import {TemplateInstance} from '../template-parts.js'

test('table: default HTML behavior', () => {
  let tpl = document.createElement('template')
  tpl.innerHTML = `<table>123</table>`
  let instance = new TemplateInstance(tpl)

  const el = document.createElement('div')
  el.appendChild(instance)
  is(el.innerHTML, `123<table></table>`)
})

test.todo('table: inserted rows', () => {
  let tpl = document.createElement('template')
  tpl.innerHTML = `<table>{{ rows }}</table>`
  let instance = new TemplateInstance(tpl)

  const el = document.createElement('div')
  el.appendChild(instance)
  is(el.innerHTML, `<table></table>`)

  const table = document.createElement('table')
  table.innerHTML = `<tr></tr><td>1</td><td>a</td><tr><td>2</td><td>b</td></tr>`
  instance.update({ rows: table.childNodes })
  is(el.innerHTML, `<table><tr></tr><td>1</td><td>a</td><tr><td>2</td><td>b</td></tr></table>`)
})


// tabulars: caption, colgroup, col, thead, tbody, tfoot, tr, td, th

// <table>{{a}}<tbody></tbody>{{b}}</table> → {{a}}{{b}}<table><tbody></tbody></table>
// <table>{{a}}{{b}}<tbody></tbody></table> → {{a}}{{b}}<table><tbody></tbody></table>

// <table>
// {{theadGoesHere}}
// <tbody><!-- ... --></tbody>
// </table>
