# element-parts

Element template parts, inspired by [template-instantiation](https://github.com/w3c/webcomponents/blob/159b1600bab02fe9cd794825440a98537d53b389/proposals/Template-Instantiation.md) and [dom-parts](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/DOM-Parts.md) and related.

```html
<div id="foo" class="foo {{y}}">{{x}} world</div>

<script type="module">
import params from 'element-params.js'

const el = document.getElementById('foo')
const el.params = params(el, { x: 'Hello', y: 'bar'})
el.params.x = 'Goodbye'
</script>
```

## Motivation

_Template Parts_ is limited to templates and complex. _DOM Parts_ is too low-level and even more complex.
_Element-params_ takes simple hi-level convention, hoping either of these proposals will come true.

- Single drop-in vanilla ESM file.
- Improved [@github/template-parts](https://github.com/domenic/template-parts) parser.
- Spec compatible API surface.
- [`<table>`](https://github.com/domenic/template-parts/issues/2), [`<svg>`](https://github.com/github/template-parts/issues/26) and other cases fixed.
- Elaborate default processor (based on [subscript](https://github.com/spectjs/subscript)).

## Usage

```html
<div id="foo" class="foo {{y}}">{{x}} world</div>

<script>
import params from 'element-params.js'

const parts = params(document.getElementById('foo'), { x: 'Hello', y: 'bar'})
parts.update({ x: 'Goodbye' })
</script>
```

### Reactivity

Params can support reactive or async types: _Promise_, _AsyncIterable_, _Observable_.
Update happens when state changes:

```html
<div id="done">{{ done || '...' }}</div>
<script>
  let done = new Promise(ok => setTimeout(() => ok('Done!'), 1000))
  params(document.querySelector('#done'), { done })
</script>
```

This way, for example, rxjs can be streamed directly to the template.

### Processor

_Element-params_ supports _Template-Parts_ compatible processor:

```js
const parts = params(element, params, {
  // alias: createCallback
  create(instance, parts, state) {
    instance.update(state)
  },

  // alias: processCallback
  process(instance, parts, state) {
    if (!state) return
    for (const part of parts)
      // part is DOM-part / TemplatePart
      if (part.expression in state) part.value = state[part.expression]
  }
})
```

Any external processor can be used with element-params:

```js
import params from 'element-params.js'
import {propertyIdentityOrBooleanAttribute} from '@github/template-parts'

const params = params(document.getElementById('foo'), { x: 'Hello', hidden: false}, propertyIdentityOrBooleanAttribute)
```

### Default Processor

_Element-params_ by default provides common expression processor:

```html
<h1 id="title">{{ user.name }}</h1>Email: <a href="mailto:{{ user.email }}">{{ user.email }}</a>
<script>
  import params from 'element-params.js'
  const title = params(
    document.querySelector('#title'),
    { user: { name: 'Hare Krishna', email: 'krishn@hari.om' }}
  )
  title.update({ user: { name: 'Hare Rama', email: 'ram@hari.om' } })
</script>
```

It supports the following expressions:

Part | Expression | Accessible as | Note
---|---|---|---
Value | `{{ foo }}` | `params.foo` |
Property | `{{ foo.bar }}` | `params.foo.bar` | Property access is path-safe and allows null-ish paths
Function call | `{{ foo(bar) }}` | `params.foo`, `params.bar` |
Method call | `{{ foo.bar() }}` | `params.foo.bar` |
Inversion | `{{ !foo }}` | `params.foo` |
Boolean operators | `{{ foo && bar \|\| baz }}` | `params.foo`, `params.bar`, `params.baz` |
Ternary | `{{ foo ? bar : baz }}` | `params.foo`, `params.bar`, `params.baz` |
Primitive literals | `{{ 'foo' }}`, `{{ true }}`, `{{ 0.1 }}` | |
Comparison | `{{ foo == 1 }}` | `params.foo` |
Loop | `{{ item, idx in list }}` | `params.d` | Used for `:for` directive only
Math | `{{ a * 2 + b / 3 }}` | `params.a`, `params.b` |
Pipe | `{{ bar \| foo }}` | `params.foo`, `params.bar` | Same as `{{ foo(bar) }}`
Spread | `{{ ...foo }}` | `params.foo` | Used to pass multiple attributes or nodes
<!-- Default fallback | `{{ foo || bar }}` | `params.foo`, `params.bar` | -->

Default processor can be used with any other Template Parts library as:

```js
import {TemplateInstance} from '@github/template-parts'
import {processor} from 'element-params.js'

let instance = new TemplateInstance(document.querySelector('my-template'), {}, processor)
```

Template processor is implemented via [subscript](https://github.com/spectjs/subscript).

### Loops

Iteration is organized via `:for` directive:

```html
<ul>
  <li :for="{{ item, index in items }}" id="item-{{ index }}">{{ item.text }}</li>
</ul>
```

Note that `index` starts with `1`, not `0`.

Cases:

```html
<li :for="{{ item, index in array }}">
<li :for="{{ key, value, index in object }}">
<li :for="{{ count in number }}">
```

### Conditions

Conditionals can be organized either as ternary template part or via `:if`, `:else-if`, `:else` directives.

For text variants ternary operator is shorter:

```html
<span>Status: {{ status === 0 ? 'Active' : 'Inactive' }}</span>
```

To optionally display an element, use `:if`-`:else-if`-`:else`:

```html
<span :if="{{ status === 0 }}">Inactive</span>
<span :else-if="{{ status === 1 }}">Active</span>
<span :else>Finished</span>
```

## Related polyfills

* [@github/template-parts](https://github.com/github/template-parts) − viable Template Parts implementation, doesn't closely follow spec in secondary details, but provides workable solution
* [template-instantiation-polyfill](https://github.com/bennypowers/template-instantiation-polyfill#readme) − closely follows the Template Instantiation spec algorithm
* [PolymerLabs/template-instantiation](https://github.com/PolymerLabs/template-instantiation) − implementation from Google with TemplateAssembly, TemplateRule and other extensions
* [@matthewp/template-instantiation](https://github.com/matthewp/template-instantiation) − published to npm PolymerLabs/template-instantiation

## Similar libs

* [stampino](https://www.npmjs.com/package/stampino) − small HTML template system based on lit-html

## See also

* [subscript](https://github.com/spectjs/subscript) − micro expression language.

<p align="center">🕉<p>
