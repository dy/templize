// spect node differ
// any differ from https://github.com/luwes/js-diff-benchmark/tree/master/libs can be used
// Algo from proposal is slower than spect implementation
// spec ref: https://github.com/bennypowers/template-instantiation-polyfill/blob/main/concepts/applyNodeTemplatePartList.ts
// spect ref: https://github.com/spectjs/spect/blob/master/test/libs/spect-inflate.js
// FIXME: make external
export default (parent, a, b, end = null) => {
  let i = 0, cur, next, bi, n = b.length, m = a.length

  // skip head/tail
  while (i < n && i < m && a[i] == b[i]) i++
  while (i < n && i < m && b[n-1] == a[m-1]) end = b[--m, --n]

  // append/prepend/trim shortcuts
  if (i == m) while (i < n) parent.insertBefore(b[i++], end)
  else {
    cur = a[i]
    while (i < n) {
      bi = b[i++], next = cur ? cur.nextSibling : end
      if (cur == bi) cur = next // skip
      else if (i < n && b[i] == next) (parent.replaceChild(bi, cur), cur = next) // swap / replace
      else parent.insertBefore(bi, cur) // insert
    }
    while (cur != end) (next = cur.nextSibling, parent.removeChild(cur), cur = next) // remove tail
  }

  return b
}
