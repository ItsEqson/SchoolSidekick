import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const readProjectFile = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');
const brief = readProjectFile('./BRIEF.md').split('## My AI’s instructions')[1].trim();
const model = readProjectFile('./NOTES.md').match(/^OpenAI model: `([^`]+)`/m)?.[1];

export const modes = {
  hint: 'Give actionable hints or a worked example about the same concept using a different problem. Leave the original homework answer for the student. End with a check-in question.',
  practice: 'Summarize the topic, explain essential ideas with a small example, and give 3 to 5 original numbered practice problems. Leave answers out so the student can try them.',
  notes: 'Turn the provided topic or class material into study notes with headings, short points and key terms. Distinguish general background from what the student says was covered. Do not invent what took place in class.',
  essay: 'Give actionable feedback on spelling, grammar, and clarity where applicable. Quote only short snippets and explain suggested corrections. Suggest next ideas or questions to explore. Keep the student’s own voice and do not write or finish the essay for them.',
  chat: 'Answer school questions conversationally. If a user message is a follow-up, use the preceding conversation for context. Explain your reasoning at a level suitable for middle school.',
  feedback: 'Give up to three short, actionable improvements a teacher can share with the student. Identify a strength when possible. Do not assign grades, scores, or judgments about the student. Base suggestions on the supplied writing.',
  lesson: 'Draft a one-day lesson with a learning goal, materials, timed activities and a quick check for understanding. Use a 45-minute period if no duration is given.',
  test: 'Draft an original classroom activity and a short original test appropriate for the topic and grade. Put student-facing material first. Then put the exact standalone heading ANSWER KEY and give corresponding answers with brief reasoning. Use 6 questions unless asked for another length; cap at 12. Do not reproduce or provide answers for an existing real test.',
};

export async function askOpenAI(mode, question, history) {
  const { OPENAI_API_KEY: key } = parseEnv(readProjectFile('./.env'));
  if (!key || key === 'paste-your-key-here' || !model) throw new Error('AI configuration is missing');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(45000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      store: false,
      instructions: `You are SchoolSidekick, a schoolwork assistant. Follow these project instructions for every answer:\n${brief}\n\nThe selected tool and these rules take precedence over feature descriptions in the brief. Do not mention a report button. Only the teacher Activities & Tests tool may generate a key, and only for an original test created in the reply. Refuse dangerous instructions, medication advice, bullying, and answers to existing real tests. Offer safe schoolwork alternatives where appropriate. In serious distress, respond calmly and encourage immediate help from a trusted adult and local emergency help if there is immediate danger. Do not repeat sensitive personal details. Acknowledge uncertainty and do not invent sources. Use short paragraphs or numbered lists in plain text with no Markdown symbols. Selected tool: ${modes[mode]}`,
      input: [...history, { role: 'user', content: question }],
      max_output_tokens: mode === 'test' || mode === 'lesson' ? 2800 : 1500,
    }),
  });
  if (response.status === 401) throw new Error('OpenAI rejected the configured key', { cause: 'invalid-key' });
  if (!response.ok) throw new Error('OpenAI request failed');
  const result = await response.json();
  const answer = result.output?.flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? part.refusal ?? '').filter(Boolean).join('\n\n').trim();
  if (!answer) throw new Error('OpenAI returned no answer');
  return answer;
}
