# plan

* [ ] Separate template-parts?
  + it's independent already
  + it makes API/docs more lightweight
  + makes polyfill useful and independent on its own
  + it moves problem of instantiating subtemplates outside of package scope

* [ ] don't expose event handler as attribute

* [ ] How to provide `createCallback` not superceding default processor?
  → Just manually import/call processor callback?

* [ ] disposing element should unsubscribe reactives as well

* [ ] interpolated strings \`a ${b} c\`

* [ ] `:each` need optimization to avoid recreating content every process call
  → complicated for now due to TemplateInstance isn't tracking all refs to children

* [x] Move shortcut directives to processor?

* [x] observables as props, not direct args `{{ prop.done }}`
  . not only direct props, but enables also as `{{ item.done ? 'complete' : '' }}`
  . How can that possibly be done?
  1. detect prop chains `a.b.c` via subscript as args, subscribe to all internal props
    - lacking dynamics: if prop is undefined, then defined - it's not subscribed
    - problem with `a?.b` etc.
    + doesn't overdynamize: `{{ a[b] }}` can refer to any value, which is if subscribed going to be pain
  2. disable dot-prop operator and detect it as long identifier
    - to pass environment we'd have to flatten objects - ugh
    - or else - we'd have to by access to identifiers do dotprop parsing
  3. provide proxy as state: subscribes if value returned prop
    ~ should make sure no millions of proxies created, like in case of iterator. It must be one proxy.
    - `a.b.c` → `a.b` should return detector proxy = spawning dynamic proxies, too heavy.
  4. iterating by all object props and subscribing to all observables
    + least evil from all: doesn't itroduce fragile args detection;
    + doesn't introduce heavy proxy detection;

* [x] :for, :if need to be added to processor
  + useful not only in define-element, but generally, eg. spect
  + somewhat familiar pattern from vue
  - still a bit too opinionaty
    → opinionation is atoned by minimalism
  ? vs `<template type="repeat" repeat="{{ items }}">{{ item }}</template>`
    - non-generic: is bound to template tag
    - no way to redefine `item` variable
      - which also blocks double loops
    - just verbose
    + doesn't create fake-item representation
      → can be mitigated via [:for], [:if], [:else-if], [:else] { display:none } css.
    + conventional, more standard, intersecting with other libs API
    + defaulting to `item` reduces needless decisions for user and enforces  good practice
  - some confusion is going on with `:for="item in items"` (vue) vs `:for="{{ item in items }}"`. One of them is meaningless.
    . `:for="{{ items }}"` makes more sense than `:for="items"`
    . `:for="{{ a in b }}"` is
      + valid syntax
      - has different meaning than `a in b`, making attribute a part of syntax, as if `:for="{{ true }}"`
    → we need expression brackets for shortcut: otherwise
  → would be nice to split processors into: expressions, reactivity, conditions, loops, props
  → `:repeat="{{ items }}"` is a shortcut for `<template type="repeat" repeat="{{ items }}"></template>`
    → `:foreach="{{ items }}"` `<template directive="foreach" expression="items"></template>`
  * [x] `:for` is confusable with `for` attribute used for different purpose. Alternatives:
    * [x] :each
      + `<li :each="{{item in items}}"/>` + lovely, natural language
    * :foreach
      - `<li :foreach="{{ item in items }}"/>` - nah, li is not command
    * :loop, :repeat
      . `<li :loop="{{ item in items }}"` - li is not loop
      . `<li :repeat="{{ item in items }}"/>` - it does not repeat, it maps
    * :of, :in
      - used in expression `<li :in="{{ item in todos }}">` - wut?
    * :from
    * item:in="{{ items }}", item:of="{{ items }}"
      + makes sense for attrTypes
      - discrepancy with :if, :else-if, :else
      - messy

* [x] Expose directive registering

* [x] Make API depend on templize instead of reproducing same flow

* [x] ~~? Decouple API from templize. templize includes directives set up, which is incompatible with polyfill...~~
  ? maybe not - now it sets up directives

* [x] weakrefify subscriptions

* [x] find out a good way to bulk-update templize, instead of throttling props.
  1. Maybe return `update` instead of `params`?
    + we don't need params as much, since we had them in init, do we?
    + spec-compatible
    - `params.user.name` is nice to be able to update. `update({user: {...user, name}})` isn't nice.
    - `update` is confusing along with mutable params - how's that different? params also do update, aren't they?
      . that's needed for secret-ish sync bulk-update.
  2. Return `[params, update]`
    + hooks-familiar notation
    - params is also hooked - a bit weird
  3. Do both - `[params, update]` or just `update`?
    + any desired syntax
  4. It's even better to `{state, update}` and `[state, update]`.
    - too much indecisiveness
  5. Make `params` or `[params, update]` the same?
    + react-compat
    + backwards-compat
    - not spec-compat but fine
    - a bit hard to implement: do we extend params?
      → we provide iterator: with extending array that's a mess
      + iterator acts as update symbol as well.

* [x] add '' strings
  + it's easier to type
  + they don't conflict with HTML attrib strings

* [x] ~~processor: throttle updates~~
  + makes useful both for TemplateInstance and templize
  - bad for interop: may be unexpected to call update and not get result immediately
  - can be organized by user: templizer anyways throttles

* [x] externalize & share deps
  * [x] sube
  * [x] diff

* [x] ~~make templize-core.js entry - without processor included?~~
  + default processor with reactivity and expressions is super handy to have. Manual setup is tedious.
* [x] ? or make simply templize with expr/reactivity immediately?
  + that simplifies doc even more
  + that simplifies use even more
  → TemplateInstance doesn't include expressions, templize does

* [x] [Symbol.dispose] for disposing reactive observers.
  * [x] Can disposal be made via WeakRef?
    - depends on implementation of observable.

* [x] get rid of table ad-hoc?
  + `<!--{{data}}-->` solves any generic case without perf/size tax...

* [x] tests
  * [x] Parts test
  * [x] updated github-parts tests
  * [x] expression-processor

* [x] Join reactivity, combo into single processor?
  + less cognitive load to understand
  + shorter readme
  + combo of reactivity with generic other processor is hard if possible

* [x] ~~detect missing arguments in params for expr processor, like {{a}}, {b:1}~~
  → maybe not: subscript is unable to reliably detect all ids, eg. a?.b it detects `b` as param, whereas it's not.
  → overall not much benefit.

* [x] should we disallow safe-path prop getter and instead enforce ?. notation?
  + js-familiar
  + 1 cost for easy errors detection benefit
  + reduced divergence with default subscript features
  + allows extending subscript _for real_
  - diverges from unopinionated expression style towards javascript
    ~ many languages support it https://en.wikipedia.org/wiki/Safe_navigation_operator

* [x] ~~make pipe a `|>` operator?~~
  + full js intuition
  + allows original meaning of |
  - nope: proposal is not stabilized
  - there's high risk of missing keyword
  - `|` is valid safe common syntactical operator, we only override it
  - `|` has better sense of R pipes for templates, unlike Hacky `|>`

* [x] make subscript packed dep

* [x] ci

* [x] tables
  * [ ] detect by insertion

* [x] default processor:
  1. default processor = expression + reactivity
    + easy to get started not to think much
    - overhead if use-case doesn't need expressions or reactivity
    - not guaranteed if tree shakable
  2. default processor = mininmal direct values
    + expressions, reactivity are treeshakeable
    - extra code / knowledge to connect
    + [x] allows separating into entry
      → full bundle is problematic without tooling
      → also see https://github.com/github/template-parts/issues/39

* [x] bundle & minify

* [x] expression processor

* [x] composable processors
  . reactiveProcessor can handle observables
  . expressionProcessor can handle expressions
  . booleanProcessor can handle bool attribs
  → combine method

* [x] name: templize
  ? what would be the name, sustainable for at least 10-15 years?
  ? what would be the name if no npm limitations?
  ? what would be the name radical, meaningful, short... reflecting spirit: tiny, fast, right?
  ? matches spectjs style: common sense abbreviation, not too fancy
  ? what would be the right name
  * template-parts.js
    + reflects generic name
    + not directly points to the standard
    + bold
      - requires highest quality standard, can't base on github solution
      - too loud
    - confusable with github
      → can provide reference
        - still, confusable
    - confusion in readme with generic template parts
    - ~~no personality~~ → not needed - it's humble templating solution
    - ~~no much point over github~~ → point is generic element template parts
    - boring
      + it should not be too fun, it's service
        - not just boring, closish boredom association
    - ~~requires polyfill~~ → nope - it's not template instance
    + plays well as `import Parts from 'template-parts'`
    - can get obsolete if proposal gets renamed
      → unlikely - would require renaming all deps; it's rather stalling
    + someone else will implement subpar quality
    - can be thought as ponyfill, but that's not the main point
  * tmpl-parts.js
    + minimalistic scent
    + temple is one of the meanings
    - a bit too short.
      ~ valid abbreviation though.
    + no confusion with github or in readme
    + matches shortening of other projects
    + not nosey, doesn't stand out much
    - still confusing: apparently tmpl-parts is short from template-parts, but the API is different from github/template-parts and from standard: why?
  * tpl-parts.js?
    + shorter
    + same valid
  * templ-parts.js?
  * element-parts
    + same as template-parts, generalized
    - a bit too far from templating, not obvious what parts, like, constituents or what?
      + what? exactly what you'd imagine: parts of element looking at template, marked with `{{ a }}`
        - nah, still needs template mention
    + element is better name
  * element-template.js?
    + mention of template, mention of element
    + no mention of `parts`, which is confusable with element.part from shadow-dom
    - too generic?
    - confusable with template element?
  * element-templatize.js? element-templated.js?
  * element-template-parts.js?
  * templatize-element.js? templatize.js?
    - harsh z in name
    - templatize is taken
  * templatized.js? templatizer.js? templated-element.js?
  * tplize? tmplize? tpliz?
  * tplr?
  * templize?
    + temple
    + templatize
    + template
    + free
    + spirit of spect naming
  * templatize-element.js, templ-elem.js
  * tempeh.js
    + funny
    + easy to remember
    + vegan
    - too fancy
    - doesn't reflect meaning
    + dom-parts/template-instance isn't stabilized
    + can apply to any node, not just template; or allows `<template immediate>`
    - not serious, having fun more than serving
  * templ-in.js? templin.js? in-templ.js?
    + temple-in, like in temple, or "join temple"
    + template-in, like ... why not just that?
    + short name
    + reflects main point: just template instance with update, nothing else
    + city name
    - templin.js doesn't seem sustainable for long play
      ~ templ-in.js underlines point a bit better
      + templ-in-js is a nice side-meaning
    - a bit artificial, overthinking-like, too "compromisy"
    - templ is too abrupt of template. Either `tpl`, `tmpl`
  * template-in.js?
    + phrasal verb, "enable template", like tune-in
    + template-instantiate
    + complete valid english phrase
    + reads like "template in js"
    + matches spectjs style naming (element-props, define-element, spect)
    - loses meaning of temple
    - a bit misleading from template instantiation.
  * tmpl-in.js? tmpl-ins.js? tmpl-inst.js? tmplin? tpl-in.js? tpl-ins.js? tplins.js? tpl-ins.js?
    + abbreviated but complete meaning
    + better than tpl-in.js
    + can be validly read as temple-in-js
    + tmpl is valid abbreviation
    + minimally possible name
    - hard to guess, doesn't look reliable
    - sounds like "ta plin"
    + seems to be what God would like, good balance
  * temp-in.js, tempin.js?
    . temp-in.js
    - no much reference to template
    - no much reference to temple
    - reference to tempo, temperature
  * temin.js
    + min meaning
    - temin has no point
  * templx.js ?
    - no reference to instantiation
  * templins.js, templ-ins.js?
    + plural adds repeating action association
    + same + as templ-in
    + more apparent template instantiation meaning
    - templins.js - very misleading.
      ~ templ-ins.js is not as much
  * templ.in.js ?
    + good meaning
    - extra suffix sucks
  * templatr.js, latr
    - taken
  * templar.js
    + templar knights
  * templier, templer
    + religious believer
  * templi.js
    + order of poor knights
    + templ-instantiatie
    - occupied
    ~ templi.js
  * tplx.js?
    + templates, template-ins
    - too short
  * inst.js?
  * templatin.js? templatinst.js?
  * tempstance.js? tempstantiate.js? tempstant.js?
  * templatiate.js? templance.js? templant.js?
  * tempst.js?
  * template-instance.js? template-instantiate.js?
  * tpl-instantiate.js? tpl-instance.js? tmpl-instance.js?
  * tins.js? tinst.js?
  * template-inst.js? tmpl-inst.js? templ-inst.js?
  * templ-parts.js? templ-instance.js?
    - not as much about template though.
    - parts are also not much relevant name https://github.com/WICG/webcomponents/issues/902
