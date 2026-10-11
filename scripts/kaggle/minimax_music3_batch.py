import os, subprocess, sys, time, signal, shutil
from pathlib import Path

print("=== VYRO ORIGINAL ANTHEM / MINIMAX MUSIC3 BATCH v2 ===", flush=True)
print("DIAGNOSTIC RETRY: expose the actual model startup/render error in Kaggle logs if this attempt fails.", flush=True)
def run(cmd, **kwargs):
    print("$", " ".join(cmd), flush=True)
    return subprocess.run(cmd, check=True, **kwargs)

run([sys.executable, "-m", "pip", "install", "-q", "--no-input", "uv"])
run([sys.executable, "-m", "uv", "python", "install", "3.12"])
venv = "/kaggle/temp/music3-venv"
if os.path.exists(venv): shutil.rmtree(venv, ignore_errors=True)
run([sys.executable, "-m", "uv", "venv", venv, "--python", "3.12"])
py = f"{venv}/bin/python"; sgl = f"{venv}/bin/sgl-omni"
run([sys.executable, "-m", "uv", "pip", "install", "--python", py, "--prerelease=allow", "sglang-omni==0.1.7"])
if not os.path.exists(sgl): raise RuntimeError("sgl-omni installation failed")
gpus = subprocess.check_output(["nvidia-smi", "--query-gpu=index,name,memory.total", "--format=csv,noheader"], text=True).strip()
print("GPUs:", gpus, flush=True)
if len([x for x in gpus.splitlines() if x.strip()]) < 2: raise RuntimeError("MiniMax Music 3 test requires two GPUs; configure Kaggle Accelerator to T4 x2.")
os.makedirs("/kaggle/temp/huggingface/hub", exist_ok=True)
os.environ["HF_HOME"]="/kaggle/temp/huggingface"; os.environ["HF_HUB_CACHE"]="/kaggle/temp/huggingface/hub"
log_path="/kaggle/temp/music3_batch.log"; log=open(log_path,"w",buffering=1)
print("Starting MiniMax Music 3 engine...", flush=True)
started=time.time()
p=subprocess.Popen(["bash","-lc",f"CUDA_VISIBLE_DEVICES=0,1 {sgl} serve --model-path MiniMaxAI/MiniMax-Music3 --port 8000"],stdout=log,stderr=subprocess.STDOUT,start_new_session=True,env=os.environ.copy())
ready=False
try:
    for i in range(240):
        r=subprocess.run(["curl","-s","-m","5","http://127.0.0.1:8000/v1/models"],capture_output=True,text=True)
        if r.returncode==0 and r.stdout:
            ready=True; print(f"SERVER READY after {i*5}s", flush=True); break
        if p.poll() is not None:
            raise RuntimeError("Music 3 server exited during startup.\n"+Path(log_path).read_text(errors="replace")[-16000:])
        if i%6==0: print(f"Still starting — {i*5}s", flush=True)
        time.sleep(5)
    if not ready: raise RuntimeError("Music 3 server did not become ready within 20 minutes.\n"+Path(log_path).read_text(errors="replace")[-16000:])
    import requests
    lyrics="""[Intro - sung, airy]
Lights up, hands high, feel that sound
V-Y-R-O, we own this round

[Verse - rhythmic rap, confident and tightly on beat]
Step in the glow, let the whole floor spark
Kick drum hits and we light up the dark
Pick your lane, keep your timing tight
One clean drop and we own the night
No copy bars, this is our own flow
Build our world in the neon glow
Crowd goes left, then the whole place right
Hit that beat and ignite the night

[Pre-Chorus - sung, melody rises]
Hold that moment, count to four
Feel the bass shake through the floor
When the lights flash, let it go
Everybody shout VYRO

[Chorus - fully sung, catchy melodic hook with layered harmonies]
We come alive in the afterglow
Hearts beat fast when the bass drops low
Hands to the sky, let the whole world know
We are the spark, we are VYRO
Oh-oh-oh, let the whole place glow
Oh-oh-oh, now lose control
One more round and we're stealing the show
We are the spark, we are VYRO

[Final Drop - sung hook over biggest drop]
We are the spark, we are VYRO
We are the spark, we are VYRO"""
    instructions="Create an ORIGINAL polished commercial-quality 45-second high-energy UK club EDM / bass-house anthem for a neon rhythm arcade called VYRO. 128 BPM, 4/4, punchy kick, crisp claps, tight hi-hats, deep controlled sub bass, bright memorable synth-pluck hook, vocal chops used only as musical accents, atmospheric 2-bar intro, rhythmic rap verse with intelligible words and confident natural rap cadence, rising melodic sung pre-chorus, then a genuinely sung catchy chorus with layered harmonies and a big euphoric bass drop. Clear contrast between rap verse and melodic singing. Modern club mix, tight groove, strong hook that listeners can hum, energetic and fun, clean master, no spoken narration, no sound effects-only track, no imitation of existing artists or songs."
    payload={"model":"MiniMaxAI/MiniMax-Music3","input":lyrics,"instructions":instructions,"seed":1001,"max_new_tokens":1100}
    print("Rendering ORIGINAL VYRO anthem with rap verse and sung chorus...", flush=True)
    render_started=time.time()
    resp=requests.post("http://127.0.0.1:8000/v1/audio/speech",json=payload,timeout=1800); resp.raise_for_status()
    if len(resp.content) < 100_000 or resp.content[:4] != b"RIFF" or resp.content[8:12] != b"WAVE":
        raise RuntimeError(f"Music 3 returned no valid WAV audio. content-type={resp.headers.get('content-type')!r}; bytes={len(resp.content)}; body={resp.content[:500]!r}")
    out="/kaggle/working/vyro_original_anthem_minimax_music3.wav"; Path(out).write_bytes(resp.content)
    import wave
    with wave.open(out, "rb") as audio:
        duration = audio.getnframes() / float(audio.getframerate())
        print(f"AUDIO_SECONDS={duration:.1f}", flush=True)
        if duration < 20: raise RuntimeError(f"Generated track is too short to be a useful anthem: {duration:.1f}s")
    print(f"RENDER_SECONDS={time.time()-render_started:.1f}", flush=True)
    print(f"TOTAL_SECONDS={time.time()-started:.1f}", flush=True)
    print(f"DONE={out}", flush=True); print(f"BYTES={len(resp.content)}", flush=True)
finally:
    print("Shutting down Music 3 engine...", flush=True)
    try: os.killpg(os.getpgid(p.pid),signal.SIGTERM); time.sleep(3)
    except Exception as e: print("TERM:",e,flush=True)
    if p.poll() is None:
        try: os.killpg(os.getpgid(p.pid),signal.SIGKILL)
        except Exception: pass
    log.close(); print("ENGINE_SHUTDOWN=TRUE", flush=True)
    if os.path.exists(log_path):
        print("=== MUSIC ENGINE FINAL LOG TAIL ===", flush=True)
        try: print(Path(log_path).read_text(errors="replace")[-24000:], flush=True)
        except Exception as e: print("Could not read engine log:", repr(e), flush=True)