// expression processor
import parse from './lib/subscript.js'
import { sube, observable } from './lib/sube.js'

// extend default subscript
// ?:
parse.set(':', 3.1, (a,b) => [a,b])
parse.set('?', 3, (a,b) => a ? b[0] : b[1])

// literals
parse.set('true', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>true })
parse.set('false', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>false })

// a?.b - optional chain operator
parse.set('?.',18, (a,b,aid,bid) => a?.[bid])

// a | b - pipe overload
parse.set('|', 6, (a,b) => b(a))


export const expressions = {
  createCallback(el, parts, state) {
    for (const part of parts) (part.evaluate = parse(part.expression))
  },
  processCallback(el, parts, state) {
    for (const part of parts) part.value = part.evaluate(state)
  }
},

reactivity = {
  createCallback(el, parts, state, subs=[]) {
    // we have to convert reactive state values into real ones
    for (const k in state) if (observable(state[k])) subs.push(sube(state[k], v => state[k] = v)), state[k] = null
  }
},

combine = (...processors) => ({
  createCallback: (a,b,c) => processors.map(p => p.createCallback?.(a,b,c)),
  processCallback: (a,b,c) => processors.map(p => p.processCallback?.(a,b,c))
})
