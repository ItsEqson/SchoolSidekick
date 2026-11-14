import { loadSaved, removeAnswer, saveAnswer } from './storage.js';

const tools = {
  hint: {
    prompt: 'What are you stuck on?',
    example: 'How do I start solving 3x + 5 = 20?',
    title: 'Your hint',
    savedLabel: 'Hint',
  },
  practice: {
    prompt: 'What topic do you want to practice?',
    example: 'Give me practice questions on adding fractions with different denominators.',
    title: 'Your practice questions',
    savedLabel: 'Practice',
  },
  lesson: {
    prompt: 'What would you like to teach?',
    example: 'Draft a 25-minute lesson on the water cycle for sixth grade.',
    title: 'Your lesson draft',
    savedLabel: 'Lesson',
  },
};

const modes = document.querySelector('.modes');
const form = document.querySelector('#ask-form');
const question = document.querySelector('#question');
const questionLabel = document.querySelector('#question-label');
const example = document.querySelector('#example');
const ask = document.querySelector('#ask');
const status = document.querySelector('#status');
const result = document.querySelector('#answer');
const answerTitle = document.querySelector('#answer-title');
const answerText = document.querySelector('#answer-text');
const save = document.querySelector('#save');
const savedError = document.querySelector('#saved-error');
const savedItems = document.querySelector('#saved-items');
const currentMode = () => modes.querySelector(':checked').value;
const connectionMessage = 'I couldn’t reach your AI helper. Check your OpenAI key and internet connection, then try again.';
let currentAnswer;
let asking = false;

function renderSaved() {
  savedItems.replaceChildren();
  try {
    const items = loadSaved();
    if (!items.length) savedItems.textContent = 'Your saved answers will appear here.';
    for (const item of items) {
      const card = document.createElement('details');
      const summary = document.createElement('summary');
      const label = document.createElement('span');
      const title = document.createElement('strong');
      const body = document.createElement('p');
      const remove = document.createElement('button');
      label.textContent = item.label;
      title.textContent = item.title;
      summary.append(label, title);
      body.textContent = item.answer;
      remove.type = 'button';
      remove.className = 'remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        try {
          removeAnswer(item.id);
          renderSaved();
        } catch {
          showStorageError();
        }
      });
      card.append(summary, body, remove);
      savedItems.append(card);
    }
    savedError.hidden = true;
  } catch {
    showStorageError();
  }
}

function showStorageError() {
  savedError.textContent = 'Your browser couldn’t read or update saved work.';
  savedError.hidden = false;
}

modes.addEventListener('change', () => {
  const tool = tools[currentMode()];
  if (Object.values(tools).some(({ example }) => question.value === example)) question.value = '';
  questionLabel.textContent = tool.prompt;
  question.placeholder = `Example: ${tool.example}`;
  status.textContent = '';
});

example.addEventListener('click', () => {
  question.value = tools[currentMode()].example;
  question.focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (asking) return;
  const input = question.value.trim();
  if (!input) {
    status.textContent = 'Type a question or try an example first.';
    question.focus();
    return;
  }

  const mode = currentMode();
  const tool = tools[mode];
  asking = true;
  ask.disabled = true;
  modes.disabled = true;
  example.disabled = true;
  question.readOnly = true;
  status.textContent = 'Thinking…';
  result.hidden = true;
  currentAnswer = null;
  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, question: input }),
    });
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error ?? connectionMessage;
      return;
    }
    answerTitle.textContent = tool.title;
    answerText.textContent = data.answer;
    currentAnswer = {
      id: crypto.randomUUID(),
      label: tool.savedLabel,
      title: tool.title,
      answer: data.answer,
    };
    save.disabled = false;
    save.textContent = 'Save this answer';
    status.textContent = '';
    result.hidden = false;
    answerTitle.focus();
  } catch {
    status.textContent = connectionMessage;
  } finally {
    asking = false;
    ask.disabled = false;
    modes.disabled = false;
    example.disabled = false;
    question.readOnly = false;
  }
});

save.addEventListener('click', () => {
  if (!currentAnswer) return;
  try {
    saveAnswer(currentAnswer);
    save.textContent = 'Saved';
    save.disabled = true;
    renderSaved();
  } catch {
    status.textContent = 'Your browser couldn’t save this answer. You can still read it here.';
  }
});

renderSaved();
