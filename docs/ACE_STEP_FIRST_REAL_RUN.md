# ACE-Step First Real Run

## Runtime
ACE-Step 1.5 local REST API.

## Start
Run the official ACE-Step local API on the generation machine. Bikeztagram connects to its localhost REST endpoint; Vercel is not required.

## Flow
1. Health check.
2. Compile Bikeztagram song brief.
3. POST generation request to `/release_task`.
4. Poll `/query_result` until success/failure.
5. Capture returned audio path/metadata.
6. Evaluate the playable audio.
7. Store model/runtime/provenance evidence.

## First brief
Original 180-second cinematic biker-rock song with gritty lead vocal, memorable chorus, dark opening, escalating build, major drop and large finale.

## Pass rule
No metadata-only pass. Actual playable audio is required.
