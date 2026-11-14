import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { askOpenAI, modes } from './openai.js';

const host = '127.0.0.1';
const port = 4173;
const origin = `http://${host}:${port}`;
const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/storage.js', ['storage.js', 'text/javascript']],
]);
const assets = new Map([...files].map(([route, [file, type]]) => [route, {
  body: readFileSync(new URL(`./public/${file}`, import.meta.url)), type,
}]));

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readQuestion(req) {
  let body = '';
  req.setEncoding('utf8');
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    body += chunk;
    if (body.length > 8192) return null;
  }
  try {
    const data = JSON.parse(body);
    if (typeof data?.mode !== 'string' || !Object.hasOwn(modes, data.mode) || typeof data.question !== 'string') return null;
    const question = data.question.trim();
    return question.length && question.length <= 1200 ? { mode: data.mode, question } : null;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'");
  if (req.headers.host !== `${host}:${port}`) return json(res, 403, { error: 'Open the local preview link.' });
  const asset = assets.get(req.url);
  if (req.method === 'GET' && asset) {
    res.writeHead(200, { 'Content-Type': `${asset.type}; charset=utf-8`, 'Cache-Control': 'no-cache' });
    return res.end(asset.body);
  }
  if (req.method !== 'POST' || req.url !== '/api/ask') return json(res, 404, { error: 'Page not found.' });
  if (req.headers.origin !== origin || req.headers['content-type'] !== 'application/json') {
    return json(res, 403, { error: 'Please ask from the SchoolSidekick page.' });
  }

  try {
    const request = await readQuestion(req);
    if (!request) return json(res, 400, { error: 'Choose a tool and enter a question of up to 1,200 characters.' });
    const answer = await askOpenAI(request.mode, request.question);
    return json(res, 200, { answer });
  } catch {
    return json(res, 503, { error: 'I couldn’t reach your AI helper. Check your OpenAI key and internet connection, then try again.' });
  }
}).listen(port, host, () => console.log(`SchoolSidekick is ready at ${origin}`));
