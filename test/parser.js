import test, {is} from './lib/tst.js'
import { tokenize } from '../src/parse.js'

const STRING = 0, PART = 1

test('parse: extracts `{{}}` surrounding parts as part tokens', () => {
  is(Array.from(tokenize('{{x}}')), [[PART,'x']])
})

test('parse: tokenizes a template string successfully', () => {
  is(Array.from(tokenize('hello {{x}}')), [
    [STRING, 'hello '],
    [PART,'x']
  ])
})

test('parse: does not turn escaped `{{`s into expression tokens', () => {
  is(Array.from(tokenize('\\{{x}}')), [[STRING, '\\{{x}}']])
})

test('parse: does not terminate expressions with escaped `}}`s', () => {
  is(Array.from(tokenize('{{x\\}}}')), [[PART,'x\\}']])
  is(Array.from(tokenize('{{x\\}\\}}}')), [[PART,'x\\}\\}']])
})

test('parse: strips leading and trailing whitespace', () => {
  is(Array.from(tokenize('{{ x }}')), [[PART,'x']])
})

test('parse: tokenizes multiple values', () => {
  is(Array.from(tokenize('hello {{x}} and {{y}}')), [
    [STRING, 'hello '],
    [PART,'x'],
    [STRING, ' and '],
    [PART,'y']
  ])
})

test('parse: ignores single braces', () => {
  is(Array.from(tokenize('hello ${world?}')), [[STRING, 'hello ${world?}']])
})

test('parse: ignores mismatching parens, treating them as text', () => {
  is(Array.from(tokenize('hello {{')), [
    [STRING, 'hello {{'],
  ])
  is(Array.from(tokenize('hello }}')), [[STRING, 'hello }}']])
})

test('parse: ignores internal parens', () => {
  is(Array.from(tokenize('hello {{ "a {{ b }} c" }} world')), [
    [STRING, 'hello '],
    [PART,'"a {{ b }} c"'],
    [STRING, ' world'],
  ])
})

test('parse: parses sequence of inserts', () => {
  is(Array.from(tokenize('{{a}}{{b}}{{c}}')), [
    [PART,'a'],
    [PART,'b'],
    [PART,'c']
  ])
})
