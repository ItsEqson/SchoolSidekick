import { handleAsk } from '../ask.js';

export function POST(request) {
  return handleAsk(request);
}
