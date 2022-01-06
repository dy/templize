import test, {is} from './lib/tst.js'
import parse from '../src/parse.js'


test('parse: extracts `{{}}` surrounding parts as part tokens', () => {
  is(Array.from(parse('{{x}}')), [{type: 'part', start: 0, end: 5, value: 'x'}])
})

test('parse: tokenizes a template string successfully', () => {
  is(Array.from(parse('hello {{x}}')), [
    {type: 'string', start: 0, end: 6, value: 'hello '},
    {type: 'part', start: 6, end: 11, value: 'x'}
  ])
})

test('parse: does not turn escaped `{{`s into expression tokens', () => {
  is(Array.from(parse('\\{{x}}')), [{type: 'string', start: 0, end: 6, value: '\\{{x}}'}])
})

test('parse: does not terminate expressions with escaped `}}`s', () => {
  is(Array.from(parse('{{x\\}}}')), [{type: 'part', start: 0, end: 7, value: 'x\\}'}])
  is(Array.from(parse('{{x\\}\\}}}')), [{type: 'part', start: 0, end: 9, value: 'x\\}\\}'}])
})

test('parse: strips leading and trailing whitespace', () => {
  is(Array.from(parse('{{ x }}')), [{type: 'part', start: 0, end: 7, value: 'x'}])
})

test('parse: tokenizes multiple values', () => {
  is(Array.from(parse('hello {{x}} and {{y}}')), [
    {type: 'string', start: 0, end: 6, value: 'hello '},
    {type: 'part', start: 6, end: 11, value: 'x'},
    {type: 'string', start: 11, end: 16, value: ' and '},
    {type: 'part', start: 16, end: 21, value: 'y'}
  ])
})

test('parse: ignores single braces', () => {
  is(Array.from(parse('hello ${world?}')), [{type: 'string', start: 0, end: 15, value: 'hello ${world?}'}])
})

test('parse: ignores mismatching parens, treating them as text', () => {
  is(Array.from(parse('hello {{')), [
    {type: 'string', start: 0, end: 8, value: 'hello {{'},
  ])
  is(Array.from(parse('hello }}')), [{type: 'string', start: 0, end: 8, value: 'hello }}'}])
})

test('parse: ignores internal parens', () => {
  is(Array.from(parse('hello {{ "a {{ b }} c" }} world')), [
    {type: 'string', start: 0, end: 6, value: 'hello '},
    {type: 'part', start: 6, end: 25, value: '"a {{ b }} c"'},
    {type: 'string', start: 25, end: 31, value: ' world'},
  ])
})
