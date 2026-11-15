import { askOpenAI, modes } from './openai.js';

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readQuestion(request) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = '';
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 48000) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
    const data = JSON.parse(body + decoder.decode());
    if (typeof data?.mode !== 'string' || !Object.hasOwn(modes, data.mode) || typeof data.question !== 'string') return null;
    const question = data.question.trim();
    if (!question || question.length > 4000) return null;
    const history = data.mode === 'chat' ? data.history ?? [] : [];
    if (!Array.isArray(history) || history.length > 8 || history.length % 2 !== 0) return null;
    if (!history.every((entry, index) => entry?.role === (index % 2 ? 'assistant' : 'user')
      && typeof entry.content === 'string' && entry.content.length <= 2400)) return null;
    return { mode: data.mode, question, history: history.map(({ role, content }) => ({ role, content })) };
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function handleAsk(request, readKey, keyLocation) {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim();
  if (request.headers.get('origin') !== new URL(request.url).origin || contentType !== 'application/json') {
    return json({ error: 'Please ask from the SchoolSidekick page.' }, 403);
  }

  const input = await readQuestion(request);
  if (!input) return json({ error: 'Choose a tool and enter up to 4,000 characters.' }, 400);
  try {
    const answer = await askOpenAI(input.mode, input.question, input.history, readKey());
    return json({ answer });
  } catch (error) {
    if (error.cause === 'invalid-key') {
      return json({ error: `OpenAI rejected the API key. Check ${keyLocation} and try again.` }, 503);
    }
    return json({ error: `I couldn’t reach your AI helper. Check ${keyLocation} and try again.` }, 503);
  }
}
