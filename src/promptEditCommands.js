/* BIKEZTAGRAM AI — natural-language commands for the editing engine. */

const COMMANDS = Object.freeze([
  { id: 'make-faster', patterns: [/make (it|this|the video) faster/i, /faster pace/i], operation: 'speed', value: 1.25 },
  { id: 'make-slower', patterns: [/make (it|this|the video) slower/i, /slow (it|this) down/i], operation: 'speed', value: 0.75 },
  { id: 'add-captions', patterns: [/add captions/i, /caption (it|this)/i], operation: 'caption', value: true },
  { id: 'more-cinematic', patterns: [/more cinematic/i, /make it cinematic/i], operation: 'treatment', value: 'cinematic' },
  { id: 'vertical', patterns: [/vertical/i, /for reels/i, /for tiktok/i, /for shorts/i], operation: 'reframe', value: '9:16' },
  { id: 'landscape', patterns: [/landscape/i, /for youtube/i], operation: 'reframe', value: '16:9' },
]);

export function parseEditCommands(text = '') {
  const input = String(text).trim();
  return COMMANDS.filter((command) => command.patterns.some((pattern) => pattern.test(input))).map(({ id, operation, value }) => ({ id, operation, value }));
}

export function applyParsedEditCommands(project, text = '') {
  const commands = parseEditCommands(text);
  return { project, commands, applied: commands.map((command) => `${command.operation}:${String(command.value)}`) };
}
