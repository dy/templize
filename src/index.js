import processor from './processor.js'
import { templize } from './api.js'

// wrapper over templize defaulting to expressionProcessor
export default (el, init, proc=processor) => {

  // convert shortcut directives :if, :else, ... to inner template parts
  // can be used independently, eg. via spect
  directive(el, 'if')
  directive(el, 'else-if')
  directive(el, 'else')
  directive(el, 'each')

  return templize(el, init, proc)
}

function directive(el, dir, els=el.querySelectorAll(`[\\:${dir}]`), holder, tpl, expr) {
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
}

export { processor }
export * from './api.js'
