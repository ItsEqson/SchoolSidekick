import { loadSaved, removeAnswer, saveAnswer } from './storage.js';
import { renderPlanner } from './planner.js';
import { renderHint } from './hints.js';
import { renderQuiz } from './quiz.js';

const studentTools = {
  hint: {
    name: 'Homework helper', icon: '↗', description: 'Get step-by-step hints, a worked example, and a simple visual when it helps. Then try it yourself.',
    prompt: 'What are you stuck on?', example: 'How do I start solving 3x + 5 = 20?', button: 'Get a hint', result: 'Let’s work through it',
  },
  planner: {
    name: 'Time organizer', icon: '□', description: 'Pick a day and add a reminder for homework, quizzes, or study time.',
  },
  practice: {
    name: 'Studying', icon: '✓', description: 'Review the big ideas in a topic and try some practice problems.',
    prompt: 'What topic or unit are you studying?', example: 'Adding fractions with different denominators', button: 'Start studying', result: 'Study guide and practice',
  },
  quiz: {
    name: 'Practice quiz', icon: '?', description: 'Test yourself with five multiple-choice questions. Check your score and learn from explanations after you answer.',
    prompt: 'What topic would you like a quiz on?', example: 'Equivalent fractions for sixth grade', button: 'Make a quiz', result: 'Practice quiz',
  },
  notes: {
    name: 'Note taking', icon: '≡', description: 'Turn a topic or what you covered in class into notes you can study later.',
    prompt: 'What did you cover in class?', example: 'We drew the water cycle and discussed how clouds form.', button: 'Make notes', result: 'Your study notes',
  },
  essay: {
    name: 'Writing essay', icon: '✎', description: 'Get feedback on spelling, grammar, and clarity, plus ideas for what to write next.',
    prompt: 'Paste your draft or write a few sentences', example: 'School gardens is helpful. They give students a place to learn about plants but they also do other things.', button: 'Review my writing', result: 'Essay feedback',
  },
  chat: {
    name: 'Question', icon: '?', description: 'Ask a school question and follow up when you need another explanation.',
    prompt: 'Ask a school question', example: 'Why can we see the Moon during the day?', button: 'Send message',
  },
};
const teacherTools = {
  feedback: {
    name: 'Improvement', icon: '↗', description: 'Get short, actionable suggestions you can share with a student.',
    prompt: 'Paste a short excerpt with identifying details removed', example: 'In the story, the character moved to a new town. She was nervous. She made a friend and I think she changed.', button: 'Suggest improvements', result: 'Suggested improvements',
  },
  lesson: {
    name: 'Making lesson plans', icon: '≡', description: 'Turn a topic into a one-day lesson with a goal, activities, and a quick check.',
    prompt: 'What are you teaching? Include the grade and class length if you know them.', example: 'A 25-minute sixth-grade lesson on the water cycle.', button: 'Draft a lesson', result: 'Lesson plan',
  },
  test: {
    name: 'Creating activities and tests', icon: '✓', description: 'Draft a classroom activity and a test with a separate answer key for your review.',
    prompt: 'What topic and grade should the activity and test cover?', example: 'Create an activity and a four-question test on equivalent fractions for sixth grade.', button: 'Create activity and test', result: 'Activity and test',
  },
};

const workspace = location.pathname === '/teacher' ? 'teacher' : 'student';
const isTeacher = workspace === 'teacher';
const tools = isTeacher ? teacherTools : studentTools;
tools.saved = { name: 'Saved work', icon: '▤', description: 'Revisit the work you saved on this browser.' };
const menu = document.querySelector('#tool-menu');
const form = document.querySelector('#ask-form');
const question = document.querySelector('#question');
const questionLabel = document.querySelector('#question-label');
const example = document.querySelector('#example');
const ask = document.querySelector('#ask');
const status = document.querySelector('#status');
const result = document.querySelector('#answer');
const quizPanel = document.querySelector('#quiz-panel');
const answerTitle = document.querySelector('#answer-title');
const answerText = document.querySelector('#answer-text');
const answerKey = document.querySelector('#answer-key');
const keyText = document.querySelector('#key-text');
const save = document.querySelector('#save');
const chat = document.querySelector('#chat');
const savedError = document.querySelector('#saved-error');
const savedItems = document.querySelector('#saved-items');
const connectionMessage = 'I couldn’t reach your AI helper. Please try again later.';
const conversations = new Map();
const newConversation = document.querySelector('#new-conversation');
const conversationHelp = document.querySelector('#conversation-help');
const drafts = new Map();
let currentMode;
let currentAnswer;
let asking = false;
let hasQuiz = false;

function updateComposer() {
  const continuing = (conversations.get(currentMode)?.length ?? 0) > 0;
  questionLabel.textContent = continuing ? 'Ask a follow-up question' : tools[currentMode].prompt;
  ask.textContent = continuing ? 'Send follow-up' : tools[currentMode].button;
  newConversation.hidden = !continuing;
  conversationHelp.hidden = !continuing;
}

newConversation.addEventListener('click', () => {
  if (asking) return;
  conversations.delete(currentMode);
  question.value = '';
  drafts.delete(currentMode);
  result.hidden = true;
  currentAnswer = null;
  if (currentMode === 'quiz') { hasQuiz = false; quizPanel.hidden = true; }
  if (currentMode === 'chat') chat.replaceChildren();
  status.textContent = '';
  updateComposer();
  question.focus();
});

function textElement(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function addKey(container, key) {
  const details = document.createElement('details');
  details.append(textElement('summary', 'Teacher answer key'), textElement('p', key));
  container.append(details);
}

function renderSaved() {
  savedItems.replaceChildren();
  try {
    const items = loadSaved(workspace);
    if (!items.length) savedItems.textContent = 'Your saved work will appear here.';
    for (const item of items) {
      const card = document.createElement('details');
      const summary = document.createElement('summary');
      summary.append(textElement('span', item.label), textElement('strong', item.title));
      card.append(summary);
      if (item.label === studentTools.hint.name) {
        const content = document.createElement('div');
        renderHint(content, item.answer);
        card.append(content);
      } else {
        card.append(textElement('p', item.answer));
      }
      if (item.key) addKey(card, item.key);
      const remove = textElement('button', 'Remove');
      remove.type = 'button';
      remove.className = 'remove';
      remove.addEventListener('click', () => {
        try {
          removeAnswer(item.id);
          renderSaved();
        } catch {
          showStorageError();
        }
      });
      card.append(remove);
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

function selectTool(mode) {
  if (currentMode === mode || asking) return;
  if (currentMode && !['planner', 'saved'].includes(currentMode)) drafts.set(currentMode, question.value);
  currentMode = mode;
  const tool = tools[mode];
  for (const button of menu.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', button.dataset.mode === mode);
  }
  document.querySelector('#active-tool').textContent = tool.name;
  document.querySelector('#page-title').textContent = tool.name;
  document.querySelector('#page-description').textContent = tool.description;
  document.querySelector('.workspace').hidden = mode === 'saved';
  document.querySelector('#saved').hidden = mode !== 'saved';
  document.querySelector('#tool-description').textContent = tool.description;
  document.querySelector('#ai-panel').hidden = mode === 'planner';
  document.querySelector('#planner').hidden = mode !== 'planner';
  quizPanel.hidden = mode !== 'quiz' || !hasQuiz;
  if (mode === 'saved') {
    renderSaved();
    return;
  }
  if (mode === 'planner') {
    renderPlanner();
    return;
  }
  questionLabel.textContent = tool.prompt;
  question.placeholder = `Example: ${tool.example}`;
  question.value = drafts.get(mode) ?? '';
  ask.textContent = tool.button;
  updateComposer();
  chat.hidden = mode !== 'chat';
  result.hidden = true;
  currentAnswer = null;
  status.textContent = '';
}

function addMessage(role, text, saveable = false) {
  const message = document.createElement('article');
  message.className = `message ${role}`;
  message.append(textElement('strong', role === 'user' ? 'You' : 'SchoolSidekick'), textElement('p', text));
  if (saveable) {
    const button = textElement('button', 'Save this answer');
    button.type = 'button';
    button.className = 'secondary';
    const item = makeAnswer(tools.chat.name, 'Chat answer', text);
    button.addEventListener('click', () => saveWork(item, button));
    message.append(button);
  }
  chat.append(message);
  chat.scrollTop = chat.scrollHeight;
  return message;
}

function makeAnswer(label, title, answer, key = '') {
  return { id: crypto.randomUUID(), workspace, label, title, answer, key };
}

function saveWork(item, button) {
  try {
    saveAnswer(item);
    button.textContent = 'Saved';
    button.disabled = true;
    renderSaved();
  } catch {
    status.textContent = 'Your browser couldn’t save this answer. You can still read it here.';
  }
}

function displayAnswer(mode, text) {
  const tool = tools[mode];
  // The test uses a standalone heading so teachers can collapse the key.
  const heading = /^\s*(?:#{1,6}\s+)?\*{0,2}answer key\s*:?\*{0,2}[^\S\n]*$/im;
  const marker = mode === 'test' ? heading.exec(text) : null;
  const answer = marker ? text.slice(0, marker.index).trim() : text;
  const key = marker ? text.slice(marker.index + marker[0].length).trim() : '';
  answerTitle.textContent = tool.result;
  if (mode === 'hint') renderHint(answerText, answer);
  else answerText.textContent = answer;
  keyText.textContent = key;
  answerKey.open = false;
  answerKey.hidden = !key;
  currentAnswer = makeAnswer(tool.name, tool.result, answer, key);
  save.disabled = false;
  save.textContent = 'Save this answer';
  result.hidden = false;
  answerTitle.focus();
}

example.addEventListener('click', () => {
  question.value = tools[currentMode].example;
  question.focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (asking) return;
  const input = question.value.trim();
  if (!input) {
    status.textContent = 'Type something or try an example first.';
    question.focus();
    return;
  }

  const mode = currentMode;
  const messages = conversations.get(mode) ?? [];
  const chatting = mode === 'chat';
  asking = true;
  ask.disabled = true;
  newConversation.disabled = true;
  example.disabled = true;
  question.readOnly = true;
  for (const button of menu.querySelectorAll('button')) button.disabled = true;
  status.textContent = 'Thinking…';
  const pending = chatting ? addMessage('user', input) : null;
  if (mode === 'quiz') quizPanel.hidden = true;
  let answered = false;
  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, question: input, history: messages }),
    });
    const data = await response.json();
    if (!response.ok) {
      status.textContent = data.error?.message ?? connectionMessage;
      return;
    }
    if (mode === 'quiz' && data.quiz) {
      result.hidden = true;
      renderQuiz(quizPanel, data.quiz, (title, summary, button) => {
        saveWork(makeAnswer('Practice quiz', title, summary), button);
      });
      hasQuiz = true;
    } else if (chatting) {
      addMessage('assistant', data.answer, true);
    } else {
      displayAnswer(mode, data.answer);
    }
    // Keep the original topic plus the three most recent exchanges.
    // Quiz context excludes hidden answers and explanations.
    const context = data.quiz ? JSON.stringify({ title: data.quiz.title,
      questions: data.quiz.questions.map(({ prompt, options }) => ({ prompt, options })) }) : data.answer;
    messages.push({ role: 'user', content: input.slice(0, 2400) },
      { role: 'assistant', content: context.slice(0, 2400) });
    if (messages.length > 8) messages.splice(2, messages.length - 8);
    conversations.set(mode, messages);
    question.value = '';
    updateComposer();
    answered = true;
    status.textContent = '';
  } catch {
    status.textContent = connectionMessage;
  } finally {
    if (mode === 'quiz' && !answered && hasQuiz) quizPanel.hidden = false;
    if (!answered) pending?.remove();
    asking = false;
    ask.disabled = false;
    newConversation.disabled = false;
    example.disabled = false;
    question.readOnly = false;
    for (const button of menu.querySelectorAll('button')) button.disabled = false;
    if (chatting) question.focus();
  }
});

save.addEventListener('click', () => {
  if (currentAnswer) saveWork(currentAnswer, save);
});

document.querySelector('#page-title').textContent = isTeacher ? 'Teacher workspace' : 'Student workspace';
document.querySelector('#page-description').textContent = isTeacher
  ? 'Give feedback, plan a lesson, or put together activities and tests.'
  : 'Get unstuck, study at your own pace, and keep schoolwork organized.';
document.querySelector('#privacy').textContent = isTeacher
  ? 'Text goes to OpenAI. Leave out student names, grades, and other identifying details. Review any draft before using it.'
  : 'Text goes to OpenAI. Leave out names, grades, passwords, and other private details.';
document.querySelector(`.roles a[href="/${workspace}"]`).setAttribute('aria-current', 'page');
for (const [mode, tool] of Object.entries(tools)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.mode = mode;
  const icon = textElement('span', tool.icon);
  icon.setAttribute('aria-hidden', 'true');
  button.append(icon, textElement('strong', tool.name));
  button.addEventListener('click', () => selectTool(mode));
  menu.append(button);
}
selectTool(Object.keys(tools)[0]);
renderSaved();
