import { parse } from './parse.js'
import { values } from './api.js'

export default (node, params={}, processor=values) => {
  let parts = parse(node),
      planned,
      // throttled for batch update
      update = () => {
        if (!planned) {
          processor.processCallback?.(node, parts, params) // first set is immediate
          planned = Promise.resolve().then(() => (
            planned = null, processor.processCallback?.(node, parts, params)
          )) // rest is throttled
        }
      }

  processor.createCallback?.(node, parts, params)
  processor.processCallback?.(node, parts, params)

  return new Proxy(params,  {
    set: (state, k, v) => (state[k] = v, update(), 1),
    deleteProperty: (state,k) => (delete state[k], update())
  })
}

export * from './api.js'
