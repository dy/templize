import test, {is} from 'tst'
import h from 'hyperf'
import v from 'value-ref'
import templize from '../templize.js'
import {tick} from 'wait-please'


test('attribute: binds function', async () => {
  let el = h`<div x={{x}} onclick="{{ inc }}"></div>`
  let x = v(0)
  templize(el, { x, inc: ()=>x.value++ })
  is(el.x, 0)
  el.click()

  await tick()
  is(x.value, 1)
  is(el.x, 1)
})

test('attribute: does not expose function as attribute')
