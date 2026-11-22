import test from 'node:test';
import assert from 'node:assert/strict';

test('composer continues, isolates tools, preserves failed input, and resets context', async () => {
  class Element {
    children = []; listeners = {}; value = ''; hidden = true;
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    remove() {}
    setAttribute() {}
    focus() {}
    addEventListener(name, handler) { this.listeners[name] = handler; }
    querySelectorAll() { return this.children; }
  }
  const previous = Object.fromEntries(['document', 'location', 'localStorage', 'fetch'].map((key) => [key, globalThis[key]]));
  const nodes = new Map();
  const node = (id) => {
    if (!nodes.has(id)) nodes.set(id, new Element());
    return nodes.get(id);
  };
  globalThis.document = { querySelector: node, createElement: () => {
    const element = new Element(); element.dataset = {}; return element;
  } };
  globalThis.location = { pathname: '/teacher' };
  globalThis.localStorage = { getItem: () => '[]' };
  const requests = [];
  let fail = false;
  globalThis.fetch = async (_, options) => {
    requests.push(JSON.parse(options.body));
    return Response.json(fail ? { error: { message: 'Try again' } } : { answer: 'A lesson about evaporation.' }, { status: fail ? 503 : 200 });
  };
  try {
    await import('../public/app.js');
    const choose = (mode) => node('#tool-menu').children.find((button) => button.dataset.mode === mode).listeners.click();
    const send = async (text) => {
      node('#question').value = text;
      await node('#ask-form').listeners.submit({ preventDefault() {} });
    };
    choose('lesson');
    await send('Water cycle lesson');
    assert.equal(node('#ask').textContent, 'Send follow-up');
    assert.equal(node('#question').value, '');
    await send('Make it shorter');
    assert.equal(requests.at(-1).history[0].content, 'Water cycle lesson');
    assert.equal(requests.at(-1).history[1].content, 'A lesson about evaporation.');
    fail = true;
    await send('Add a diagram');
    assert.equal(node('#question').value, 'Add a diagram');
    assert.equal(node('#chat').children.filter((message) => message.className === 'message assistant').length, 2);
    fail = false;
    choose('feedback');
    await send('Review my paragraph');
    assert.deepEqual(requests.at(-1).history, []);
    choose('saved');
    assert.equal(node('#saved').hidden, false);
    assert.equal(node('.workspace').hidden, true);
    assert.equal(node('#page-title').textContent, 'Saved work');
    choose('lesson');
    assert.equal(node('#saved').hidden, true);
    assert.equal(node('.workspace').hidden, false);
    assert.equal(node('#page-title').textContent, 'Making lesson plans');
    assert.equal(node('#chat').children.length, 4);
    choose('lesson');
    await send('Add an activity');
    assert.equal(requests.at(-1).history.length, 4);
    node('#new-conversation').listeners.click();
    assert.equal(node('#chat').children.length, 0);
    await send('A new topic');
    assert.deepEqual(requests.at(-1).history, []);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
