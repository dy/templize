# tpl-parts

> Generic element template parts

[Template Instantiation](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md) is limited to _\<template\>_ only;
[DOM Parts](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/DOM-Parts.md) lack hi-level convention and too early days.<br/>
_Template-parts_ provide generic template parts for any elements, same time acting as ponyfill.

Difference from [@github/template-parts](https://github.com/github/template-parts):

- Generic template parts for any elements.
- Drop-in vanilla ESM, no tooling.
- [Improved](https://github.com/github/template-parts/issues/38) parser.
- More complete spec [API surface](./src/api.js).
- [`<table>{{ data }}</table>`](https://github.com/domenic/template-parts/issues/2) fixed.
- Separate `processors.js` entry:
  - Expression processor (based on [subscript](https://github.com/spectjs/subscript)).
  - Reactive processor.
  - Combining processor.
<!-- - [`<svg width={{ width }}>`](https://github.com/github/template-parts/issues/26) and other cases fixed. -->

If either proposal lands, API will be assimilated.

## Usage

Drop `tpl-parts.js` into project folder and:

```html
<div id="foo" class="foo {{y}}">{{x}} world</div>

<script type="module">
import Parts from './tpl-parts.js'

const params = Parts(document.getElementById('foo'), { x: 'Hello', y: 'bar'})
// <div id="foo" class="foo bar">Hello world</div>

params.x = 'Goodbye'
// <div id="foo" class="foo bar">Goodbye world</div>
</script>
```

## API

_Tpl-Parts_ provide minimal [spec surface](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md#32-template-parts-and-custom-template-process-callback):

```js
import { TemplateInstance, NodeTemplatePart, AttributeTemplatePart } from './tpl-parts.js'

let tpl = new TemplateInstance(templateElement, initParams, processor)
tpl.update(newParams)
```

<details><summary>Spec API</summary>

```js
interface TemplateInstance : DocumentFragment {
    void update(any state);
};

callback TemplateProcessCallback = void (TemplateInstance, sequence<TemplatePart>, any state);

dictionary TemplateTypeInit {
    TemplateProcessCallback processCallback;
    TemplateProcessCallback? createCallback;
};

partial interface Document {
    void defineTemplateType(DOMString type, TemplateTypeInit typeInit);
};

interface TemplatePart {
    readonly attribute DOMString expression;
    attribute DOMString? value;
    stringifier;
};

interface AttributeTemplatePart : TemplatePart {
    readonly attribute Element element;
    readonly attribute DOMString attributeName;
    readonly attribute DOMString attributeNamespace;
    attribute boolean booleanValue;
};

interface NodeTemplatePart : TemplatePart {
    readonly attribute ContainerNode parentNode;
    readonly attribute Node? previousSibling;
    readonly attribute Node? nextSibling;
    [NewObject] readonly NodeList replacementNodes;
    void replace((Node or DOMString)... nodes);
    void replaceHTML(DOMString html);
};
```
</details>


## Processor

_Tpl-parts_ support any [standard](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md#32-template-parts-and-custom-template-process-callback) template parts processor:

```js
const params = Parts(element, initState, {
  createCallback(el, parts, state) {
    // ... init parts / parse expressions
  },
  processCallback(el, parts, state) {
    // ... update parts / evaluate expressions
  }
})
```

Default processor supports only direct values:

```js
{
  processCallback(instance, parts, state) {
    if (!state) return
    for (const part of parts) if (part.expression in state) part.value = state[part.expression]
  }
}
```

### Expression processor

For expressions support there is **expression processor** (based on [subscript](https://github.com/spectjs/subscript)):

```html
<header id="title">
  <h1>{{ user.name }}</h1>
  Email: <a href="mailto:{{ user.email }}">{{ user.email }}</a>
</header>

<script>
  import Parts, { expressions } from './tpl-parts.js'
  const titleParams = Parts(
    document.querySelector('#title'),
    { user: { name: 'Hare Krishna', email: 'krishn@hari.om' }},
    expressions
  )
  titleParams.user.name = 'Hare Rama'
</script>
```

It supports the following common expressions:

Part | Expression |  Note
---|---|---
Direct Value | `{{ foo }}` |
Property | `{{ foo.bar }}`, `{{ foo['bar'] }}` | Path-safe, allows null-ish paths.
Function call | `{{ foo(bar, baz) }}`, `{{ foo.bar(baz) }}` |
Boolean operators | `{{ !foo }}`, `{{ foo && bar \|\| baz }}` |
Ternary | `{{ foo ? bar : baz }}` |
Primitives | `{{ 'foo' }}`, `{{ true }}`, `{{ 0.1 }}` |
Comparison | `{{ foo == 1 }}`, `{{ bar != 2 }}` |
Math operators | `{{ a * 2 + b / 3 }}` | See [common operators](https://github.com/spectjs/subscript#design).
Pipe | `{{ bar \| foo }}` | Same as `{{ foo(bar) }}`.
<!-- Loop | `{{ item, idx in list }}` | `params.d` | Used for `:for` directive only -->
<!-- Spread | `{{ ...foo }}` | `params.foo` | Used to pass multiple attributes or nodes -->
<!-- Default fallback | `{{ foo || bar }}` | `params.foo`, `params.bar` | -->

### Reactive processor

There's also **reactive processor** for reactive values.

It allows initial state to take either direct values or async types: _Promise_, _AsyncIterable_, _Observable_.<br/>
Update happens when any param changes:

```html
<div id="done">{{ done || '...' }}</div>

<script type="module">
  import Parts, { reactivity } from './tpl-parts.js'

  const done = new Promise(ok => setTimeout(() => ok('Done!'), 1000))

  const params = Parts(document.querySelector('#done'), { done }, reactivity)

  // <div id="done">...</div>
  // ... 1s after
  // <div id="done">done</div>
</script>
```

This way, for example, _rxjs_ can be streamed directly to element attribute or content.

### Combining processors

To combine processors, use `combine`:

```js
import Parts, { expressions, reactivity, combine } from './tpl-parts.js'

const params = Parts(el, {}, combine(expressions, reactivity))
```

Each processor callback is called in sequence.

### External processors

Any external processor can be used with template-parts, eg. [@github/template-parts](https://github.com/github/template-parts):

```js
import Parts from 'template-parts'
import { propertyIdentityOrBooleanAttribute } from '@github/template-parts'

const params = Parts(
  document.getElementById('foo'),
  { x: 'Hello', hidden: false },
  propertyIdentityOrBooleanAttribute
)
params.hidden = true
```

Any _template-parts_ processor can also be used with other template parts libraries as:

```js
import { TemplateInstance } from '@github/template-parts'
import { expressions } from 'template-parts'

const instance = new TemplateInstance(document.querySelector('my-template'), {}, expressions)
```

<!-- ## See also -->

<!-- * [subscript](https://github.com/spectjs/subscript) − micro expression language. -->
<!-- * [element-props](https://github.com/spectjs/element-props) − normalized access to element attributes / properties. -->
<!-- * [define-element](https://github.com/spectjs/define-element) − declarative custom elements. -->

## Neighbors

* [@github/template-parts](https://github.com/github/template-parts) − viable Template Parts implementation, doesn't closely follow spec in secondary details, but provides reliable ground.
* [template-instantiation-polyfill](https://github.com/bennypowers/template-instantiation-polyfill#readme) − closely follows the Template Instantiation spec algorithm, but [is not recommended](https://github.com/bennypowers/template-instantiation-polyfill/pull/2#issuecomment-1004110993) by author.
* [PolymerLabs/template-instantiation](https://github.com/PolymerLabs/template-instantiation) − implementation from Google with TemplateAssembly, TemplateRule and other extensions.
* [stampino](https://www.npmjs.com/package/stampino) − small HTML template system based on lit-html.

<p align="center">🕉<p>
