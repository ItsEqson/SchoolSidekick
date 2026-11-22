import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPracticeTest } from '../practice-draft.js';

test('teacher practice key stays collapsed, survives save/reload, and stays out of student saved work', async () => {
  class Element {
    children = []; listeners = {}; value = ''; hidden = true; open = false;
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute(name, value) { this[name] = value; }
    focus() {}
    addEventListener(name, handler) { this.listeners[name] = handler; }
    querySelectorAll() { return this.children; }
  }
  const previous = Object.fromEntries(['document', 'location', 'localStorage', 'fetch'].map((key) => [key, globalThis[key]]));
  let nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, new Element());
    return nodes.get(id);
  };
  let stored = '[]';
  globalThis.document = { querySelector: node, createElement: (tag) => {
    const element = new Element(); element.tag = tag; element.dataset = {}; return element;
  } };
  globalThis.location = { pathname: '/teacher' };
  globalThis.localStorage = { getItem: () => stored, setItem: (_, value) => { stored = value; } };
  const requests = [];
  globalThis.fetch = async (_, options) => {
    requests.push(JSON.parse(options.body));
    return Response.json({ answer: formatPracticeTest({ title: 'Fraction practice', instructions: 'Show your work.',
      questions: [{ prompt: 'Write a fraction equivalent to 1/2.', answer: '2/4', explanation: 'Multiply both parts by 2.' }] }) });
  };
  const choose = (mode) => node('#tool-menu').children.find((button) => button.dataset.mode === mode).listeners.click();
  const send = async (text) => {
    node('#question').value = text;
    await node('#ask-form').listeners.submit({ preventDefault() {} });
  };
  const keyIn = (container) => container.children.find((child) => child.tag === 'details');
  try {
    await import('../public/app.js?teacher-practice');
    choose('practiceTest');
    node('#example').listeners.click();
    assert.match(node('#question').value, /Approved class notes/);
    await send(node('#question').value);
    assert.equal(requests[0].mode, 'practiceTest');
    const message = node('#chat').children[1];
    const key = keyIn(message);
    assert.equal(key.open, false);
    assert.match(key.children[1].textContent, /2\/4\nWhy:/);
    assert.doesNotMatch(message.children[1].children[0].textContent, /2\/4/);
    message.children.at(-1).listeners.click();
    assert.equal(JSON.parse(stored)[0].workspace, 'teacher');
    assert.match(JSON.parse(stored)[0].key, /Why:/);
    await send('Keep just one question.');
    assert.equal(requests[1].history.length, 2);
    choose('lesson');
    assert.equal(node('#chat').children.length, 0);
    choose('practiceTest');
    assert.equal(node('#chat').children.length, 4);
    // Reload the teacher app with only persisted browser storage.
    nodes = new Map();
    await import('../public/app.js?teacher-reloaded');
    choose('saved');
    const savedKey = keyIn(node('#saved-items').children[0]);
    assert.equal(savedKey.open, false);
    assert.match(savedKey.children[1].textContent, /2\/4/);
    nodes = new Map();
    globalThis.location.pathname = '/student';
    await import('../public/app.js?student-practice-isolation');
    assert.ok(!node('#tool-menu').children.some((button) => button.dataset.mode === 'practiceTest'));
    choose('saved');
    assert.equal(node('#saved-items').children.length, 0);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
