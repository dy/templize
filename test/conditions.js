import v from 'value-ref'
import test, {is, throws} from 'tst'
import {tick, time} from 'wait-please'
import templize from '../src/index.js'
import exprProcessor, { states, registry } from '../src/processor.js'
import h from 'hyperf'

test('conditions: long', async () => {
  let el = h`<p>
    <template directive="if" expression="a==1"><span>a</span></template>
    <template directive="else-if" expression="a==2"><span>b</span></template>
    <template directive="else"><span>c</span></template>
  </p>`

  const params = templize(el, { a: 1 }, exprProcessor)

  is(el.innerHTML, '<span>a</span>')
  params.a = 2
  is(el.innerHTML, '<span>b</span>')
  params.a = 3
  is(el.innerHTML, '<span>c</span>')

  delete params.a
})

test('conditions: short', async () => {
  let el = h`<p>
    <span :if="{{ a==1 }}">a</span>
    <span :else-if="{{ a==2 }}">b</span>
    <span :else >c</span>
  </p>`

  const params = templize(el, { a: 1 }, exprProcessor)

  is(el.innerHTML, '<span>a</span>')
  params.a = 2
  is(el.innerHTML, '<span>b</span>')
  params.a = 3
  is(el.innerHTML, '<span>c</span>')

  delete params.a
})

test('conditions: short with insertions', async () => {
  let el = h`<p>
    <span :if="{{ a==1 }}">{{a}}</span>
    <span :else-if="{{ a==2 }}">{{a}}</span>
    <span :else >{{a}}</span>
  </p>`

  const params = templize(el, { a: 1 }, exprProcessor)

  is(el.innerHTML, '<span>1</span>')
  params.a = 2
  is(el.innerHTML, '<span>2</span>')
  params.a = 3
  is(el.innerHTML, '<span>3</span>')
  params.a = 4
  is(el.innerHTML, '<span>4</span>')

  delete params.a
})

test.todo('conditions: reactive values', async () => {

})
