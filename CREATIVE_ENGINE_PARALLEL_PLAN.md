# Bikeztagram AI — Creative Engine Parallel Build Plan

Updated: 2026-08-21

## Objective

Evolve Bikeztagram AI from an AI-assisted browser editor into an in-house Creative Engine that can turn a natural-language creative request plus uploaded assets into a finished film using real media, generated media, original music, intelligent direction, rendering, QA and autonomous revision.

## Working rules

1. Preserve the protected working baseline and existing Blob/Gemini/render/API contracts.
2. Work in large batches, not cosmetic micro-changes.
3. Keep risky experiments on isolated `parallel/*` branches.
4. Merge only verified, non-conflicting batches into `dev/ai-filmmaker-batch-v2`.
5. Do not promote to production while the candidate is unverified.
6. Prefer in-house orchestration and open/local model runtimes where practical; model providers are replaceable adapters, not product architecture.
7. Never expose private API keys in client bundles.

## Parallel workstreams

### Batch 01 — Creative Director
Branch: `parallel/batch-01-creative-director`
Build the top-level creative brief/schema: intent, story, visual language, music brief, generated-scene requests, real-media requests, camera direction, timing, output targets and revision goals.

### Batch 02 — Music Engine
Branch: `parallel/batch-02-music-engine`
Evolve the current procedural fallback into a model-agnostic music-generation system: prompt-to-brief, section planning, instrumentation, BPM, energy curve, drop map, stems/track metadata and local fallback.

### Batch 03 — Video Generation
Branch: `parallel/batch-03-video-generation`
Define the model-agnostic text/image-to-video contract and generation job lifecycle without coupling the app to one provider.

### Batch 04 — Subject Consistency
Branch: `parallel/batch-04-subject-consistency`
Create subject/asset identity manifests for people, bikes, vehicles, products, animals and locations so generated scenes can preserve user-supplied subjects.

### Batch 05 — Mobile Performance
Branch: `parallel/batch-05-mobile-performance`
Harden browser memory, object URL lifecycle, source cleanup, render-session limits and Android-friendly progress/failure recovery.

### Batch 06 — Generation Orchestration
Branch: `parallel/batch-06-generation-orchestration`
Build a unified job/state machine for analysis, planning, music generation, scene generation, compositing, rendering, QA and revision.

### Batch 07 — QA/Security
Branch: `parallel/batch-07-qa-security`
Add automated checks for secret boundaries, generation payload safety, deterministic fallbacks, failed-job recovery and cost guards.

### Batch 08 — Render Quality
Branch: `parallel/batch-08-render-quality`
Improve the relationship between musical events, editorial cuts, motion, transitions, generated scenes and final QA without replacing the protected renderer prematurely.

### Batch 09 — Creative UI
Branch: `parallel/batch-09-creative-ui`
Build a simple natural-language Creative Director interface while keeping the existing filmmaker controls available for advanced users.

### Batch 10 — Media Understanding
Branch: `parallel/batch-10-media-understanding`
Expand media metadata and scene/subject understanding so the director can reason over uploaded photos, video, speech, motion and visual continuity.

### Batch 11 — Audio/Visual Sync
Branch: `parallel/batch-11-audio-visual-sync`
Use actual generated-track analysis to drive downbeats, builds, drops, energy transitions and visual pacing.

### Batch 12 — AI Infill Bridge
Branch: `parallel/batch-12-infill-bridge`
Allow the director to request generated transition shots, establishing shots, missing action, inserts and bridges as first-class timeline media.

### Batch 13 — Generation Adapters
Branch: `parallel/batch-13-generation-adapters`
Implement replaceable adapters for local/open-weight and remote generation runtimes. No provider-specific dependency should leak into the Creative Director.

### Batch 14 — Export Platform
Branch: `parallel/batch-14-export-platform`
Make generated and real media equally safe through 9:16, 1:1 and 16:9 output, audio retention, captions and Android share/download.

### Batch 15 — Test Matrix
Branch: `parallel/batch-15-test-matrix`
Build representative acceptance cases: motorcycle, car, person, product, travel, landscape, animal, mixed media, generated-only and hybrid productions.

### Batch 16 — In-house Model Runtime
Branch: `parallel/batch-16-inhouse-model-runtime`
Evaluate the practical local/open model runtime path for music and video generation, including hardware/runtime constraints and fallback strategy.

### Batch 17 — Creative Director v2
Branch: `parallel/batch-17-creative-director-v2`
Connect the creative brief to executable generation requests and the existing director/production plan.

### Batch 18 — Project Persistence
Branch: `parallel/batch-18-project-persistence`
Persist creative briefs, source assets, generated assets, versions, timelines, prompts and final exports so users can revisit and revise projects.

### Batch 19 — Launch Readiness
Branch: `parallel/batch-19-launch-readiness`
Prepare the integrated candidate for controlled Vercel preview, real Android acceptance and production release only after evidence-based verification.

### Batch 20 — Creative QA
Branch: `parallel/batch-20-creative-qa`
Add quality scoring beyond technical QA: shot variety, pacing, music energy, drop utilisation, visual continuity, caption quality and story coherence.

### Batch 21 — App Command Center
Branch: `parallel/batch-21-app-command-center`
Create the orchestration surface where one creative request can launch the complete pipeline and expose progress/revision controls.

### Batch 22 — Model Discovery
Branch: `parallel/batch-22-model-discovery`
Maintain a capability matrix for open/local models and runtimes, selecting the best practical engine without locking product architecture to one vendor.

### Batch 23 — Music Model Runtime
Branch: `parallel/batch-23-music-model-runtime`
Integrate the selected local/open music generation runtime behind the music adapter while retaining the original procedural fallback.

### Batch 24 — Video Model Runtime
Branch: `parallel/batch-24-video-model-runtime`
Integrate the selected local/open video runtime behind the generation adapter while retaining a safe fallback path.

### Batch 25 — Android E2E
Branch: `parallel/batch-25-android-e2e`
Drive physical-device acceptance for upload, generation, render, playback, download and share.

### Batch 26 — Security/Cost
Branch: `parallel/batch-26-security-and-cost`
Enforce zero-secret-client boundaries, bounded generation jobs, cost controls and explicit user-facing failure states.

### Batch 27 — Release Integration
Branch: `parallel/batch-27-release-integration`
Continuously integrate only clean batches into the development candidate and run the complete verification suite.

### Batch 28 — Prompt/Policy
Branch: `parallel/batch-28-prompt-and-policy`
Create safe, style-aware generation prompting that can express fictional/open-world/game-inspired aesthetics without requiring copyrighted characters or assets.

### Batch 29 — Multi-output
Branch: `parallel/batch-29-multi-output`
Support multiple deliverables from one creative job: hero film, short cut, teaser, square version and alternate endings.

### Batch 30 — Observability
Branch: `parallel/batch-30-observability`
Make every generation stage inspectable: timings, failures, retries, model selection, fallback use and quality scores.

## Later expansion branches

Branches `parallel/batch-31+` are reserved for deeper in-house audio/video tooling, asset libraries, scene language, generation QA, AI infill, image-to-video, text-to-video, compositing, model evaluation and the full Creative Engine integration.

## Merge strategy

Do not merge all branches blindly. Each batch must first prove its contract in isolation. Independent batches can then be merged in groups. The highest-priority integration order is:

1. Creative brief + orchestration
2. Music engine + actual beat/event analysis
3. Generation adapters + subject manifests
4. AI scene generation/infill
5. Creative UI command center
6. Creative QA + project persistence
7. Android/E2E + launch readiness

## Definition of the target product

A user can say something like:

> Make a 20-second cinematic open-world motorcycle trailer using these photos of my bike and me. Create dark aggressive original music, build tension, hit a huge drop, generate anything needed to make the story work, use game-like camera movement, and finish on a hero shot.

The Creative Engine should translate that request into a plan, generate the required original music and scenes, combine generated and real media, synchronise the edit to the actual soundtrack, render the result, inspect it, revise it when weak, and deliver the finished exports.
