import { handleAsk } from '../ask.js';

export function POST(request) {
  return handleAsk(request, () => process.env.OPENAI_API_KEY, 'the OpenAI key in the Vercel project settings');
}
