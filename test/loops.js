import v from 'value-ref'
import test, {is, throws} from 'tst'
import {tick, time} from 'wait-please'
import templize from '../src/index.js'
import h from 'hyperf'


test('loops: long', async () => {
  let el = h`<p>
    <template directive="each" expression="item in items">{{item.id}}:{{item.value}},</template>
  </p>`

  const params = templize(el, { items: [{id:1,value:'a'},{id:2,value:'b'}] })

  is(el.innerHTML, '1:a,2:b,')
  params.items = [...params.items, {id:3,value:'c'}]
  is(el.innerHTML, '1:a,2:b,3:c,')

  delete params.items
})

test.todo('loops: short', async () => {
  let el = h`<p>
    <span :each="{{ item in items }}">a</span>
  </p>`

  const params = templize(el, { a: 1 }, exprProcessor)

  is(el.innerHTML, '<span>a</span>')
  params.a = 2
  is(el.innerHTML, '<span>b</span>')
  params.a = 3
  is(el.innerHTML, '<span>c</span>')

  delete params.a
})

test.todo('loops: reactive values', async () => {

})

test.todo('loops: condition within loop')

test.todo('loops: loop within condition')
