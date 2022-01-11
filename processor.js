let e,r,t,a,o,l,d,n=(a,o=(r=a,e=0,t=[],!(a=i())||r[e]?h():e=>a(e||{})))=>(o.args=t,o),f=e=>e>=48&&e<=57||e>=65&&e<=90||e>=97&&e<=122||36==e||95==e||e>=192&&215!=e&&247!=e,h=(t="Bad syntax",a=r[e])=>{throw SyntaxError(t+" `"+a+"` at "+e)},s=(t=1,a=e,o)=>{if("number"==typeof t)e+=t;else for(;t(r.charCodeAt(e));)e++;return r.slice(a,e)},i=(r=0,t,a,o,l,d)=>{for(;(a=c())&&(l=(d=u[a])&&d(o,r)||!o&&p());)o=l;return t&&(a==t?e++:h()),o},c=t=>{for(;(t=r.charCodeAt(e))<=32;)e++;return t},p=(e=s(f),r)=>e?(r=r=>r[e],t.push(e),r.id=()=>e,r):0,u=[],g=n.set=(t,a,o=32,l=t.charCodeAt(0),d=t.length,n=u[l],h=o.length||([o,a]=[a,o],0),s=t.toUpperCase()!==t,c=(h>1?(e,r)=>e&&(r=i(a))&&(e.length||r.length?t=>o(e(t),r(t),e.id?.(t),r.id?.(t)):(e=o(e(),r()),()=>e)):h?e=>!e&&(e=i(a-1))&&(r=>o(e(r))):o))=>u[l]=(o,l,h=e)=>l<a&&(d<2||r.substr(e,d)==t)&&(!s||!f(r.charCodeAt(e+d)))&&(e+=d,c(o,l))||(e=h,n&&n(o,l)),C=e=>e>=48&&e<=57,A=t=>(t&&h("Unexpected number"),t=s((e=>46==e||C(e))),(69==r.charCodeAt(e)||101==r.charCodeAt(e))&&(t+=s(2)+s(C)),(t=+t)!=t?h("Bad number"):()=>t),x=(e,r)=>t=>r(e.of?e.of(t):t,e.id(t));for(o=48;o<=57;)u[o++]=A;for(a=['"',e=>(e=e?h("Unexpected string"):s((e=>e-34)),s()||h("Bad string"),()=>e),,".",(e,r)=>(c(),r=s(f)||h(),d=t=>e(t)[r],d.id=()=>r,d.of=e,d),18,".",e=>!e&&A(s(-1)),,"[",(e,r,t)=>e&&(r=i(0,93)||h(),(t=t=>e(t)[r(t)]).id=r,t.of=e,t),18,"(",(e,r,t)=>(r=i(0,41),e?t=>e(t).apply(e.of?.(t),r?r.all?r.all(t):[r(t)]:[]):r||h()),18,",",(e,r,t=i(1))=>(t.all=e.all?r=>[...e.all(r),t(r)]:r=>[e(r),t(r)],t),1,"|",6,(e,r)=>e|r,"||",4,(e,r)=>e||r,"&",8,(e,r)=>e&r,"&&",5,(e,r)=>e&&r,"^",7,(e,r)=>e^r,"==",9,(e,r)=>e==r,"!=",9,(e,r)=>e!=r,">",10,(e,r)=>e>r,">=",10,(e,r)=>e>=r,">>",11,(e,r)=>e>>r,">>>",11,(e,r)=>e>>>r,"<",10,(e,r)=>e<r,"<=",10,(e,r)=>e<=r,"<<",11,(e,r)=>e<<r,"+",12,(e,r)=>e+r,"+",15,e=>+e,"++",e=>x(e||i(14),e?(e,r)=>e[r]++:(e,r)=>++e[r]),15,"-",12,(e,r)=>e-r,"-",15,e=>-e,"--",e=>x(e||i(14),e?(e,r)=>e[r]--:(e,r)=>--e[r]),15,"!",15,e=>!e,"*",13,(e,r)=>e*r,"/",13,(e,r)=>e/r,"%",13,(e,r)=>e%r];[o,l,d,...a]=a,o;)g(o,l,d);

if (!Symbol.observable) Symbol.observable=Symbol('observable');

// observable utils
// FIXME: make an external dependency, shareable with spect/tmpl-parts
const sube = (target, next, stop) => (
  next.next = next,
  target && (
    target.subscribe?.( next ) ||
    target[Symbol.observable]?.().subscribe?.( next ) ||
    target.set && target.call?.(stop, next) || // observ
    (
      target.then?.(v => !stop && next(v)) ||
      (async _ => { for await (target of target) { if (stop) return; next(target); } })()
    ) && (_ => stop=1)
  )
),

observable = (arg) => arg && !!(
  arg[Symbol.observable] || arg[Symbol.asyncIterator] ||
  (arg.call && arg.set) ||
  arg.subscribe || arg.then
  // || arg.mutation && arg._state != null
);

// extend default subscript
// ?:
n.set(':', 3.1, (a,b) => [a,b]);
n.set('?', 3, (a,b) => a ? b[0] : b[1]);

// literals
n.set('true', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>true });
n.set('false', a => { if (a) throw new SyntaxError('Unexpected'); return ()=>false });

// a?.b - optional chain operator
n.set('?.',18, (a,b,aid,bid) => a?.[bid]);

// a | b - pipe overload
n.set('|', 6, (a,b) => b(a));

// expressions processor
const _state = Symbol(), _init = Symbol();
var processor = {
  createCallback(el, parts, state) {
    el[_state] = state;

    for (const part of parts) (part.evaluate = n(part.expression));

    // we have to convert reactive state values into real ones
    let unsub = [], source;

    for (const k in state) if (observable(source = state[k])) {
      state[k] = '',
      unsub.push(sube(source, v => (
          this.processCallback(el, parts, {[k]: v})
        )
      ));
    }

    el[_init] = true;
  },

  processCallback(el, parts, state) {
    // reactive parts can update only fraction of state
    // we also allow modifying state during the init stage, but apply parts only after init
    Object.assign(el[_state], state);
    if (!el[_init]) return
    for (const part of parts) part.value = part.evaluate(el[_state]);
  }
};

export { processor as default };
