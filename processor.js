import { cur, idx, skip, err, expr } from 'subscript/parser.js'
import parseExpr from 'subscript/subscript.js'
import sube, { observable } from 'sube'
import { prop } from 'element-props'
import { NodeTemplatePart, TemplateInstance } from './template-parts.js'


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

// a in b operator for loops
parseExpr.set('in', (a,b) => (b = expr(), ctx => [a.id(ctx), b(ctx)]))


export const states = new WeakMap,

processor = {
  createCallback(instance, allParts, state) {
    if (states.get(instance)) return

    let partIds = {}, values = {}, v, obs={}, ready,

    // hook up observables (deeply, to include item.text etc)
    // that's least evil compared to dlv/dset or proxies
    // moving it to processCallback makes it a bit heavy
    // it gives bonus of reinitializing observers, but we don't need it (tentatively)
    // and it still needs recursion to avoid extending values with observables, but
    // here we also avoid reinitializing same element multiple times, but in processCallback that's impossible
    rsube = (state, values, root) => {
      for (let k in state) {
        if (observable(v = state[k]))
          registry.register(v, sube(v, v => (values[k] = v, ready && this.processCallback(instance, partIds[root||k]))))
        else if (v?.constructor === Object) rsube(v, values[k] = {}, root||k)
        else values[k] = v
      }
    }

    // detect prop → part
    for (const part of allParts) {
      (part.eval = parseExpr(part.expression)).args.map(arg => (partIds[arg]||=[]).push(part))

      // apply directives
      directives[part.directive]?.create(instance, part, state)
    }

    // extend state, hook up observables
    rsube(state, values)

    // initial state inits all parts
    states.set(instance, [values])

    ready=true
  },

  // updates diff parts from current state
  processCallback(instance, parts, state) {
    let [values] = states.get(instance), k, part, v

    patch(values, state)

    // rerender affected parts
    for (part of parts) {
      if ((v = part.eval(values)) !== part.value) {
        if (part.replace) part.replace(v)
        // <x attr={{single}}>
        else part.setter.parts.length === 1 ? prop(part.element, part.attributeName, part.value = v) : part.value = v
      }
    }
  }
},

registry = new FinalizationRegistry(unsub => unsub?.call?.()),

patch = (a,b) => {
  for (let k in b) if (k in a) b[k]?.constructor == Object ? patch(a[k], b[k]) : !observable(b[k]) ? a[k] = b[k] : 0
},

directives = {},

directive = (dir, create) => directives[dir] = {
  prepare(el, els=el.querySelectorAll(`[\\:${dir}]`), holder, tpl, expr) {
    // replace all shortcuts with inner templates
    for (el of els) {
      el.replaceWith(holder=new Text)
      tpl = document.createElement('template')
      tpl.content.appendChild(el)
      tpl.setAttribute('directive', dir)
      expr = el.getAttribute(':'+dir)
      tpl.setAttribute('expression', expr.slice(expr.indexOf('{{')+2, expr.lastIndexOf('}}')))
      el.removeAttribute(':'+dir)
      holder.replaceWith(tpl)
    }
  },
  create
}

// configure directives
directive('if', (instance, part) => {
  // clauses in evaluation read detected clause by :if part and check if that's them
  (part.addCase = (casePart, matches=casePart.eval) => (
    casePart.eval = state => part.match ? '' : !matches(state) ? '' : (
      part.match = casePart, // flag found case
      // FIXME: create on the first match and only update after; complicated by instance losing children on update
      new TemplateInstance(casePart.template, state, processor)
    )
  ))(instance.ifPart=part)

  // `if` case goes first, so we clean up last matched case and detect match over again
  const evalCase = part.eval
  part.eval = state => (part.match = null, evalCase(state))
})
directive('else-if', (instance, part) => instance.ifPart?.addCase(part))
directive('else', (instance, part) => (part.eval=()=>true, instance.ifPart?.addCase(part), instance.ifPart=null) )

directive('each', (instance, part) => {
  let evalLoop = part.eval
  part.eval = state => {
    let [itemId, items] = evalLoop(state), list=[]
    // FIXME: cache instances instead of recreating. Causes difficulties tracking instance children
    for (let item of items) list.push(new TemplateInstance(part.template, {...state,[itemId]:item}, processor))
    return list
  }
})


export default processor

