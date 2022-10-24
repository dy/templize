import { parse as parseExpr, compile, set } from 'subscript'
import { cur, idx, skip, err, expr } from 'subscript/parse.js'
import sube, { observable } from 'sube'
import { prop } from 'element-props'
import { parse, TemplateInstance } from 'template-parts'

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


// extend default subscript
// '" strings with escaping characters
let escape = {n:'\n', r:'\r', t:'\t', b:'\b', f:'\f', v:'\v'},
  string = q => (qc, c, str='') => {
    qc&&err('Unexpected string') // must not follow another token
    skip()
    while (c=cur.charCodeAt(idx), c-q) {
      if (c === 92) skip(), c=skip(), str += escape[c] || c
      else str += skip()
    }
    skip()
    return ['', str]
  },

  collectArgs = (_, ...args) => args.flatMap(arg => Array.isArray(arg) ? collectArgs(...arg) : arg ? [arg] : [])

set('"', null, [string(34)])
set("'", null, [string(39)])

// ?:
set('?', 3, [
    (a, b, c) => a && (b=expr(2,58)) && (c=expr(3), ['?', a, b, c]),
    (a, b, c) => (a=compile(a),b=compile(b),c=compile(c), ctx => a(ctx) ? b(ctx) : c(ctx))
  ])

set('??', 6, (a,b) => a ?? b)

// a?.[, a?.( - postfix operator
set('?.', 18, [a => a && ['?.', a], a => (a=compile(a), ctx => a(ctx)||(()=>{})) ])

// a?.b - optional chain operator
set('?.', 18, [
    (a,b) => a && (b=expr(18),!b?.map) && ['?.',a,b],
    (a,b) => b && (a=compile(a), ctx => a(ctx)?.[b])
  ])


// literals
set('null', 20, [a => a ? err() : ['',null]])
set('true', 20, [a => a ? err() : ['',true]])
set('false', 20, [a => a ? err() : ['',false]])
set('undefined', 20, [a => a ? err() : ['',undefined]])

// a | b - pipe overload
set('|', 6, (a,b) => b(a))

// a in b operator for loops
set('in', 10, [(a,b) => ['in',a,expr(10)], (a,b) => ctx => [a,ctx[b]]] )


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
      const ast = parseExpr(part.expression)
      // console.log(ast, collectArgs(null,ast))
      collectArgs(null,ast).map(arg => (partIds[arg]||=[]).push(part))
      part.eval = compile(ast)

      // apply directives
      directives[part.directive]?.create(instance, part, state)
    }

    // extend state, hook up observables
    if (allParts.length) rsube(state, values)

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
