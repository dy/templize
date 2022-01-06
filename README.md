# element-params

> Template parts for elements.

[Template Instantiation](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md) is limited to _\<template\>_.<br/>
[DOM Parts](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/DOM-Parts.md) lack hi-level convention and too early days.<br/>
_Element-params_ generalize template parts to any elements.

- Drop-in vanilla ESM, no tooling.
- Minimal implementation.
- Improved [@github/template-parts](https://github.com/github/template-parts) parser.
- Spec compatible API surface.
- [`<table>{{ data }}</table>`](https://github.com/domenic/template-parts/issues/2)
- Expression processors (based on [subscript](https://github.com/spectjs/subscript)).
<!-- - [`<svg width={{ width }}>`](https://github.com/github/template-parts/issues/26) and other cases fixed. -->

If either of the proposals land, API will be assimilated.

## Usage

Drop `element-params.js` into project folder and:

```html
<div id="foo" class="foo {{y}}">{{x}} world</div>

<script type="module">
import params from 'element-params.js'

const fooParams = params(document.getElementById('foo'), { x: 'Hello', y: 'bar'})
// <div id="foo" class="foo bar">Hello world</div>

fooParams.x = 'Goodbye'
// <div id="foo" class="foo bar">Goodbye world</div>
</script>
```

Params also support reactive or async types: _Promise_, _AsyncIterable_, _Observable_.
This way, for example, rxjs can be streamed directly to element attribute or content.
Update happens when state changes:

```html
<div id="done">{{ done || '...' }}</div>
<script type="module">
  import params from './element-params.js'
  import expr from './expr-processor.js'
  let done = new Promise(ok => setTimeout(() => ok('Done!'), 1000))
  params(document.querySelector('#done'), { done }, expr)
</script>
```

Element-params support any template parts compatible processor, eg. [@github/template-parts](https://github.com/github/template-parts) one:
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
```

Any external processor can be used with element-params:
 -->
```js
import params from 'element-params'
import {propertyIdentityOrBooleanAttribute} from '@github/template-parts'

const fooParams = params(
  document.getElementById('foo'),
  { x: 'Hello', hidden: false},
  propertyIdentityOrBooleanAttribute
)
fooParams.hidden = true
```
<!--
Default processor just sets values directly without processing.

```js
{
  processCallback(instance, parts, state) {
    if (!state) return
    for (const part of parts) if (part.expression in state) part.value = state[part.expression]
  }
}
``` -->

## Processors

### Default

<!-- ### Liquid -->

### Expression

<!-- ### Justin -->

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
