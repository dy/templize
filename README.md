# element-params

Element templating system, inspired by [template-instantiation](https://github.com/w3c/webcomponents/blob/159b1600bab02fe9cd794825440a98537d53b389/proposals/Template-Instantiation.md) and [dom-parts](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/DOM-Parts.md).

## Motivation

_Template Instantiation_ is limited only to template elements.
_DOM Parts_ is missing hi-level convention, too complex/overengineered and very early days.
_Element-Params_ takes convention of template parts and generalizes to any elements.

- Single drop-in vanilla ESM file.
- Improved [@github/template-parts](https://github.com/domenic/template-parts) parser.
- Spec compatible API surface.
- [`<table>`](https://github.com/domenic/template-parts/issues/2), [`<svg>`](https://github.com/github/template-parts/issues/26) and other cases fixed.
<!-- - Optional expression processor (based on [subscript](https://github.com/spectjs/subscript)). -->

## Usage

Init params on any element as `params(element, init?)`, where optional `init` is initial state. Returned object is params state, changing its properties updates corresponding parts.

```html
<div id="foo" class="foo {{y}}">{{x}} world</div>

<script>
import params from 'element-params.js'

const fooParams = params(document.getElementById('foo'), { x: 'Hello', y: 'bar'})

{...fooParams} // { x, y }

fooParams.x = 'Goodbye'
// <div id="foo" class="foo bar">Goodbye world</div>
</script>
```

### Processor

_Element-params_ support _Template-Parts_ compatible processor:

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

```js
import params from 'element-params.js'
import {propertyIdentityOrBooleanAttribute} from '@github/template-parts'

const fooParams = params(document.getElementById('foo'), { x: 'Hello', hidden: false}, propertyIdentityOrBooleanAttribute)
fooParams.hidden = true
```

Default processor just sets values directly without processing.

See [expr-processor](https://github.com/spect/expr-processor) for list of available expression processors.

### Reactivity

Params also support reactive or async types: _Promise_, _AsyncIterable_, _Observable_.
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

This way, for example, rxjs can be streamed directly to element attribute or content.


## See also

* [expr-processor](https://github.com/spectjs/expr-processor) − list of available template parts expression processors.
* [subscript](https://github.com/spectjs/subscript) − micro expression language.
* [element-props](https://github.com/spectjs/element-props) − normalized access to element attributes / properties.
* [define-element](https://github.com/spectjs/define-element) − declarative custom elements.

## Neighbors

* [@github/template-parts](https://github.com/github/template-parts) − viable Template Parts implementation, doesn't closely follow spec in secondary details, but provides workable solution
* [template-instantiation-polyfill](https://github.com/bennypowers/template-instantiation-polyfill#readme) − closely follows the Template Instantiation spec algorithm
* [PolymerLabs/template-instantiation](https://github.com/PolymerLabs/template-instantiation) − implementation from Google with TemplateAssembly, TemplateRule and other extensions
* [@matthewp/template-instantiation](https://github.com/matthewp/template-instantiation) − published to npm PolymerLabs/template-instantiation
* [stampino](https://www.npmjs.com/package/stampino) − small HTML template system based on lit-html

<p align="center">🕉<p>
