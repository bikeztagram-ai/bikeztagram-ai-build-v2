/* BIKEZTAGRAM AI — prompt-to-project orchestration. */

export function createPromptProject({ prompt, durationSeconds = 15, aspectRatio = '9:16', generateAudio = true } = {}) {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw new Error('Tell Bikeztagram what you want to create');

  return {
    version: 'prompt-project-v1',
    source: { type: 'generated', mediaProvided: false },
    creativeBrief: cleanPrompt,
    generation: {
      durationSeconds: Math.max(4, Math.min(60, Number(durationSeconds) || 15)),
      aspectRatio: aspectRatio === '16:9' ? '16:9' : '9:16',
      generateAudio: generateAudio !== false,
    },
    pipeline: [
      'director',
      'generate',
      'import',
      'render',
      'quality-check',
      'revise-if-needed',
    ],
    status: 'ready',
  };
}

export async function startPromptProject(project, fetchImpl = fetch) {
  if (!project?.creativeBrief) throw new Error('Project has no creative brief');
  const response = await fetchImpl('/api/generate-video', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      prompt: project.creativeBrief,
      durationSeconds: project.generation.durationSeconds,
      aspectRatio: project.generation.aspectRatio,
      generateAudio: project.generation.generateAudio,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'Unable to start generation');
  return { ...project, generation: { ...project.generation, jobId: payload.id }, status: payload.status || 'processing' };
}

export async function pollPromptProject(project, fetchImpl = fetch) {
  const id = project?.generation?.jobId;
  if (!id) throw new Error('Project has no generation job');
  const response = await fetchImpl(`/api/video-generation-status?id=${encodeURIComponent(id)}`);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error || 'Unable to read generation status');
  return {
    ...project,
    status: payload.status,
    generatedVideo: payload.video || project.generatedVideo || null,
    generation: { ...project.generation, error: payload.error || null },
  };
}
