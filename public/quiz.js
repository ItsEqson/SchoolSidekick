import { validateQuiz, gradeQuiz, quizSummary } from './quiz-data.js';

const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
};

export function renderQuiz(container, data, onSave) {
  const quiz = validateQuiz(data);
  container.replaceChildren();
  const title = element('h3', quiz.title);
  title.tabIndex = -1;
  const intro = element('p', 'Choose one answer for each question, then check your work. This is practice, not a school grade.');
  const form = element('form');
  const quizId = crypto.randomUUID();
  const feedback = [];
  quiz.questions.forEach((question, index) => {
    const fieldset = element('fieldset', '', 'quiz-question');
    fieldset.append(element('legend', `${index + 1}. ${question.prompt}`));
    question.options.forEach((option, optionIndex) => {
      const label = element('label', '', 'quiz-option');
      const input = element('input');
      input.type = 'radio';
      input.name = `${quizId}-${index}`;
      input.value = String(optionIndex);
      input.required = true;
      label.append(input, element('span', option));
      fieldset.append(label);
    });
    const note = element('div', '', 'quiz-feedback');
    note.hidden = true;
    fieldset.append(note);
    feedback.push(note);
    form.append(fieldset);
  });
  const check = element('button', 'Check my answers', 'primary');
  check.type = 'submit';
  const score = element('p', '', 'quiz-score');
  score.setAttribute('role', 'status');
  score.tabIndex = -1;
  const retry = element('button', 'Try this quiz again', 'secondary');
  retry.type = 'button';
  retry.hidden = true;
  const save = element('button', 'Save quiz results', 'secondary');
  save.type = 'button';
  save.hidden = true;
  const actions = element('div', '', 'quiz-actions');
  actions.append(check, retry, save);
  form.append(actions, score);
  let grade;
  let finished = false;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (finished) return;
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const choices = quiz.questions.map((_, index) => {
      const value = values.get(`${quizId}-${index}`);
      return value === null ? null : Number(value);
    });
    grade = gradeQuiz(quiz, choices);
    grade.results.forEach((result, index) => {
      const note = feedback[index];
      note.replaceChildren(element('strong', result.correct ? 'Correct!' : 'Keep practicing.'),
        element('p', `Correct answer: ${result.options[result.correctIndex]}`), element('p', result.explanation));
      note.hidden = false;
    });
    for (const input of form.querySelectorAll('input')) input.disabled = true;
    finished = true;
    check.hidden = true;
    retry.hidden = false;
    save.hidden = false;
    score.textContent = `${grade.score} out of ${grade.total} correct. ${grade.score === grade.total ? 'Great work! Try a new topic or a harder quiz next.' : 'Review the explanations, then try again.'}`;
    score.focus();
  });
  retry.addEventListener('click', () => {
    form.reset();
    for (const input of form.querySelectorAll('input')) input.disabled = false;
    for (const note of feedback) { note.hidden = true; note.replaceChildren(); }
    finished = false;
    grade = undefined;
    check.hidden = false;
    retry.hidden = true;
    save.hidden = true;
    save.disabled = false;
    save.textContent = 'Save quiz results';
    score.textContent = '';
    form.querySelector('input').focus();
  });
  save.addEventListener('click', () => onSave(quiz.title, quizSummary(quiz, grade), save));
  container.append(title, intro, form);
  container.hidden = false;
  title.focus();
}
