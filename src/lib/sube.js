if (!Symbol.observable) Symbol.observable=Symbol('observable')

// observable utils
// FIXME: make an external dependency, shareable with spect/tmpl-parts
export const sube = (target, next, stop) => (
  next.next = next,
  target && (
    target.subscribe?.( next ) ||
    target[Symbol.observable]?.().subscribe?.( next ) ||
    target.set && target.call?.(stop, next) || // observ
    (
      target.then?.(v => !stop && next(v)) ||
      (async _ => { for await (target of target) { if (stop) return; next(target) } })()
    ) && _ => stop=1
  )
),

observable = (arg) => arg && !!(
  arg[Symbol.observable] || arg[Symbol.asyncIterator] ||
  (arg.call && arg.set) ||
  arg.subscribe || arg.then
  // || arg.mutation && arg._state != null
)
