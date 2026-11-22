// Validate the complete draft before exposing either questions or the teacher key.
export function formatPracticeTest(value) {
  const text = (input, limit) => typeof input === 'string' && input.trim().length > 0
    && input.length <= limit && !/^\s*(?:#{1,6}\s+)?\*{0,2}answer key\s*:?\*{0,2}[^\S\n]*$/im.test(input);
  if (!value || !text(value.title, 200) || !text(value.instructions, 1000)
    || !Array.isArray(value.questions) || value.questions.length < 1 || value.questions.length > 12
    || !value.questions.every((item) => item && text(item.prompt, 1500)
      && text(item.answer, 1000) && text(item.explanation, 1500))) {
    throw new Error('Invalid practice test');
  }
  const questions = value.questions.map((item, index) => `${index + 1}. ${item.prompt.trim()}`).join('\n\n');
  const key = value.questions.map((item, index) => `${index + 1}. ${item.answer.trim()}\nWhy: ${item.explanation.trim()}`).join('\n\n');
  return `${value.title.trim()}\n\nAI draft — Teacher: check every question, answer, and explanation against your approved notes before sharing.\n\n${value.instructions.trim()}\n\n${questions}\n\nANSWER KEY\nTeacher review required. Share only the questions with students.\n\n${key}`;
}
