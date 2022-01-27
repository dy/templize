import {cur, idx, skip, err, expr} from 'subscript/parser.js'
import parseExpr from 'subscript/subscript.js'
import sube, { observable } from 'sube'
import { prop } from 'element-props'
import { templize, NodeTemplatePart } from './api.js'

// extend default subscript
// '" strings with escaping characters
const BSLASH = 92,
  escape = {n:'\n', r:'\r', t:'\t', b:'\b', f:'\f', v:'\v'},
  string = q => (qc, c, str='') => {
    while (c=cur.charCodeAt(idx), c-q) {
      if (c === BSLASH) skip(), c=skip(), str += escape[c] || c
      else str += skip()
    }
    return skip()||err('Bad string'), () => str
  }
parseExpr.set('"', string(34))
parseExpr.set("'", string(39))

// ?:
parseExpr.set(':', 3.1, (a,b) => [a,b])
parseExpr.set('?', 3, (a,b) => a ? b[0] : b[1])

// literals
parseExpr.set('true', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>true })
parseExpr.set('false', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>false })

// a?.b - optional chain operator
parseExpr.set('?.',18, (a,b,aid,bid) => a?.[bid])

// a | b - pipe overload
parseExpr.set('|', 6, (a,b) => b(a))

// a in b operator
// parseExpr.set('in', (a,b) => (b = expr(), ctx => [(a.id)(ctx), b(ctx)])


const processor = {
  createCallback(instance, allParts, init) {
    if (states.get(instance)) return

    let parts = {}, // parts by ids used in parts
        values = {}, // template values state
        observers = {}, // observable properties in state
        ready, value, directive, ifPart

    // detect prop → part
    for (const part of allParts) {
      // parse arguments, also make :else part always eval to 1
      ;(part.eval = parseExpr(part.expression || '1'))
        .args.map(arg => (parts[arg]||=[]).push(part))

      // inner template
      if (part.directive === 'if') {
        // clauses in evaluation read detected clause by :if part and check if that's them
        ;(part.addCase = (casePart, content, update, evalCond=casePart.eval) => (
          casePart.eval = state => part.match ? '' : !evalCond(state) ? '' : (
            part.match = casePart, // flag found case
            // there is 2 ways how we can hide case elements:
            // either create all cases content in the beginning or recreate when condition matches (proposed by standard)
            // creating all upfront can be heavy initial hit; creating by processCallback can be heavy on update
            // so we make it lazy - create only on the first match and only update after
            !content ? (
              content=casePart.template.content.cloneNode(true),
              [,update]=templize(content,state,processor),
              content=[...content.childNodes] // keep refs
            ) : (update(state), content)
          )
        ))(ifPart=part)

        // `if` case goes first, so we clean up last matched case and detect match over again
        const caseEval = part.eval
        part.eval = (state) => (part.match = null, caseEval(state))
      }
      else if (part.directive === 'else-if') ifPart?.addCase(part)
      else if (part.directive === 'else') ifPart?.addCase(part), ifPart = null
      else if (part.directive === 'each') {
      }
      else if (part.directive) throw Error('Unknown directive', part.directive)
    }

    // hook up observables
    // FIXME: we don't know all possible observables here, eg. item.text.
    // We instead must check when we set the value to a part - if that's observable, it must be initialized
    for (let k in init) {
      if (observable(value = init[k]))
        observers[k] = sube(value, v => (values[k] = v, ready && this.processCallback(instance, parts[k], {[k]: v}))),
      registry.register(value, [observers, k])
      else values[k] = value
    }

    // initial state inits all parts
    ready = true, states.set(instance, [values, observers])
  },

  // updates diff parts from current state
  processCallback(instance, parts, state) {
    let [values, observers] = states.get(instance), k, part, v

    for (k in state) if (!observers[k]) values[k] = state[k] // extend state ignoring reactive vals
    // Object.assign(values, state)

    for (part of parts)
      if ((v = part.eval(values)) !== part.value) {
        // regular node set - either attrib or node part
        if (part.replace) part.replace(v)

        else part.setter.parts.length === 1 ? prop(part.element, part.attributeName, part.value = v) : part.value = v
      }
  }
}


// expressions processor
export const states = new WeakMap,

registry = new FinalizationRegistry(([obs, k]) => (obs[k]?.(), delete obs[k]))

export default processor

