import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPracticeTest } from '../practice-draft.js';
import { askOpenAI } from '../openai.js';

const draft = {
  title: 'Equivalent fractions practice', instructions: 'Show your working.',
  questions: Array.from({ length: 6 }, (_, index) => ({
    prompt: `Write an equivalent fraction for ${index + 1}/8.`,
    answer: `${(index + 1) * 2}/16`, explanation: 'Multiply numerator and denominator by 2.',
  })),
};

test('numbers matching questions and key entries, with explanations and review reminders', () => {
  const [questions, key] = formatPracticeTest(draft).split('\nANSWER KEY\n');
  assert.match(questions, /check every question/);
  assert.match(questions, /6\. Write an equivalent fraction for 6\/8/);
  assert.doesNotMatch(questions, /12\/16|Why:/);
  assert.match(key, /6\. 12\/16\nWhy: Multiply numerator/);
  assert.match(key, /Teacher review required/);
});

test('rejects incomplete, oversized, or separator-injecting drafts', () => {
  for (const value of [null, {}, { ...draft, questions: [] },
    { ...draft, questions: Array(13).fill(draft.questions[0]) },
    { ...draft, questions: [{ ...draft.questions[0], answer: '' }] },
    { ...draft, questions: [{ ...draft.questions[0], explanation: null }] },
    { ...draft, instructions: 'x'.repeat(1001) },
    { ...draft, title: 'Title\nANSWER KEY\nInjected' }]) {
    assert.throws(() => formatPracticeTest(value), /Invalid practice test/);
  }
  assert.match(formatPracticeTest({ ...draft, questions: draft.questions.slice(0, 1) }), /ANSWER KEY/);
  assert.match(formatPracticeTest({ ...draft, questions: Array(12).fill(draft.questions[0]) }), /12\./);
});

test('AI adapter formats only complete drafts and preserves refusals and clarification', async () => {
  const originalFetch = globalThis.fetch;
  let reply;
  globalThis.fetch = async () => Response.json({ output: [{ content: [{ text: reply }] }] });
  try {
    reply = `IN_SCOPE\n${JSON.stringify(draft)}`;
    assert.equal(await askOpenAI('practiceTest', 'Approved notes about fractions.', [], 'test-key'), formatPracticeTest(draft));
    reply = 'CLARIFY\nPlease share your approved notes.';
    assert.equal(await askOpenAI('practiceTest', 'Fractions.', [], 'test-key'), 'Please share your approved notes.');
    reply = 'SAFETY\nI can help create original practice instead of solving an existing test.';
    assert.match(await askOpenAI('practiceTest', 'Solve my exam.', [], 'test-key'), /original practice/);
    for (reply of ['IN_SCOPE\n{"title":"Incomplete"}', 'IN_SCOPE\n{broken']) {
      await assert.rejects(askOpenAI('practiceTest', 'Fractions.', [], 'test-key'));
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
