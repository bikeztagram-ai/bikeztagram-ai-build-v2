/* Complete-film execution bridge. Keeps the existing renderer contract while allowing independent creative branches to run in parallel. */

const PIPELINE = ['understand', 'direct', 'parallel-creative', 'assemble', 'render', 'qa', 'revise', 'export'];

function nextState(state, patch = {}) {
  return { ...state, ...patch, updatedAt: Date.now() };
}

export function createCompleteFilmRuntime({ job, adapters = {}, maxAttempts = 3 } = {}) {
  return {
    version: 'complete-film-runtime-v1',
    job,
    stage: 'understand',
    completed: [],
    outputs: {},
    attempts: {},
    errors: [],
    maxAttempts,
    adapters,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  };
}

async function runAdapter(state, name, context) {
  const adapter = state.adapters?.[name];
  if (typeof adapter !== 'function') return { status: 'adapter-unavailable' };
  return adapter({ state, context });
}

export async function runCompleteFilm(state, context = {}) {
  let current = state;
  try {
    current = nextState(current, { stage: 'understand' });
    current = nextState(current, {
      completed: [...new Set([...current.completed, 'understand'])],
      outputs: { ...current.outputs, understand: await runAdapter(current, 'understand', context) },
    });

    current = nextState(current, { stage: 'direct' });
    current = nextState(current, {
      completed: [...new Set([...current.completed, 'direct'])],
      outputs: { ...current.outputs, direct: await runAdapter(current, 'direct', { ...context, understand: current.outputs.understand }) },
    });

    current = nextState(current, { stage: 'parallel-creative' });
    const branchContext = { ...context, understand: current.outputs.understand, direct: current.outputs.direct };
    const [music, scenes] = await Promise.all([
      runAdapter(current, 'music', branchContext),
      runAdapter(current, 'scenes', branchContext),
    ]);
    current = nextState(current, {
      completed: [...new Set([...current.completed, 'parallel-creative'])],
      outputs: { ...current.outputs, music, scenes },
    });

    current = nextState(current, { stage: 'assemble' });
    current = nextState(current, {
      completed: [...new Set([...current.completed, 'assemble'])],
      outputs: {
        ...current.outputs,
        assemble: await runAdapter(current, 'assemble', { ...branchContext, music, scenes }),
      },
    });

    current = nextState(current, { stage: 'render' });
    current = nextState(current, {
      completed: [...new Set([...current.completed, 'render'])],
      outputs: { ...current.outputs, render: await runAdapter(current, 'render', { ...branchContext, music, scenes, assemble: current.outputs.assemble }) },
    });

    current = nextState(current, { stage: 'qa' });
    const qa = await runAdapter(current, 'qa', { ...branchContext, render: current.outputs.render });
    current = nextState(current, {
      completed: [...new Set([...current.completed, 'qa'])],
      outputs: { ...current.outputs, qa },
    });

    if (Number(qa?.score ?? 100) < 80 && Number(current.attempts.qa || 0) < current.maxAttempts && typeof current.adapters?.revise === 'function') {
      const attempts = { ...current.attempts, qa: Number(current.attempts.qa || 0) + 1 };
      const revised = await current.adapters.revise({ state: current, context: { ...branchContext, qa } });
      current = nextState(current, {
        stage: 'revise',
        attempts,
        completed: [...new Set([...current.completed, 'revise'])],
        outputs: { ...current.outputs, revise: revised },
      });
      if (revised?.render) current.outputs.render = revised.render;
    }

    current = nextState(current, { stage: 'export' });
    current = nextState(current, {
      completed: [...new Set([...current.completed, 'export'])],
      outputs: { ...current.outputs, export: await runAdapter(current, 'export', { ...branchContext, render: current.outputs.render, qa: current.outputs.qa }) },
      stage: 'complete',
    });
    return current;
  } catch (error) {
    return nextState(current, {
      errors: [...current.errors, { stage: current.stage, message: error?.message || String(error), at: Date.now() }],
    });
  }
}

export function getCompleteFilmProgress(state) {
  const completed = state?.completed || [];
  return {
    stage: state?.stage || 'understand',
    completed: completed.length,
    total: PIPELINE.length,
    percent: Math.round((completed.length / PIPELINE.length) * 100),
    stages: PIPELINE,
    parallelBranches: ['music', 'scenes'],
  };
}
