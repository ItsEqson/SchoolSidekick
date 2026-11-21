import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { handleAsk } from './ask.js';

const host = '127.0.0.1';
const port = Number(process.env.PORT ?? 4173);
const origin = `http://${host}:${port}`;
const files = new Map([
  ['/', ['index.html', 'text/html']],
  ['/student', ['index.html', 'text/html']],
  ['/teacher', ['index.html', 'text/html']],
  ['/style.css', ['style.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/storage.js', ['storage.js', 'text/javascript']],
  ['/planner.js', ['planner.js', 'text/javascript']],
]);
const assets = new Map([...files].map(([route, [file, type]]) => [route, {
  body: readFileSync(new URL(`./public/${file}`, import.meta.url)), type,
}]));

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
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
  const request = new Request(`${origin}/api/ask`, {
    method: 'POST',
    headers: req.headers,
    body: Readable.toWeb(req, { strategy: { highWaterMark: 1 } }),
    duplex: 'half',
  });
  const response = await handleAsk(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(await response.text());
}).listen(port, host, () => console.log(`SchoolSidekick is ready at ${origin}`));
