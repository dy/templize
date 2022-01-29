import v from 'value-ref'
import test, {is, throws} from 'tst'
import {tick, time} from 'wait-please'
import templize from '../templize.js'
import h from 'hyperf'


test('loops: long', async () => {
  let el = h`<p>
    <template directive="each" expression="item in items">{{item.id}}:{{item.value}},</template>
  </p>`

  const params = templize(el, { items: [{id:1,value:'a'}] })

  is(el.innerHTML, '1:a,')
  params.items = [params.items[0], {id:2,value:'b'}]
  is(el.innerHTML, '1:a,2:b,')

  delete params.items
})

test('loops: long base', async () => {
  let el = h`<p>
    <template directive="each" expression="item in items">{{item.id}}:{{item.value}},</template>
  </p>`

  const params = templize(el, { items: [{id:1,value:'a'}, {id:2,value:'b'}] })

  is(el.innerHTML, '1:a,2:b,')
  params.items = [...params.items, {id:3,value:'c'}]
  is(el.innerHTML, '1:a,2:b,3:c,')

  delete params.items
})

test.browser('loops: short', async () => {
  // FIXME: in some conspicuous reason jsdom fails to update text nodes somehow
  let el = h`<p>
    <span :each="{{ item in items }}">{{ item }}</span>
  </p>`

  const params = templize(el, { items: [] })

  is(el.innerHTML, '')
  params.items = [1,2]
  is(el.innerHTML, '<span>1</span><span>2</span>')
  params.items = []
  is(el.innerHTML, '')

  delete params.items
})

test.todo('loops: reactive values', async () => {

})

test.todo('loops: condition within loop')

test.todo('loops: loop within condition')
