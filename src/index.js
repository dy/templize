import processor from './processor.js'
import { templize } from './api.js'
import { directive, directives } from './directives.js'

// wrapper over templize with shortcut directives and defaulting to expressionProcessor
export default (el, init, proc=processor) => {
  // convert shortcut directives :if, :else, ... to inner template parts
  // could be used independently, eg. via spect
  // FIXME: ideally this should reside in processor, but would require swapping template parts
  for (let dir in directives) directives[dir].prepare(el)
  return templize(el, init, proc)
}

export { processor, directive }
export * from './api.js'
