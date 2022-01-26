import { parse } from './parse.js'
import processor from './processor.js'

export default (node, state, proc=processor) => {
  let parts = parse(node),
      params,
      update = (diff) => proc.processCallback(node, parts, Object.assign(state, diff))

  state ||= {}

  proc.createCallback?.(node, parts, state)
  proc.processCallback(node, parts, state)

  // pass update to output to allow batch-update
  state[Symbol.iterator] = function*(){ yield params; yield update;}

  return params = new Proxy(state,  {
    set: (s, k, v) => (update({[k]: v}), 1),
    deleteProperty: (s,k) => (delete state[k], update(), 1)
  })
}

export * from './api.js'
export { processor }
