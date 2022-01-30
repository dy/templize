import test, {is} from 'tst'
import h from 'hyperf'
import v from 'value-ref'
import {AttributeTemplatePart} from '../template-parts.js'
import templize from '../templize.js'
import {tick} from 'wait-please'

test('nodes: should preserve spaces', t => {
  let el = h`<p><span>{{ count }}</span> {{ text }} left</p>`

  templize(el, {count: 10, text: 'items'})

  is(el.innerHTML, `<span>10</span> items left`)
})
