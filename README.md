# templize <a href="https://github.com/spectjs/templize/actions/workflows/node.js.yml"><img src="https://github.com/spectjs/templize/actions/workflows/node.js.yml/badge.svg"/></a> <a href="http://npmjs.org/templize"><img src="https://img.shields.io/npm/v/templize"/></a>

> Template parts for any elements

[Template Instantiation](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md) is limited to _\<template\>_ only;
[DOM Parts](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/DOM-Parts.md) lack hi-level convention and too early days.<br/>
_Templize_ provides generic template parts for any elements, same time covering minimal spec surface.
If either proposal lands, API will be assimilated.

## Features

Essentially extension of [@github/template-parts](https://github.com/github/template-parts) with the following:

- Works with any elements.
- Single vanilla ESM, no tooling.
- Improved parser ([#38](https://github.com/github/template-parts/issues/38), [#44](https://github.com/github/template-parts/issues/44)).
- More complete spec [API surface](./src/api.js).
- `<table><!--{{ data }}--></table>` support<sup><a href="#tables">*</a></sup> ([#24](https://github.com/domenic/template-parts/issues/2)).
- Expression processor with reactivity.
<!-- - [`<svg width={{ width }}>`](https://github.com/github/template-parts/issues/26) and other cases fixed. -->

## Usage

Drop `templize.js` into project folder and:

```html
<div id="foo" class="foo {{y}}">{{x}} world</div>

<script type="module">
import templize from './templize.js'

const params = templize(document.getElementById('foo'), { x: 'Hello', y: 'bar'})
// <div id="foo" class="foo bar">Hello world</div>

params.x = 'Goodbye'
// <div id="foo" class="foo bar">Goodbye world</div>
</script>
```

_Templize_ also can be used as _Template Instance_ from the [spec](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md#32-template-parts-and-custom-template-process-callback):

```js
import { TemplateInstance, NodeTemplatePart, AttributeTemplatePart, processor } from './templize.js'

let tpl = new TemplateInstance(templateElement, initParams, processor)
tpl.update(newParams)
```

Note also that _Template Instance_ doesn't include expression processor, you'd have to connect that manually.

<details><summary>Spec surface</summary>

```js
interface TemplateInstance : DocumentFragment {
    void update(any state);
};

callback TemplateProcessCallback = void (TemplateInstance, sequence<TemplatePart>, any state);

dictionary TemplateProcessor {
    TemplateProcessCallback processCallback;
    TemplateProcessCallback? createCallback;
};

interface TemplatePart {
    readonly attribute DOMString expression;
    attribute DOMString? value;
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

### Tables

Due to HTML quirk in table parsing, table fields should be wrapped as comment:

```html
<table>
  <!--{{ thead }}-->
  <tbody>
    <!--{{ rows }}-->
  </tbody>
</table>
```

## Expressions

Templize enables expressions via default **expression processor** based on [subscript](https://github.com/spectjs/subscript):

```html
<header id="title">
  <h1>{{ user.name }}</h1>
  Email: <a href="mailto:{{ user.email }}">{{ user.email }}</a>
</header>

<script>
  import templize from './templize.js'
  const titleParams = templize(
    document.querySelector('#title'),
    { user: { name: 'Hare Krishna', email: 'krishn@hari.om' }}
  )
  titleParams.user.name = 'Hare Rama'
</script>
```

It supports the following fields with common syntax:

Part | Expression
---|---
Value | `{{ foo }}`
Property | `{{ foo.bar?.baz }}`, `{{ foo["bar"] }}`
Call | `{{ foo.bar(baz, qux) }}`
Boolean | `{{ !foo && bar \|\| baz }}`
Ternary | `{{ foo ? bar : baz }}`
Primitives | `{{ "foo" }}`, `{{ true }}`, `{{ 0.1 }}`
Comparison | `{{ foo == 1 }}`, `{{ bar >= 2 }}`
Math | `{{ a * 2 + b / 3 }}`
Pipe | `{{ bar \| foo }}` → `{{ foo(bar) }}`
<!-- Loop | `{{ item, idx in list }}` | `params.d` | Used for `:for` directive only -->
<!-- Spread | `{{ ...foo }}` | `params.foo` | Used to pass multiple attributes or nodes -->

### Reactivity

Initial state can define async/reactive values: _Promise_/_Thenable_, _AsyncIterable_, _Observable_/_Subject_ (see [sube](https://github.com/spectjs/sube)).<br/>

Update happens when any param changes:

```html
<div id="done">{{ done || '...' }}</div>

<script type="module">
  import templize from './templize.js'

  const done = new Promise(ok => setTimeout(() => ok('Done!'), 1000))

  const params = templize(document.querySelector('#done'), { done })

  // <div id="done">...</div>

  // ... 1s after
  // <div id="done">done</div>

  // dispose observers
  params[Symbol.dispose]()
</script>
```

This way, for example, _rxjs_ can be streamed directly to element attribute or content.


### Interop

_Templize_ supports any [standard](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md#32-template-parts-and-custom-template-process-callback) template parts processor:

```js
const params = templize(element, initState, {
  createCallback(el, parts, state) {
    // ... init parts / parse expressions
  },
  processCallback(el, parts, state) {
    // ... update parts / evaluate expressions
  }
})
```
<!--
Default processor supports only direct values.

```js
{
  processCallback(instance, parts, state) {
    if (!state) return
    for (const part of parts) if (part.expression in state) part.value = state[part.expression]
  }
}
```
-->

Any external processor can be used with templize, eg. [@github/template-parts](https://github.com/github/template-parts):

```js
import templize from 'templize'
import { propertyIdentityOrBooleanAttribute } from '@github/template-parts'

const params = templize(
  document.getElementById('foo'),
  { x: 'Hello', hidden: false },
  propertyIdentityOrBooleanAttribute
)
params.hidden = true
```

Templize expression processor can also be used with other template parts libraries as:

```js
import { TemplateInstance } from '@github/template-parts'
import { processor } from 'templize'

const instance = new TemplateInstance(document.querySelector('my-template'), {}, processor)
```

## See also

* [spect](https://github.com/spectjs/spect) − selector observer, useful for templizing any elements in DOM.
* [subscript](https://github.com/spectjs/subscript) − composable template processor language.
* [vref](https://github.com/spectjs/vref) − value reference with reactivity.
* [subscribable-things](https://github.com/chrisguttandin/subscribable-things) − reactive wrappers for various APIs.
* [element-props](https://github.com/spectjs/element-props) − normalized access to element attributes / properties.
<!-- * [define-element](https://github.com/spectjs/define-element) − declarative custom elements. -->

## Neighbors

* [@github/template-parts](https://github.com/github/template-parts) − viable Template Parts implementation, doesn't closely follow spec in secondary details, but provides reliable ground.
* [template-instantiation-polyfill](https://github.com/bennypowers/template-instantiation-polyfill#readme) − closely follows the Template Instantiation spec algorithm, but [is not recommended](https://github.com/bennypowers/template-instantiation-polyfill/pull/2#issuecomment-1004110993) by author.
* [PolymerLabs/template-instantiation](https://github.com/PolymerLabs/template-instantiation) − implementation from Google with TemplateAssembly, TemplateRule and other extensions.
* [stampino](https://www.npmjs.com/package/stampino) − small HTML template system based on lit-html.

<p align="center">🕉<p>
