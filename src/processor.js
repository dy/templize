import {cur, idx, skip, err, expr} from 'subscript/parser.js'
import parseExpr from 'subscript/subscript.js'
import sube, { observable } from 'sube'
import { prop } from 'element-props'
import templize from './index.js'

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
        part, ready, value, directive


    // detect prop → part
    for (part of allParts) {
      // Collect directives: either short or full
      // if (part.element.hasAttribute(':if')) {

      // }

      // inner template
      if (part.directive === 'if') {
        console.log(part)

        // since template instantiation API is not stabilized, we refer to templizing
        let evalCondition = parseExpr(part.expression),
              content = part.template.content.cloneNode(true),
              [params, update] = templize(content, init, processor)
        // documentFragment loses children, so we keep refs
        content = [...content.childNodes]

        // FIXME: there's redundancy: on every evaluate it creates node anew
        part.evaluate = (state) => evalCondition(state) ? (update(state), content) : null

        // collect if else-if else group, replace with single part?
      }
      else if (part.directive === 'else-if' || part.directive === 'else' ) {
      }
      else if (part.directive === 'each') {
      }
      else if (part.directive) throw Error('Unknown directive', part.directive)

      else (part.evaluate = parseExpr(part.expression)).args.map(arg => (parts[arg]||=[]).push(part))
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
    let [values, observers] = states.get(instance), k, part, v, directive

    for (k in state) if (!observers[k]) values[k] = state[k] // extend state ignoring reactive vals
    // Object.assign(values, state)

    for (part of parts)
      if ((v = part.evaluate(values)) !== part.value) {
        // apply functional or other setters
        if (part.attributeName && part.setter.parts.length === 1) prop(part.element, part.attributeName, part.value = v)

        // regular node set - either attrib or node part
        else part.value = v
      }
  }
}


// expressions processor
export const states = new WeakMap,

registry = new FinalizationRegistry(([obs, k]) => (obs[k]?.(), delete obs[k])),

directives = {
  'if': (instance, part, state) => {
    // FIXME: this can be broken
    if (part.evaluate(state)) part.replace(new instance.constructor())
  },
  'else-if': () => {},
  'else': () => {},

  each: (part, state) => {
    console.log(part.expression)
    // const nodes = state[part.expression].map(
    //   item => new TemplateInstance(part.template, state)
    // )
    // part.replace(nodes);
  }
}

export default processor

