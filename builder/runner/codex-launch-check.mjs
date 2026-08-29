if (!process.env.OPENAI_API_KEY) {
  console.error('[autobot] OPENAI_API_KEY is missing; Codex cannot run.');
  process.exit(1);
}
console.log('[autobot] OpenAI Codex launch credential detected.');
