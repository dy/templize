import processor from './processor.js'
import { templize } from './api.js'

// wrapper over templize defaulting to expressionProcessor
export default (el, init, proc=processor) => templize(el, init, proc)

export { processor }
export * from './api.js'
