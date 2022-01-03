import './parser.js'
import './template-instance.js'
import './attribute.js'
import './processor.js'
import './table.js'



/*
test('readme: case 1', () => {
  // shadowRoot is the shadow root of a contact card component
  shadowRoot.appendChild(template.createInstance());
})

test('readme: case 2', () => {
  // Template content is `<section><h1>{{name}}</h1>Email: <a href="mailto:{{email}}">{{email}}</a></section>
  shadowRoot.appendChild(template.createInstance({name: "Ryosuke Niwa", email: "rniwa@webkit.org"}));
  // result:
  // <section><h1>Ryosuke Niwa</h1>Email: <a href="mailto:rniwa@webkit.org”>rniwa@webkit.org</a></section>
})

test('readme: case 3', () => {
  let content = template.createInstance({name: "Ryosuke Niwa", email: "rniwa@webkit.org"});
  shadowRoot.appendChild(content);

  content.update({name: "Ryosuke Niwa", email: "rniwa@apple.com"});
  // <section><h1>Ryosuke Niwa</h1>Email: <a href="mailto:rniwa@apple.com”>rniwa@apple.com</a></section>

  // Note that TemplateInstance keeps track of nodes via template parts defined in the next section so that even if they are removed from TemplateInstance per appendChild in the second line, they keep semantically functioning as a part of the template instance, making the subsequent update call possible.

  // Because multiple mustache syntaxes within a template work together to absorb various values of the state object, we don't support adding new mustache syntax or removing/adding updatable parts to an existing instance.
})

test('readme: case 4', () => {
  // <template id="foo"><div class="foo {{ f(y) }}">{{ x }} world</div></template>
})
*/
