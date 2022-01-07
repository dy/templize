import test, {is} from './lib/tst.js'
import parse from '../src/parse.js'

const STRING = 0, PART = 1

test('parse: extracts `{{}}` surrounding parts as part tokens', () => {
  is(Array.from(parse('{{x}}')), [[PART,'x']])
})

test('parse: tokenizes a template string successfully', () => {
  is(Array.from(parse('hello {{x}}')), [
    [STRING, 'hello '],
    [PART,'x']
  ])
})

test('parse: does not turn escaped `{{`s into expression tokens', () => {
  is(Array.from(parse('\\{{x}}')), [[STRING, '\\{{x}}']])
})

test('parse: does not terminate expressions with escaped `}}`s', () => {
  is(Array.from(parse('{{x\\}}}')), [[PART,'x\\}']])
  is(Array.from(parse('{{x\\}\\}}}')), [[PART,'x\\}\\}']])
})

test('parse: strips leading and trailing whitespace', () => {
  is(Array.from(parse('{{ x }}')), [[PART,'x']])
})

test('parse: tokenizes multiple values', () => {
  is(Array.from(parse('hello {{x}} and {{y}}')), [
    [STRING, 'hello '],
    [PART,'x'],
    [STRING, ' and '],
    [PART,'y']
  ])
})

test('parse: ignores single braces', () => {
  is(Array.from(parse('hello ${world?}')), [[STRING, 'hello ${world?}']])
})

test('parse: ignores mismatching parens, treating them as text', () => {
  is(Array.from(parse('hello {{')), [
    [STRING, 'hello {{'],
  ])
  is(Array.from(parse('hello }}')), [[STRING, 'hello }}']])
})

test('parse: ignores internal parens', () => {
  is(Array.from(parse('hello {{ "a {{ b }} c" }} world')), [
    [STRING, 'hello '],
    [PART,'"a {{ b }} c"'],
    [STRING, ' world'],
  ])
})
