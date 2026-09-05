# Open-source acceleration strategy

Bikeztagram AI deliberately uses a research-first integration model. Before implementing a substantial subsystem from scratch, inspect mature open-source projects for reusable architecture, algorithms, tests, adapters, and implementation patterns.

## Current priority candidates

| Area | Candidate | Why it matters | License / action |
|---|---|---|---|
| AI-first video composition | `thecodacus/rendiv` | Deterministic React/TypeScript compositions, agent-oriented workflow, transitions, parallel rendering, frame/still export | Apache-2.0; investigate direct adapter/integration |
| Browser-native deterministic rendering | `superhq-ai/webmotion` | WebCodecs rendering, frame-accurate composition, video/audio support, scene linting and agent skill | Verify current repository license before copying code; use architecture/patterns first |
| Browser NLE | `syntax-syndicate/openreel-video-editor` | WebCodecs/WebGPU, multi-track timeline, keyframes, colour/audio tooling | MIT; evaluate reusable modules |
| Browser-local NLE | `shenghaoc/localcut` | WebCodecs/WebGPU/workers, multi-track editing and local media pipeline | Verify repository license before reuse |
| Browser DAW | `dvir-drori/daw` | Audio engine, MIDI, mixer, effects, instruments, project model | MIT; evaluate reusable modules |
| Browser DAW | `ai-music/webdaw` | WebAudio/WebMIDI and plugin-oriented audio architecture | MIT; evaluate reusable modules |

## Rules

1. Prefer mature, compatible implementations over reinvention.
2. Verify the repository license before copying code; preserve required notices.
3. Do not import GPL/AGPL code into the proprietary Bikeztagram runtime without an explicit licensing decision.
4. Prefer small adapters over wholesale forks when the dependency is not a clean fit.
5. Every adopted subsystem must pass Bikeztagram's production contract, Gemini-free guard, build and targeted verification.
6. Benchmark before and after when a rendering or media-path replacement is proposed.
7. Keep provider-specific AI behind adapters so the creative pipeline remains replaceable.
8. Never trade away the universal creative goal merely to reduce implementation effort.

## Build loop

`Research -> license check -> architecture comparison -> smallest useful extraction/integration -> targeted verification -> production contract -> next bottleneck`.

## External research snapshots

- Rendiv describes itself as an AI-first, deterministic, code-based video editor and exposes frame-based composition, transitions and parallel headless rendering.
- WebMotion describes a browser-native deterministic composition model using WebCodecs and includes scene lint/shoot tooling designed to close the visual QA loop for agents.
- OpenReel describes a client-side editor using React, TypeScript, WebCodecs and WebGPU with multi-track editing and keyframes.
- The DAW candidates demonstrate mature browser-side WebAudio/WebMIDI approaches that can inform Bikeztagram's music and audio-editing layer.

This document is a living shortlist, not a commitment to depend on every project. Re-audit it during major build sessions.
