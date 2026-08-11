  const handleGenerate = async () => {
    if (files.length === 0) {
      setStatus('Please upload at least one image or video clip.');
      return;
    }

    setIsProcessing(true);
    setStatus('Analyzing prompt with AI Director...');
    setProgress(0);
    setVideoUrl(null);

    let editPlan = null;

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          mediaFilesCount: files.length
        })
      });

      const data = await res.json();
      if (data.success && data.plan) {
        editPlan = data.plan;
      }
    } catch (err) {
      console.warn('Backend API missed, using local director fallback:', err);
    }

    // Fallback Edit Plan if backend isn't reachable
    if (!editPlan || !editPlan.cuts) {
      editPlan = {
        cuts: files.map((_, i) => ({
          mediaIndex: i,
          duration: 15 / files.length,
          transition: i % 2 === 0 ? 'whip-left' : 'flash-cut',
          motionStyle: i % 2 === 0 ? 'zoom-in' : 'pan-right'
        })),
        colorGrade: 'moody-blue',
        textOverlay: 'NINJA 1000SX'
      };
    }

    try {
      setStatus('Rendering reel with motion effects & color grading...');
      const mediaItems = files.map((file, index) => ({ id: index, file, type: file.type }));
      const videoBlob = await renderProject(mediaItems, editPlan, (p) => setProgress(p));
      const url = URL.createObjectURL(videoBlob);
      setVideoUrl(url);
      setStatus('Render complete!');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };
