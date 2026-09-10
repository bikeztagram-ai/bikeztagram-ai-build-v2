#!/usr/bin/env node
/**
 * Hosted-runner performance proxy for the local coding brain.
 * Keeps the source feature brain unchanged while applying conservative
 * inference limits that are appropriate for GitHub-hosted CPU/GPU runners.
 */
import http from 'node:http';

const listenPort = Number(process.env.OLLAMA_PROXY_PORT || 11435);
const upstream = process.env.OLLAMA_UPSTREAM || 'http://127.0.0.1:11434';
const maxContext = Number(process.env.LOCAL_AI_PROXY_NUM_CTX || 4096);
const maxPredict = Number(process.env.LOCAL_AI_PROXY_NUM_PREDICT || 900);

function clampBody(body) {
  const request = JSON.parse(body);
  request.stream = false;
  request.keep_alive = request.keep_alive ?? '15m';
  request.options = {
    ...(request.options || {}),
    temperature: 0,
    num_ctx: Math.min(Number(request.options?.num_ctx || maxContext), maxContext),
    num_predict: Math.min(Number(request.options?.num_predict || maxPredict), maxPredict),
  };
  return JSON.stringify(request);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok\n');
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/chat') {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('ollama-performance-proxy: GET /health or POST /api/chat only\n');
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const started = Date.now();

  try {
    const body = clampBody(Buffer.concat(chunks).toString('utf8'));
    const response = await fetch(`${upstream}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    const text = await response.text();
    console.error(`[autobot] Ollama proxy ${response.status} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    res.writeHead(response.status, {
      'content-type': response.headers.get('content-type') || 'application/json',
    });
    res.end(text);
  } catch (error) {
    console.error(`[autobot] Ollama proxy failure after ${((Date.now() - started) / 1000).toFixed(1)}s: ${error.message}`);
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: `ollama proxy: ${error.message}` }));
  }
});

server.listen(listenPort, '127.0.0.1', () => {
  console.log(`[autobot] Ollama performance proxy listening on 127.0.0.1:${listenPort}; num_ctx<=${maxContext}; num_predict<=${maxPredict}`);
});
