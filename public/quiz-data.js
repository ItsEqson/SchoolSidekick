export function validateQuiz(value) {
  const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  if (!value || !text(value.title, 160) || !Array.isArray(value.questions)
    || value.questions.length !== 5) throw new Error('Invalid quiz');
  const questions = value.questions.map((question) => {
    if (!question || !text(question.prompt, 800) || !text(question.explanation, 1000)
      || !Array.isArray(question.options) || question.options.length !== 4
      || !question.options.every((option) => text(option, 300))
      || new Set(question.options.map((option) => option.trim().toLowerCase())).size !== 4
      || !Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
      throw new Error('Invalid quiz question');
    }
    return { prompt: question.prompt.trim(), options: question.options.map((option) => option.trim()),
      correctIndex: question.correctIndex, explanation: question.explanation.trim() };
  });
  if (new Set(questions.map((question) => question.prompt.toLowerCase())).size !== questions.length) throw new Error('Duplicate quiz questions');
  return { title: value.title.trim(), questions };
}

export function gradeQuiz(quiz, choices) {
  if (!Array.isArray(choices) || choices.length !== quiz.questions.length
    || choices.some((choice) => !Number.isInteger(choice) || choice < 0 || choice > 3)) {
    throw new Error('Choose an answer for every question first.');
  }
  const results = quiz.questions.map((question, index) => ({
    ...question, choice: choices[index], correct: choices[index] === question.correctIndex,
  }));
  return { score: results.filter((result) => result.correct).length, total: results.length, results };
}

export function quizSummary(quiz, grade) {
  return `${quiz.title}\nScore: ${grade.score} out of ${grade.total}\n\n` + grade.results.map((result, index) =>
    `${index + 1}. ${result.prompt}\nYour answer: ${result.options[result.choice]}\n${result.correct ? 'Correct' : 'Keep practicing'}\nCorrect answer: ${result.options[result.correctIndex]}\nWhy: ${result.explanation}`
  ).join('\n\n');
}
