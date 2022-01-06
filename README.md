# element-params

[Template Instantiation](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md) is limited to _\<template\>_.
[DOM Parts](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/DOM-Parts.md) lack hi-level convention and too early days.<br/>
_Element-params_ bring template parts to any elements.

- Drop-in vanilla ESM, no tooling.
- Improved [@github/template-parts](https://github.com/github/template-parts) parser.
- Spec compatible minimal [API surface](./src/api.js).
- [`<table>{{ data }}</table>`](https://github.com/domenic/template-parts/issues/2) fixed.
- Expression processor.
<!-- - [`<svg width={{ width }}>`](https://github.com/github/template-parts/issues/26) and other cases fixed. -->

If either proposal lands, API will be assimilated.

## Usage

Drop `element-params.js` into project folder and:

```html
<div id="foo" class="foo {{y}}">{{x}} world</div>

<script type="module">
import params from './element-params.js'

const fooParams = params(document.getElementById('foo'), { x: 'Hello', y: 'bar'})
// <div id="foo" class="foo bar">Hello world</div>

fooParams.x = 'Goodbye'
// <div id="foo" class="foo bar">Goodbye world</div>
</script>
```

Init state can take either direct values or async types: _Promise_, _AsyncIterable_, _Observable_.<br/>
Update happens when async state changes:

```html
<div id="done">{{ done || '...' }}</div>

<script type="module">
  import params from './element-params.js'
  import processor from './processor.js'

  const done = new Promise(ok => setTimeout(() => ok('Done!'), 1000))
  params(document.querySelector('#done'), { done }, processor)
</script>
```

This way, for example, _rxjs_ can be streamed directly to element attribute or content.

## Processor

_Element-params_ support any _template-parts_ compatible processor, eg. [@github/template-parts](https://github.com/github/template-parts):
<!--
```js
const parts = params(element, params, {
  createCallback(el, parts, state) {
    // ... init parts / parse expressions, eg.
    for (const part of parts) part.evaluate = parse(part.expression)
  },
  processCallback(el, parts, state) {
    // ... update parts / evaluate expressions, eg.
    for (const part of parts) part.evaluate(state)
  }
})
``` -->

<!-- Any external processor can be used with element-params, -->

```js
import params from 'element-params'
import { propertyIdentityOrBooleanAttribute } from '@github/template-parts'

const fooParams = params(
  document.getElementById('foo'),
  { x: 'Hello', hidden: false },
  propertyIdentityOrBooleanAttribute
)
fooParams.hidden = true
```

<!--
```js
export default {
  processCallback(instance, parts, state) {
    if (!state) return
    for (const part of parts) if (part.expression in state) part.value = state[part.expression]
  }
}
``` -->

Default processor supports only direct values.

For expressions support _element-params_ provide **common expression processor** (based on [subscript](https://github.com/spectjs/subscript)):

```html
<header id="title">
  <h1>{{ user.name }}</h1>
  Email: <a href="mailto:{{ user.email }}">{{ user.email }}</a>
</header>

<script>
  import params from './element-params.js'
  import processor from './processor.js'
  const title = params(
    document.querySelector('#title'),
    { user: { name: 'Hare Krishna', email: 'krishn@hari.om' }},
    processor
  )
  title.user.name = 'Hare Rama'
</script>
```

It supports the following expressions:

Part | Expression |  Note
---|---|---
Direct Value | `{{ foo }}` |
Property | `{{ foo.bar }}`, `{{ foo['bar'] }}` | Path-safe, allows null-ish paths
Function call | `{{ foo(bar, baz) }}`, `{{ foo.bar(baz) }}` |
Boolean operators | `{{ !foo }}`, `{{ foo && bar \|\| baz }}` |
Ternary | `{{ foo ? bar : baz }}` |
Primitives | `{{ 'foo' }}`, `{{ true }}`, `{{ 0.1 }}` |
Comparison | `{{ foo == 1 }}`, `{{ bar != 2 }}` |
Math operators | `{{ a * 2 + b / 3 }}` | [Common operators](https://github.com/spectjs/subscript#design)
Pipe | `{{ bar \| foo }}` | Same as `{{ foo(bar) }}`
<!-- Loop | `{{ item, idx in list }}` | `params.d` | Used for `:for` directive only -->
<!-- Spread | `{{ ...foo }}` | `params.foo` | Used to pass multiple attributes or nodes -->
<!-- Default fallback | `{{ foo || bar }}` | `params.foo`, `params.bar` | -->


Expression processor can be used with other template parts libraries as:

```js
import {TemplateInstance} from '@github/template-parts'
import expressionProcessor from 'element-params/processor'

const instance = new TemplateInstance(document.querySelector('my-template'), {}, expressionProcessor)
```

<!--
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
-->


## See also

* [subscript](https://github.com/spectjs/subscript) − micro expression language.
* [element-props](https://github.com/spectjs/element-props) − normalized access to element attributes / properties.
<!-- * [define-element](https://github.com/spectjs/define-element) − declarative custom elements. -->

## Neighbors

* [@github/template-parts](https://github.com/github/template-parts) − viable Template Parts implementation, doesn't closely follow spec in secondary details, but provides reliable solution.
* [template-instantiation-polyfill](https://github.com/bennypowers/template-instantiation-polyfill#readme) − closely follows the Template Instantiation spec algorithm, but [is not recommended](https://github.com/bennypowers/template-instantiation-polyfill/pull/2#issuecomment-1004110993) by author.
* [PolymerLabs/template-instantiation](https://github.com/PolymerLabs/template-instantiation) − implementation from Google with TemplateAssembly, TemplateRule and other extensions.
* [stampino](https://www.npmjs.com/package/stampino) − small HTML template system based on lit-html.

<p align="center">🕉<p>
