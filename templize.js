import processor, { directives } from './processor.js'
import { parse } from './template-parts.js'

// wrapper over templize with shortcut directives and defaulting to expressionProcessor
export default (el, state, proc=processor) => {
  // convert shortcut directives :if, :else, ... to inner template parts
  // could be used independently, eg. via spect
  // FIXME: ideally this should reside in processor, but would require swapping template parts
  for (let dir in directives) directives[dir].prepare(el)

  let parts = parse(el),
      params,
      update = diff => proc.processCallback(el, parts, diff)

  state ||= {}
  proc.createCallback?.(el, parts, state)
  proc.processCallback(el, parts, state)

  // return update via destructuring of result to allow batch-update
  state[Symbol.iterator] = function*(){ yield params; yield update; yield parts;}

  return params = new Proxy(state,  {
    set: (s, k, v) => (state[k]=v, update(state), 1),
    deleteProperty: (s,k) => (delete state[k], update(), 1)
  })
}

export { processor }
export * from './template-parts.js'
