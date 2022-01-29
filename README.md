# templize <a href="https://github.com/spectjs/templize/actions/workflows/node.js.yml"><img src="https://github.com/spectjs/templize/actions/workflows/node.js.yml/badge.svg"/></a> <a href="http://npmjs.org/templize"><img src="https://img.shields.io/npm/v/templize"/></a>

> Template parts for any elements

[Template Instantiation](https://github.com/w3c/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md) is limited to _\<template\>_ only;
[DOM Parts](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/DOM-Parts.md) lack hi-level convention and too early days.<br/>
_Templize_ provides generic template parts for any elements, same time covering minimal spec surface.
If either proposal lands, API will be assimilated.

## Features

Essentially extension of [@github/template-parts](https://github.com/github/template-parts) with the following:

- Works with any elements.
- InnerTemplateParts support.
- Improved parser ([#38](https://github.com/github/template-parts/issues/38), [#44](https://github.com/github/template-parts/issues/44)).
- More complete spec API surface.
- `<table><!--{{ data }}--></table>` support<sup><a href="#tables">*</a></sup> ([#24](https://github.com/domenic/template-parts/issues/2)).
- Expression processor.
- Reactive props support.
- Loops, conditions directives.
- Directives API.
- Vanilla ESM, no tooling.
<!-- - [`<svg width={{ width }}>`](https://github.com/github/template-parts/issues/26) and other cases fixed. -->

## Usage

```html
<div id="foo" class="foo {{y}}">{{x}} world</div>
<script type="importmap">{ "imports": { "templize": "parth/to/templize.js" }}</script>

<script type="module">
import templize from 'templize'

const [params, update] = templize(document.getElementById('foo'), { x: 'Hello', y: 'bar'})
// <div id="foo" class="foo bar">Hello world</div>

params.x = 'Goodbye' // === update({x: 'Goodbye'})
// <div id="foo" class="foo bar">Goodbye world</div>
</script>
```

`params` is proxy reflecting current state; changing any of its props updates parts.<br/>
`update` can be used for bulk-updating multiple props.

_Templize_ also can be used as _Template Instance_ from the [spec](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md#32-template-parts-and-custom-template-process-callback):

```js
import { TemplateInstance, NodeTemplatePart, AttributeTemplatePart, processor } from 'templize'

let tpl = new TemplateInstance(templateElement, initParams, processor)
tpl.update(newParams)

// NOTE: Template Instance doesn't include expression processor by default.
```


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

interface InnerTemplatePart : NodeTemplatePart {
    HTMLTemplateElement template;
    attribute DOMString directive;
};
```
</details>

## Expressions

Templize enables expressions via default **expression processor**:

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

### Attributes

Processor makes assumptions regarding how attribute parts set values.

* `hidden="{{ hidden }}"` boolean values set or remove attribute.
* `onClick="{{ handler }}"` assigns `onclick` handler function (no need to call it).
* `class="{{ cls }}"` can take either an array or a string.
* `style="{{ style }}"` can take either an object or a string.

Other attributes are handled as strings.

### Reactivity

Initial state can define async/reactive values: _Promise_/_Thenable_, _AsyncIterable_, _Observable_/_Subject_.<br/>

Update happens when any param changes:

```html
<div id="done">{{ done || '...' }}</div>

<script type="module">
  import templize from './templize.js'

  const done = new Promise(ok => setTimeout(() => ok('Done!'), 1000))

  templize(document.querySelector('#done'), { done })

  // <div id="done">...</div>

  // ... 1s after
  // <div id="done">done</div>
</script>
```

This way, for example, _rxjs_ can be streamed directly to element attribute or content.

Note: observers don't require disposal, since they're connected in weak fashion.

### Tables

Due to HTML quirk in table parsing, table fields should be wrapped into comment:

```html
<table>
  <!--{{ thead }}-->
  <tbody>
    <!--{{ rows }}-->
  </tbody>
</table>
```

## Directives

_Templize_ recognizes inner templates as [_InnerTemplatePart_](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md#33-conditionals-and-loops-using-nested-templates), expecting `directive` and `expression` attributes.
It also enables shortcut directives via `:attr`.

### Loops

Iterating over set of items can be done with `each` directive:

```html
<ul>
  <template directive="each" expression="item in items">
    <li id="item-{{item.id}}" data-value={{item.value}}>{{item.label}}</li>
  </template>
</ul>

<!-- shortcut -->
<ul>
  <li :each="{{ item in items }}" id="item-{{item.id}}" data-value="{{item.value}}">{{item.label}}</li>
</ul>
```

#### Cases

```html
<li :each="{{ item, index in array }}">
<li :each="{{ key, value, index in object }}">
<li :each="{{ value in object }}">
```

### Conditions

To optionally display an element, there are `if`, `else-if`, `else` directives.

```html
<template directive="if" expression="status == 0"><span>Inactive</span></template>
<template directive="else-if" expression="status == 1"><span>Active</span></template>
<template directive="else"><span>Finished</span></template>

<!-- shortcut -->
<span :if="{{ status == 0 }}">Inactive</span>
<span :else-if="{{ status == 1 }}">Active</span>
<span :else>Finished</span>
```

Note: text conditions can be organized via ternary operator:

```html
<span>Status: {{ status === 0 ? 'Active' : 'Inactive' }}</span>
```

### Adding directives

To register a directive, `directive(name, onCreate)` function can be used:

```js
import templize, { directive } from 'templize'

directive('inline', (instance, innerTplPart, state) =>
  innerTplPart.replaceWith(templize(innerTplPart.template.content.cloneNode(true), state))
)
```

## Interop

_Templize_ supports any [standard](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/Template-Instantiation.md#32-template-parts-and-custom-template-process-callback) template parts processor:

```js
const params = templize(element, initState, {
  createCallback(element, parts, state) {
    // ... init parts / parse expressions
  },
  processCallback(element, parts, state) {
    // ... update parts / evaluate expressions
  }
})
```

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

_Templize_ expression processor can also be used with other template instancing libraries as:

```js
import { TemplateInstance } from '@github/template-parts'
import { processor } from 'templize'

const instance = new TemplateInstance(document.querySelector('my-template'), {}, processor)
```

## Buddies

* [spect](https://github.com/spectjs/spect) − selector observer, perfect match for organizing flexible native DOM templates.
* [value-ref](https://github.com/spectjs/value-ref) − reactive value container with reactivity, useful for state management.
* [subscribable-things](https://github.com/chrisguttandin/subscribable-things) − reactive wrappers for various APIs.
<!-- * [element-props](https://github.com/spectjs/element-props) − normalized access to element attributes / properties. -->
<!-- * [define-element](https://github.com/spectjs/define-element) − declarative custom elements. -->

## Neighbors

* [@github/template-parts](https://github.com/github/template-parts) − viable Template Parts implementation, doesn't closely follow spec in secondary details, but provides reliable ground.
* [template-instantiation-polyfill](https://github.com/bennypowers/template-instantiation-polyfill#readme) − closely follows the Template Instantiation spec algorithm, but [is not recommended](https://github.com/bennypowers/template-instantiation-polyfill/pull/2#issuecomment-1004110993) by author.
* [PolymerLabs/template-instantiation](https://github.com/PolymerLabs/template-instantiation) − implementation from Google with TemplateAssembly, TemplateRule and other extensions.
* [stampino](https://www.npmjs.com/package/stampino) − small HTML template system based on lit-html.

## Dependencies

* [subscript](https://github.com/specths/subscript) − fast and tiny expressions parser.
* [swapdom](https://github.com/specths/swapdom) − fast and tiny dom swapping algo.
* [sube](https://github.com/specths/sube) − subscribe to any reactive source.
* [element-props](https://github.com/specths/element-props) − normalized element properties setter.

<p align="center">🕉<p>
