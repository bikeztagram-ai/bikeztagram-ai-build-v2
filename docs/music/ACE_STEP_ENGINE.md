# Bikeztagram AI — ACE-Step Music Engine

Bikeztagram's real music-generation path uses **ACE-Step 1.5**, an open-source music foundation model. ElevenLabs is not required by the active music architecture.

## Architecture

Browser Music Studio -> /api/music -> ACE-Step REST API -> generated WAV/MP3 -> browser

The Vercel app is the secure gateway. The actual model must run on a GPU-capable machine/service because Vercel serverless functions are not suitable for hosting the model itself.

## Provider configuration

Set these Vercel environment variables:

- ACE_STEP_API_URL — base URL of an ACE-Step REST API server, for example https://your-music-engine.example.com
- ACE_STEP_API_TOKEN — optional bearer token if the engine is protected

No ElevenLabs API key is needed.

## ACE-Step 1.5

The official project documents a REST API server launched with:

    uv run acestep-api

The default local API is:

    http://localhost:8001

The engine supports text-to-music, lyrics, reference audio and longer compositions. The Bikeztagram gateway currently starts with a short 15–30 second generation test because Vercel request time limits are finite.

## Important deployment note

Do not point the production app at a random public Space without checking its API, queue limits, authentication and usage policy. The preferred production architecture is a dedicated ACE-Step instance that Bikeztagram controls.

## Local fallback

Bikeztagram still contains the browser-local procedural composer and arrangement engine. It is explicitly labelled **LOCAL DRAFT** and is never represented as equivalent to model-generated music.
