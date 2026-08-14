import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  createAIEditPlan
} from './director';

import {
  renderVideo
} from './renderer';

import {
  generateOriginalPulseMusic
} from './musicProvider';

import './styles.css';

/*
 * =========================================================
 * BIKEZTAGRAM AI
 * APP
 * =========================================================
 *
 * This file controls:
 *
 * - Video selection
 * - Vercel Blob client upload
 * - Gemini video analysis
 * - AI edit-plan generation
 * - Timeline preview
 * - Browser rendering
 * - Final video download
 *
 * IMPORTANT:
 * The upload system uses the secure /api/upload route.
 *
 * The AI analysis happens after the video has been uploaded
 * to Blob so that the server can safely process the media
 * without sending the entire video through a Vercel function
 * request.
 */

export default function App() {
  /*
   * =====================================================
   * STATE
   * =====================================================
   */

  const [file, setFile] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState('');

  const [analysis, setAnalysis] =
    useState(null);

  const [plan, setPlan] =
    useState(null);

  const [renderedVideoUrl, setRenderedVideoUrl] =
    useState('');

  const [status, setStatus] =
    useState(
      'Choose a motorcycle video to begin.'
    );

  const [loading, setLoading] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [renderProgress, setRenderProgress] =
    useState(0);

  const [currentStage, setCurrentStage] =
    useState(
      'STEP 0 — Waiting for video'
    );

  const [errorDetails, setErrorDetails] =
    useState(null);

  const [directorPrompt, setDirectorPrompt] =
    useState(
      'Create a cinematic motorcycle trailer with mystery, anticipation, reveal, action and a strong hero ending.'
    );

  const videoRef =
    useRef(null);

  /*
   * =====================================================
   * CLEAN UP OBJECT URL
   * =====================================================
   */

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(
          previewUrl
        );
      }
    };
  }, [previewUrl]);

  /*
   * =====================================================
   * CLEAN UP RENDERED URL
   * =====================================================
   */

  useEffect(() => {
    return () => {
      if (renderedVideoUrl) {
        URL.revokeObjectURL(
          renderedVideoUrl
        );
      }
    };
  }, [renderedVideoUrl]);

  /*
   * =====================================================
   * FILE SELECTION
   * =====================================================
   */

  function handleFileChange(event) {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (
      !selectedFile.type ||
      !selectedFile.type.startsWith(
        'video/'
      )
    ) {
      setStatus(
        'Please select a valid video file.'
      );

      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(
        previewUrl
      );
    }

    const nextPreviewUrl =
      URL.createObjectURL(
        selectedFile
      );

    setFile(
      selectedFile
    );

    setPreviewUrl(
      nextPreviewUrl
    );

    setAnalysis(null);
    setPlan(null);
    setRenderedVideoUrl('');
    setProgress(0);
    setRenderProgress(0);
    setErrorDetails(null);

    setCurrentStage(
      'STEP 0 — Video selected'
    );

    setStatus(
      `Ready: ${selectedFile.name}`
    );

    console.log(
      '========================================'
    );

    console.log(
      '[BIKEZTAGRAM] VIDEO SELECTED'
    );

    console.log(
      '[APP] File:',
      {
        name:
          selectedFile.name,

        type:
          selectedFile.type,

        size:
          selectedFile.size,

        sizeMB:
          (
            selectedFile.size /
            1024 /
            1024
          ).toFixed(2)
      }
    );

    console.log(
      '========================================'
    );
  }

  /*
   * =====================================================
   * DIRECTOR INPUT
   * =====================================================
   */

  function getDirectorPrompt() {
    return String(
      directorPrompt || ''
    ).trim();
  }

  /*
   * =====================================================
   * AI PLAN INPUT
   * =====================================================
   *
   * IMPORTANT FIX:
   *
   * The old version attempted to read:
   *
   *     cuts.length
   *
   * from inside the .map() which was creating `cuts`.
   *
   * That caused the production JavaScript error:
   *
   *     Cannot access 'Ge' before initialization
   *
   * `Ge` was simply the minified variable name generated
   * by Vite.
   *
   * We now use the map index instead.
   */

  function buildPlannerInput(geminiAnalysis) {
    if (!geminiAnalysis) {
      return {
        cuts: []
      };
    }

    const moments =
      Array.isArray(
        geminiAnalysis.bestMoments
      )
        ? geminiAnalysis.bestMoments
        : [];

    const recommendation =
      geminiAnalysis.editingRecommendation ||
      {};

    const textRecommendation =
      geminiAnalysis.textRecommendation ||
      {};

    const transitionRecommendation =
      geminiAnalysis.transitionRecommendation ||
      'cut';

    const motionRecommendation =
      geminiAnalysis.motionRecommendation ||
      'cinematic';

    const defaultSpeed =
      Number(
        recommendation.speed
      ) || 1;

    const slowMotion =
      Boolean(
        recommendation.slowMotion
      );

    const defaultText =
      textRecommendation.useText
        ? String(
            textRecommendation.text || ''
          ).trim()
        : '';

    const cuts =
      moments
        .map((moment, index) => {
          const start =
            Number(moment.start);

          const end =
            Number(moment.end);

          if (!Number.isFinite(start)) {
            return null;
          }

          let duration =
            end > start
              ? end - start
              : Number(
                  recommendation.suggestedDuration
                ) || 2.5;

          if (
            !Number.isFinite(duration) ||
            duration <= 0
          ) {
            duration = 2.5;
          }

          duration =
            Math.max(
              0.35,
              Math.min(
                8,
                duration
              )
            );

          let speed =
            Number.isFinite(
              defaultSpeed
            )
              ? defaultSpeed
              : 1;

          if (
            slowMotion &&
            speed >= 0.95
          ) {
            speed = 0.6;
          }

          speed =
            Math.max(
              0.25,
              Math.min(
                2.5,
                speed
              )
            );

          /*
           * IMPORTANT:
           *
           * Do NOT read cuts.length here.
           *
           * The cuts array is still being created by
           * this .map() call.
           *
           * The first Gemini moment gets the recommended
           * title overlay instead.
           */

          let text = '';

          if (
            defaultText &&
            index === 0
          ) {
            text =
              defaultText;
          }

          return {
            mediaIndex: 0,

            startTime:
              Math.max(
                0,
                start
              ),

            duration,

            speed,

            transition:
              transitionRecommendation,

            motionStyle:
              motionRecommendation,

            text
          };
        })
        .filter(Boolean);

    return {
      ...geminiAnalysis,
      cuts
    };
  }

  /*
   * =====================================================
   * CREATE AI EDIT PLAN
   * =====================================================
   */

  function createPlanFromAnalysis(
    geminiAnalysis
  ) {
    const plannerInput =
      buildPlannerInput(
        geminiAnalysis
      );

    return createAIEditPlan(
      plannerInput,
      {
        maxCuts: 8,
        targetDuration: 15
      }
    );
  }

  /*
   * =====================================================
   * ANALYSE VIDEO
   * =====================================================
   */

  async function analyseActualVideo() {
    if (!file) {
      setStatus(
        'Please choose a motorcycle video first.'
      );

      return;
    }

    if (
      !file.type ||
      !file.type.startsWith('video/')
    ) {
      setStatus(
        'Please select a valid video file.'
      );

      return;
    }

    setLoading(true);
    setAnalysis(null);
    setPlan(null);
    setRenderedVideoUrl('');
    setProgress(0);
    setRenderProgress(0);
    setErrorDetails(null);

    setCurrentStage(
      'STEP 1 — Preparing secure Blob upload'
    );

    try {
      /*
       * =====================================================
       * STEP 1
       * PREPARE VERCEL BLOB CLIENT UPLOAD
       * =====================================================
       */

      setCurrentStage(
        'STEP 1 — Preparing secure Blob upload'
      );

      setStatus(
        'Preparing secure video upload...'
      );

      const safeFileName =
        file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          '_'
        );

      const pathname =
        `videos/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

      console.log(
        '========================================'
      );

      console.log(
        '[BIKEZTAGRAM] STARTING BLOB UPLOAD'
      );

      console.log(
        '[APP] Browser:',
        navigator.userAgent
      );

      console.log(
        '[APP] Online:',
        navigator.onLine
      );

      console.log(
        '[APP] Blob pathname:',
        pathname
      );

      console.log(
        '[APP] File:',
        {
          name:
            file.name,

          type:
            file.type,

          size:
            file.size,

          sizeMB:
            (
              file.size /
              1024 /
              1024
            ).toFixed(2)
        }
      );

      console.log(
        '[APP] Blob handleUploadUrl:',
        '/api/upload'
      );

      console.log(
        '========================================'
      );

      /*
       * Dynamic import keeps the initial application
       * bundle smaller and ensures the upload SDK is
       * loaded only when needed.
       */

      const {
        upload
      } = await import(
        '@vercel/blob/client'
      );

      /*
       * =====================================================
       * STEP 1B
       * UPLOAD TO PUBLIC BLOB STORE
       * =====================================================
       */

      setStatus(
        'Uploading video securely...'
      );

      setCurrentStage(
        'STEP 2 — Uploading video to secure Blob storage'
      );

      const blob =
        await upload(
          pathname,
          file,
          {
            access:
              'public',

            handleUploadUrl:
              '/api/upload',

            multipart:
              file.size >
              5 *
                1024 *
                1024,

            onUploadProgress:
              (event) => {
                const percentage =
                  Number(
                    event?.percentage
                  );

                if (
                  Number.isFinite(
                    percentage
                  )
                ) {
                  setProgress(
                    Math.round(
                      percentage
                    )
                  );
                }
              }
          }
        );

      console.log(
        '========================================'
      );

      console.log(
        '[BIKEZTAGRAM] BLOB UPLOAD COMPLETE'
      );

      console.log(
        '[APP] Blob:',
        blob
      );

      console.log(
        '[APP] Blob URL:',
        blob?.url
      );

      console.log(
        '[APP] Blob pathname:',
        blob?.pathname
      );

      console.log(
        '========================================'
      );

      if (!blob?.url) {
        throw new Error(
          'Vercel Blob upload completed but returned no Blob URL.'
        );
      }

      setProgress(100);

      /*
       * =====================================================
       * STEP 3
       * SEND BLOB URL TO ANALYSIS API
       * =====================================================
       */

      setCurrentStage(
        'STEP 3 — Sending video to AI analysis'
      );

      setStatus(
        'Video uploaded. Preparing AI analysis...'
      );

      console.log(
        '[BIKEZTAGRAM] Sending Blob URL to /api/analyse'
      );

      const analysisResponse =
        await fetch(
          '/api/analyse',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify({
                url:
                  blob.url,

                pathname:
                  blob.pathname,

                filename:
                  file.name,

                fileType:
                  file.type,

                fileSize:
                  file.size,

                directorPrompt:
                  getDirectorPrompt()
              })
          }
        );

      const analysisText =
        await analysisResponse.text();

      let analysisData = null;

      try {
        analysisData =
          analysisText
            ? JSON.parse(
                analysisText
              )
            : null;
      } catch {
        analysisData = {
          raw:
            analysisText
        };
      }

      console.log(
        '[BIKEZTAGRAM] /api/analyse status:',
        analysisResponse.status
      );

      console.log(
        '[BIKEZTAGRAM] /api/analyse response:',
        analysisData
      );

      if (
        !analysisResponse.ok
      ) {
        throw new Error(
          analysisData?.error ||
          analysisData?.message ||
          `AI analysis failed with status ${analysisResponse.status}`
        );
      }

      /*
       * =====================================================
       * STEP 4
       * STORE GEMINI ANALYSIS
       * =====================================================
       */

      setCurrentStage(
        'STEP 4 — Reading AI video analysis'
      );

      setStatus(
        'AI analysis complete. Building edit plan...'
      );

      const geminiAnalysis =
        analysisData?.analysis ||
        analysisData?.result ||
        analysisData;

      if (!geminiAnalysis) {
        throw new Error(
          'AI analysis returned no usable analysis data.'
        );
      }

      setAnalysis(
        geminiAnalysis
      );

      console.log(
        '[BIKEZTAGRAM] Gemini analysis:',
        geminiAnalysis
      );

      /*
       * =====================================================
       * STEP 5
       * BUILD AI EDIT PLAN
       * =====================================================
       */

      setCurrentStage(
        'STEP 5 — Building AI edit plan'
      );

      setStatus(
        'Building cinematic AI edit plan...'
      );

      /*
       * The previous crash occurred here because
       * buildPlannerInput() referenced cuts.length
       * while cuts itself was still being constructed.
       *
       * That bug has now been fixed.
       */

      const generatedPlan =
        createPlanFromAnalysis(
          geminiAnalysis
        );

      if (
        !generatedPlan
      ) {
        throw new Error(
          'AI edit-plan engine returned no plan.'
        );
      }

      if (
        !Array.isArray(
          generatedPlan.cuts
        ) ||
        generatedPlan.cuts.length === 0
      ) {
        throw new Error(
          'AI edit-plan engine returned no usable cuts.'
        );
      }

      setPlan(
        generatedPlan
      );

      console.log(
        '========================================'
      );

      console.log(
        '[BIKEZTAGRAM] AI EDIT PLAN CREATED'
      );

      console.log(
        '[APP] Plan:',
        generatedPlan
      );

      console.log(
        '[APP] Cut count:',
        generatedPlan.cuts.length
      );

      console.log(
        '========================================'
      );

      /*
       * =====================================================
       * STEP 6
       * READY FOR RENDER
       * =====================================================
       */

      setCurrentStage(
        'STEP 6 — AI edit plan ready'
      );

      setStatus(
        `AI edit plan ready — ${generatedPlan.cuts.length} cinematic cut${generatedPlan.cuts.length === 1 ? '' : 's'} selected.`
      );

    } catch (error) {
      console.error(
        '========================================'
      );

      console.error(
        '[BIKEZTAGRAM] VIDEO WORKFLOW ERROR'
      );

      console.error(
        'Error:',
        error
      );

      console.error(
        'Message:',
        error?.message
      );

      console.error(
        'Name:',
        error?.name
      );

      console.error(
        'Stack:',
        error?.stack
      );

      console.error(
        '========================================'
      );

      const details = {
        bikeztagram:
          'BIKEZTAGRAM AI',

        time:
          new Date().toISOString(),

        currentStage,

        status:
          `❌ ERROR — ${
            error?.message ||
            'Unknown error'
          }`,

        file: {
          name:
            file?.name ||
            null,

          type:
            file?.type ||
            null,

          sizeBytes:
            file?.size ||
            null,

          sizeMB:
            file?.size
              ? (
                  file.size /
                  1024 /
                  1024
                ).toFixed(2)
              : null
        },

        analysis:
          analysis,

        plan:
          plan,

        error: {
          time:
            new Date().toISOString(),

          stage:
            currentStage,

          message:
            error?.message ||
            String(error),

          name:
            error?.name ||
            'Error',

          stack:
            error?.stack ||
            null
        },

        browser: {
          userAgent:
            navigator.userAgent,

          online:
            navigator.onLine,

          url:
            window.location.href
        },

        file: {
          name:
            file?.name ||
            null,

          type:
            file?.type ||
            null,

          sizeBytes:
            file?.size ||
            null,

          sizeMB:
            file?.size
              ? (
                  file.size /
                  1024 /
                  1024
                ).toFixed(2)
              : null
        }
      };

      setErrorDetails(
        details
      );

      setStatus(
        `❌ ERROR — ${
          error?.message ||
          'Something went wrong.'
        }`
      );

      setCurrentStage(
        'ERROR — Workflow stopped'
      );

    } finally {
      setLoading(
        false
      );
    }
  }

  /*
   * =====================================================
   * RENDER VIDEO
   * =====================================================
   */

  async function handleRender() {
    if (!file) {
      setStatus(
        'Choose a video first.'
      );

      return;
    }

    if (
      !plan ||
      !Array.isArray(
        plan.cuts
      ) ||
      plan.cuts.length === 0
    ) {
      setStatus(
        'No AI edit plan is available yet. Analyse the video first.'
      );

      return;
    }

    setLoading(true);
    setRenderProgress(0);
    setErrorDetails(null);

    setCurrentStage(
      'STEP 7 — Rendering cinematic video'
    );

    setStatus(
      'Rendering cinematic edit...'
    );

    try {
      console.log(
        '========================================'
      );

      console.log(
        '[BIKEZTAGRAM] STARTING RENDER'
      );

      console.log(
        '[APP] Plan:',
        plan
      );

      console.log(
        '========================================'
      );

      /*
       * Generate an original procedural music bed.
       *
       * No copyrighted music is downloaded.
       */

      let musicBlob =
        null;

      try {
        setStatus(
          'Creating original cinematic pulse...'
        );

        musicBlob =
          await generateOriginalPulseMusic(
            15
          );

        console.log(
          '[APP] Original music generated:',
          musicBlob
        );

      } catch (musicError) {
        console.warn(
          '[APP] Music generation failed; continuing without music:',
          musicError
        );
      }

      /*
       * =====================================================
       * RENDER
       * =====================================================
       */

      const result =
        await renderVideo(
          file,
          plan,
          {
            musicBlob,

            onProgress:
              (value) => {
                const percentage =
                  Number(
                    value
                  );

                if (
                  Number.isFinite(
                    percentage
                  )
                ) {
                  setRenderProgress(
                    Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(
                          percentage
                        )
                      )
                    )
                  );
                }
              }
          }
        );

      console.log(
        '[BIKEZTAGRAM] RENDER RESULT:',
        result
      );

      const outputBlob =
        result?.blob ||
        result;

      if (!outputBlob) {
        throw new Error(
          'Renderer returned no video.'
        );
      }

      const outputUrl =
        URL.createObjectURL(
          outputBlob
        );

      setRenderedVideoUrl(
        outputUrl
      );

      setRenderProgress(
        100
      );

      setCurrentStage(
        'STEP 8 — Render complete'
      );

      setStatus(
        '✅ Cinematic video rendered successfully.'
      );

    } catch (error) {
      console.error(
        '========================================'
      );

      console.error(
        '[BIKEZTAGRAM] RENDER ERROR'
      );

      console.error(
        error
      );

      console.error(
        '========================================'
      );

      const details = {
        bikeztagram:
          'BIKEZTAGRAM AI',

        time:
          new Date().toISOString(),

        currentStage,

        status:
          `❌ ERROR — ${
            error?.message ||
            'Render failed'
          }`,

        file: {
          name:
            file?.name ||
            null,

          type:
            file?.type ||
            null,

          sizeBytes:
            file?.size ||
            null,

          sizeMB:
            file?.size
              ? (
                  file.size /
                  1024 /
                  1024
                ).toFixed(2)
              : null
        },

        analysis,

        plan,

        error: {
          time:
            new Date().toISOString(),

          stage:
            currentStage,

          message:
            error?.message ||
            String(error),

          name:
            error?.name ||
            'Error',

          stack:
            error?.stack ||
            null
        },

        browser: {
          userAgent:
            navigator.userAgent,

          online:
            navigator.onLine,

          url:
            window.location.href
        }
      };

      setErrorDetails(
        details
      );

      setStatus(
        `❌ ERROR — ${
          error?.message ||
          'Render failed.'
        }`
      );

      setCurrentStage(
        'ERROR — Render stopped'
      );

    } finally {
      setLoading(
        false
      );
    }
  }

  /*
   * =====================================================
   * DOWNLOAD RENDERED VIDEO
   * =====================================================
   */

  function downloadRenderedVideo() {
    if (!renderedVideoUrl) {
      return;
    }

    const anchor =
      document.createElement(
        'a'
      );

    anchor.href =
      renderedVideoUrl;

    anchor.download =
      'bikeztagram-cinematic-edit.webm';

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();
  }

  /*
   * =====================================================
   * COPY DIAGNOSTICS
   * =====================================================
   */

  async function copyDiagnostics() {
    if (!errorDetails) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          errorDetails,
          null,
          2
        )
      );

      setStatus(
        '✅ Complete diagnostic information copied to clipboard.'
      );

    } catch (error) {
      console.error(
        'Could not copy diagnostics:',
        error
      );

      setStatus(
        'Could not copy diagnostics automatically.'
      );
    }
  }

  /*
   * =====================================================
   * ANALYSIS SUMMARY
   * =====================================================
   */

  const analysisSummary =
    useMemo(() => {
      if (!analysis) {
        return null;
      }

      return {
        filename:
          analysis.filename ||
          file?.name ||
          'Unknown',

        duration:
          analysis.durationSeconds,

        model:
          analysis.subject
            ?.motorcycleModel ||
          'Motorcycle',

        shot:
          analysis.shot
            ?.type ||
          'Unknown',

        movement:
          analysis.shot
            ?.cameraMovement ||
          'Unknown',

        score:
          analysis.cinematicScore,

        action:
          analysis.action,

        recommendation:
          analysis.editingRecommendation
      };
    }, [
      analysis,
      file
    ]);

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <main className="app-shell">

      <section className="hero">

        <div className="hero-copy">

          <div className="eyebrow">
            BIKEZTAGRAM AI
          </div>

          <h1>
            Turn motorcycle footage
            into cinematic edits.
          </h1>

          <p>
            Upload your footage and let
            the AI director analyse the
            strongest moments, build a
            story and prepare a cinematic
            edit.
          </p>

        </div>

      </section>

      <section className="panel">

        <div className="panel-heading">

          <div>

            <div className="eyebrow">
              VIDEO INPUT
            </div>

            <h2>
              Choose your footage
            </h2>

          </div>

        </div>

        <label
          className="upload-box"
        >

          <input
            type="file"
            accept="video/*"
            onChange={
              handleFileChange
            }
            disabled={
              loading
            }
          />

          <span>
            Choose motorcycle video
          </span>

          <small>
            MP4, MOV or WebM
          </small>

        </label>

        {file && (
          <div className="file-card">

            <strong>
              {file.name}
            </strong>

            <span>
              {(
                file.size /
                1024 /
                1024
              ).toFixed(2)}
              {' '}
              MB
            </span>

          </div>
        )}

      </section>

      <section className="panel">

        <div className="panel-heading">

          <div>

            <div className="eyebrow">
              AI DIRECTOR
            </div>

            <h2>
              Tell the director what
              you want
            </h2>

          </div>

        </div>

        <textarea
          value={
            directorPrompt
          }
          onChange={
            (event) =>
              setDirectorPrompt(
                event.target.value
              )
          }
          disabled={
            loading
          }
          rows={5}
          placeholder="Describe the cinematic edit you want..."
        />

      </section>

      {previewUrl && (
        <section className="panel">

          <div className="panel-heading">

            <div>

              <div className="eyebrow">
                SOURCE
              </div>

              <h2>
                Original footage
              </h2>

            </div>

          </div>

          <video
            ref={
              videoRef
            }
            src={
              previewUrl
            }
            controls
            playsInline
            className="video-preview"
          />

        </section>
      )}

      <section className="panel">

        <div className="stage-card">

          <div className="stage-label">
            CURRENT STAGE
          </div>

          <div className="stage-title">
            {currentStage}
          </div>

          <div className="status">
            {status}
          </div>

          {progress > 0 &&
            progress < 100 && (
              <div className="progress-wrap">

                <div className="progress-label">
                  Upload:
                  {' '}
                  {progress}%
                </div>

                <div className="progress-track">

                  <div
                    className="progress-fill"
                    style={{
                      width:
                        `${progress}%`
                    }}
                  />

                </div>

              </div>
            )}

          {renderProgress > 0 &&
            renderProgress < 100 && (
              <div className="progress-wrap">

                <div className="progress-label">
                  Render:
                  {' '}
                  {renderProgress}%
                </div>

                <div className="progress-track">

                  <div
                    className="progress-fill"
                    style={{
                      width:
                        `${renderProgress}%`
                    }}
                  />

                </div>

              </div>
            )}

        </div>

      </section>

      <section className="actions">

        <button
          type="button"
          className="primary-button"
          onClick={
            analyseActualVideo
          }
          disabled={
            loading ||
            !file
          }
        >
          {loading
            ? 'Working...'
            : 'ANALYSE & BUILD AI EDIT'}
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={
            handleRender
          }
          disabled={
            loading ||
            !plan
          }
        >
          RENDER CINEMATIC VIDEO
        </button>

      </section>

      {analysisSummary && (
        <section className="panel">

          <div className="panel-heading">

            <div>

              <div className="eyebrow">
                AI ANALYSIS
              </div>

              <h2>
                What the director saw
              </h2>

            </div>

          </div>

          <div className="analysis-grid">

            <div className="analysis-card">

              <span>
                Motorcycle
              </span>

              <strong>
                {analysisSummary.model}
              </strong>

            </div>

            <div className="analysis-card">

              <span>
                Duration
              </span>

              <strong>
                {analysisSummary.duration}
                s
              </strong>

            </div>

            <div className="analysis-card">

              <span>
                Cinematic score
              </span>

              <strong>
                {analysisSummary.score ??
                  '—'}
              </strong>

            </div>

            <div className="analysis-card">

              <span>
                Shot
              </span>

              <strong>
                {analysisSummary.shot}
              </strong>

            </div>

          </div>

          {analysisSummary.action && (
            <div className="analysis-description">

              <strong>
                Action
              </strong>

              <p>
                {analysisSummary.action}
              </p>

            </div>
          )}

          {analysisSummary.recommendation
            ?.reason && (
            <div className="analysis-description">

              <strong>
                AI recommendation
              </strong>

              <p>
                {
                  analysisSummary
                    .recommendation
                    .reason
                }
              </p>

            </div>
          )}

        </section>
      )}

      {plan && (
        <section className="panel">

          <div className="panel-heading">

            <div>

              <div className="eyebrow">
                EDIT PLAN
              </div>

              <h2>
                Cinematic sequence
              </h2>

            </div>

          </div>

          <div className="timeline">

            {plan.cuts.map(
              (cut, index) => (
                <div
                  className="timeline-card"
                  key={
                    `${index}-${cut.startTime}-${cut.duration}`
                  }
                >

                  <div className="timeline-number">
                    {String(
                      index + 1
                    ).padStart(
                      2,
                      '0'
                    )}
                  </div>

                  <div className="timeline-content">

                    <strong>
                      Shot {index + 1}
                    </strong>

                    <span>
                      Start:
                      {' '}
                      {Number(
                        cut.startTime ||
                        0
                      ).toFixed(2)}
                      s
                    </span>

                    <span>
                      Duration:
                      {' '}
                      {Number(
                        cut.duration ||
                        0
                      ).toFixed(2)}
                      s
                    </span>

                    <span>
                      Speed:
                      {' '}
                      {Number(
                        cut.speed ||
                        1
                      ).toFixed(2)}
                      x
                    </span>

                    {cut.transition && (
                      <span>
                        Transition:
                        {' '}
                        {cut.transition}
                      </span>
                    )}

                    {cut.motionStyle && (
                      <span>
                        Motion:
                        {' '}
                        {cut.motionStyle}
                      </span>
                    )}

                    {cut.text && (
                      <span>
                        Text:
                        {' '}
                        {cut.text}
                      </span>
                    )}

                  </div>

                </div>
              )
            )}

          </div>

        </section>
      )}

      {renderedVideoUrl && (
        <section className="panel">

          <div className="panel-heading">

            <div>

              <div className="eyebrow">
                FINISHED EDIT
              </div>

              <h2>
                Your cinematic video
              </h2>

            </div>

          </div>

          <video
            src={
              renderedVideoUrl
            }
            controls
            playsInline
            className="video-preview"
          />

          <button
            type="button"
            className="primary-button"
            onClick={
              downloadRenderedVideo
            }
          >
            DOWNLOAD VIDEO
          </button>

        </section>
      )}

      {errorDetails && (
        <section className="panel error-panel">

          <div className="panel-heading">

            <div>

              <div className="eyebrow">
                DIAGNOSTICS
              </div>

              <h2>
                Something went wrong
              </h2>

            </div>

          </div>

          <pre className="diagnostic-output">
            {JSON.stringify(
              errorDetails,
              null,
              2
            )}
          </pre>

          <button
            type="button"
            className="secondary-button"
            onClick={
              copyDiagnostics
            }
          >
            COPY DIAGNOSTICS
          </button>

        </section>
      )}

    </main>
  );
}
