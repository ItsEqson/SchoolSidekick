import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeQuiz, quizSummary, validateQuiz } from '../public/quiz-data.js';

const quiz = {
  title: 'Fractions quiz',
  questions: Array.from({ length: 5 }, (_, index) => ({
    prompt: `Question ${index + 1}`,
    options: ['A', 'B', 'C', 'D'],
    correctIndex: index % 4,
    explanation: `Because this is question ${index + 1}.`,
  })),
};

test('validates a five-question quiz and grades every answer', () => {
  const valid = validateQuiz(quiz);
  const grade = gradeQuiz(valid, [0, 1, 2, 3, 0]);

  assert.equal(valid.questions.length, 5);
  assert.equal(grade.score, 5);
  assert.ok(grade.results.every((result) => result.correct));
});

test('reports missed answers and makes a readable saved summary', () => {
  const grade = gradeQuiz(validateQuiz(quiz), [3, 1, 0, 3, 2]);

  assert.equal(grade.score, 2);
  assert.equal(grade.results[0].correct, false);
  assert.match(quizSummary(quiz, grade), /Score: 2 out of 5/);
  assert.match(quizSummary(quiz, grade), /Correct answer: A/);
});

test('rejects malformed quizzes instead of rendering unsafe or incomplete data', () => {
  assert.throws(() => validateQuiz({ ...quiz, questions: quiz.questions.slice(0, 4) }), /Invalid quiz/);
  assert.throws(() => validateQuiz({
    ...quiz,
    questions: quiz.questions.map((question, index) => index === 1
      ? { ...question, options: ['A', 'A', 'C', 'D'] }
      : question),
  }), /Invalid quiz question/);
  assert.throws(() => gradeQuiz(validateQuiz(quiz), [0, 1]), /Choose an answer/);
});
