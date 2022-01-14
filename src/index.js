import { parse } from './parse.js'
import expressions from './processor.js'

export default (node, params, processor=expressions) => {
  let parts = parse(node),
      planned,
      // throttled for batch update
      update = () => {
        if (!planned) {
          processor.processCallback(node, parts, params) // first set is immediate
          planned = Promise.resolve().then(() => (
            planned = null, processor.processCallback(node, parts, params)
          )) // rest is throttled
        }
      }


  processor.createCallback?.(node, parts, params)
  processor.processCallback(node, parts, params)

  // adopt dispose from node (Symbol.dispose is defined there)
  ;(params ||= {})[Symbol.dispose] = node[Symbol.dispose]

  return new Proxy(params,  {
    set: (state, k, v) => (state[k] = v, update(), 1),
    deleteProperty: (state,k) => (delete state[k], update())
  })
}

export * from './api.js'
export { processor }
