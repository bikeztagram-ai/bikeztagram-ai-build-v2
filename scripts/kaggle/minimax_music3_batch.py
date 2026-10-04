import os, subprocess, sys, time, signal, shutil
from pathlib import Path

print("=== BIKEZTAGRAM / MINIMAX MUSIC 3 BATCH ===", flush=True)
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
if len([x for x in gpus.splitlines() if x.strip()]) < 2: raise RuntimeError("MiniMax Music 3 requires T4 x2 for this test.")
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
    lyrics="""[Verse]\nNeon cuts across the road\nEngine singing through the night\nCity fading in the mirrors\nChasing every line of light\n\n[Chorus]\nRide into the open dark\nChase the road and chase the light\nNo turning back, the engine calls\nWe own the road tonight"""
    instructions="Cinematic electronic rock motorcycle soundtrack, 105 BPM, D minor, deep punchy drums, pulsing bass, distorted electric guitar, atmospheric synths, dramatic build and a huge energetic chorus, polished modern production."
    payload={"model":"MiniMaxAI/MiniMax-Music3","input":lyrics,"instructions":instructions,"seed":1001,"max_new_tokens":750}
    print("Rendering real 30-second Music 3 test...", flush=True)
    render_started=time.time()
    resp=requests.post("http://127.0.0.1:8000/v1/audio/speech",json=payload,timeout=1800); resp.raise_for_status()
    out="/kaggle/working/bikeztagram_minimax_music3_test.wav"; Path(out).write_bytes(resp.content)
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