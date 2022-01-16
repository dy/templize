import { parse } from './parse.js'
import processor from './processor.js'

export default (node, params, proc=processor) => {
  let parts = parse(node),
      planned,
      // throttled for batch update
      update = () => {
        if (!planned) {
          proc.processCallback(node, parts, params) // first set is immediate
          planned = Promise.resolve().then(() => (
            planned = null, proc.processCallback(node, parts, params)
          )) // rest is throttled
        }
      }

  proc.createCallback?.(node, parts, params)
  proc.processCallback(node, parts, params)

  return new Proxy(params,  {
    set: (state, k, v) => (state[k] = v, update(), 1),
    deleteProperty: (state,k) => (delete state[k], update())
  })
}

export * from './api.js'
export { processor }
