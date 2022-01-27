export const directives = {},

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
