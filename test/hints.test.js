import test from 'node:test';
import assert from 'node:assert/strict';
import { splitHint, renderHint, fractionBar } from '../public/hints.js';
import { saveAnswer, loadSaved, addEvent, loadEvents } from '../public/storage.js';

const reply = 'Hint\n1. Find matching denominators.\n2. Rewrite each fraction.\n\nExample\n1/2 = 2/4, so 1/2 + 1/4 = 3/4.\n\nVisual\n1/2 [■■□□]\n1/4 [■□□□]\nEach square is one fourth.\n\nYour turn\nWhat denominator could you use?';

test('recognizes hints with optional visuals and preserves diagram spacing', () => {
  assert.equal(splitHint('An introduction.\n\n' + reply)[0].text, 'An introduction.');
  assert.deepEqual(splitHint(reply).map((s) => s.title), ['Hint', 'Example', 'Visual', 'Your turn']);
  assert.match(splitHint(reply)[2].text, /1\/2 \[■■□□\]\n1\/4 \[■□□□\]/);
  assert.deepEqual(splitHint('Hint:\r\nTry this.\r\nExample:\r\nAnother problem.\r\nYour turn:\r\nTry a step?').map((s) => s.title), ['Hint', 'Example', 'Your turn']);
});

test('keeps legacy answers, refusals, and malformed replies readable', () => {
  for (const text of ['Start with 1/2 and 3/8.', 'Please share the problem.', 'I cannot help with bullying.',
    'Hint\nTry this.\nExample\n', 'Hint\nTry this.\nYour turn\nTry?\nExample\nOops.']) assert.equal(splitHint(text), null);
});

test('renders visual and saved replies as inert text without HTML execution', () => {
  const original = globalThis.document;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; }
    append(...children) { this.children.push(...children); }
    setAttribute(name, value) { this[name] = value; }
    replaceChildren() { this.children = []; }
    set innerHTML(value) { throw new Error('AI replies must never become HTML'); }
  }
  globalThis.document = { createElement: (tag) => new Element(tag) };
  try {
    const root = new Element('div');
    renderHint(root, reply.replace('Each square', '<img src=x onerror=alert(1)> Each square'));
    assert.equal(root.children.length, 4);
    const diagram = root.children[2].children[1].children[0];
    assert.equal(diagram.tag, 'pre');
    assert.match(diagram.textContent, /<img src=x onerror=alert\(1\)>/);
    renderHint(root, reply.replace('1/2 [■■□□]\n1/4 [■□□□]', 'BAR 2/3 | 8/12'));
    const pieces = root.children[2].children[1].children[0].children[1];
    assert.equal(pieces.children.length, 12);
    assert.equal(pieces.children.filter((piece) => piece.className.includes('shaded')).length, 8);
    assert.equal(pieces['aria-label'], '2/3: 8 of 12 equal parts shaded');
    renderHint(root, 'An older saved answer.');
    assert.equal(root.children.length, 1);
    assert.equal(root.children[0].textContent, 'An older saved answer.');
  } finally { globalThis.document = original; }
});

test('fraction visuals reject impossible or oversized counts', () => {
  for (const line of ['BAR half | 5/4', 'BAR half | 1/0', 'BAR half | 1/99', 'BAR half | -1/2', '<script>']) assert.equal(fractionBar(line), null);
  assert.deepEqual(fractionBar('BAR one half | 2/4'), { label: 'one half', numerator: 2, denominator: 4 });
});

test('saving a full hint preserves the visual and existing teacher work and calendar', () => {
  const original = globalThis.localStorage;
  const data = new Map();
  globalThis.localStorage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  try {
    const teacher = { id: 'teacher', workspace: 'teacher', label: 'Creating activities and tests', answer: 'Test', key: 'Answer key' };
    saveAnswer(teacher);
    addEvent({ id: 'reminder', title: 'Science quiz', date: '2026-11-23' });
    saveAnswer({ id: 'hint', workspace: 'student', label: 'Homework helper', answer: reply });
    assert.equal(loadSaved('student')[0].answer, reply);
    assert.deepEqual(loadSaved('teacher')[0], teacher);
    assert.equal(loadEvents()[0].title, 'Science quiz');
  } finally { globalThis.localStorage = original; }
});
