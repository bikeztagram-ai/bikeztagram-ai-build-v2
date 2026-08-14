import React, { useState } from 'react';
import { upload } from '@vercel/blob/client';
import {
  createAIEditPlan,
  describeAIEditPlan
} from './aiEditPlanner.js';
import { renderProject } from './renderer.js';
import './styles.css';

export default function App() {
  const [file, setFile] = useState(null);

  const [prompt, setPrompt] = useState(
    'Analyse this motorcycle footage for the strongest cinematic moments, camera movement, action, composition and best timestamps for an exciting social-media motorcycle video.'
  );

  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);

  const [analysis, setAnalysis] = useState(null);
  const [plan, setPlan] = useState(null);

  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);

  const [renderProgress, setRenderProgress] =
    useState(0);

  const [renderedVideoUrl, setRenderedVideoUrl] =
    useState('');

  const [errorDetails, setErrorDetails] =
    useState(null);

  const [currentStage, setCurrentStage] =
    useState('');

  function handleFileChange(event) {
    const selectedFile =
      event.target.files?.[0] || null;

    setFile(selectedFile);
    setAnalysis(null);
    setPlan(null);
    setRenderedVideoUrl('');
    setProgress(0);
    setRenderProgress(0);
    setErrorDetails(null);
    setCurrentStage('');

    if (selectedFile) {
      const sizeMB =
        selectedFile.size / 1024 / 1024;

      setStatus(
        `Selected: ${selectedFile.name} (${sizeMB.toFixed(
          1
        )} MB)`
      );
    } else {
      setStatus('');
    }
  }

  function makeErrorDetails(
    error,
    stage
  ) {
    const details = {
      time: new Date().toISOString(),

      stage,

      message:
        error?.message ||
        'Unknown error',

      name:
        error?.name ||
        'UnknownError',

      stack:
        error?.stack ||
        'No stack trace available',

      errorType:
        typeof error,

      errorConstructor:
        error?.constructor?.name ||
        'Unknown',

      cause:
        error?.cause
          ? String(error.cause)
          : null,

      errorProperties: {}
    };

    try {
      if (error) {
        Object.getOwnPropertyNames(
          error
        ).forEach((property) => {
          try {
            const value =
              error[property];

            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean' ||
              value === null
            ) {
              details.errorProperties[
                property
              ] = value;
            } else {
              try {
                details.errorProperties[
                  property
                ] = JSON.parse(
                  JSON.stringify(value)
                );
              } catch {
                details.errorProperties[
                  property
                ] = String(value);
              }
            }
          } catch {
            details.errorProperties[
              property
            ] =
              '[Unable to read property]';
          }
        });
      }
    } catch (propertyError) {
      details.errorPropertiesError =
        String(propertyError);
    }

    if (file) {
      details.file = {
        name: file.name,
        type: file.type,
        sizeBytes: file.size,
        sizeMB: (
          file.size /
          1024 /
          1024
        ).toFixed(2)
      };
    }

    return details;
  }

  function getErrorText() {
    if (!errorDetails) {
      return '';
    }

    return JSON.stringify(
      errorDetails,
      null,
      2
    );
  }

  async function copyErrorDetails() {
    const text =
      getErrorText();

    if (!text) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        text
      );

      setStatus(
        '✅ Full error details copied to clipboard.'
      );
    } catch (copyError) {
      setStatus(
        'Could not copy automatically. Long-press the error text and copy it manually.'
      );

      console.error(
        '[APP] Clipboard copy failed:',
        copyError
      );
    }
  }

  async function copyEverything() {
    const everything = {
      bikeztagram:
        'BIKEZTAGRAM AI',

      time:
        new Date().toISOString(),

      currentStage,

      status,

      file: file
        ? {
            name: file.name,
            type: file.type,
            sizeBytes: file.size,
            sizeMB: (
              file.size /
              1024 /
              1024
            ).toFixed(2)
          }
        : null,

      analysis,

      plan,

      error:
        errorDetails,

      browser: {
        userAgent:
          navigator.userAgent,

        url:
          window.location.href,

        online:
          navigator.onLine
      }
    };

    const text =
      JSON.stringify(
        everything,
        null,
        2
      );

    try {
      await navigator.clipboard.writeText(
        text
      );

      setStatus(
        '✅ Complete diagnostic information copied to clipboard.'
      );
    } catch (copyError) {
      setStatus(
        'Could not copy automatically. Long-press the diagnostic text and copy it manually.'
      );

      console.error(
        '[APP] Clipboard copy failed:',
        copyError
      );
    }
  }

  function clearError() {
    setErrorDetails(null);
    setCurrentStage('');
    setStatus('');
  }

  /*
   * =====================================================
   * GEMINI ANALYSIS → AI EDIT PLAN
   * =====================================================
   */

  function buildPlannerInput(
    geminiAnalysis
  ) {
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
            textRecommendation.text ||
              ''
          ).trim()
        : '';

    const cuts =
      moments
        .map((moment) => {
          const start =
            Number(moment.start);

          const end =
            Number(moment.end);

          let duration =
            end > start
              ? end - start
              : Number(
                  recommendation.suggestedDuration
                ) || 2.5;

          if (
            !Number.isFinite(start)
          ) {
            return null;
          }

          if (
            !Number.isFinite(
              duration
            ) ||
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

          let text = '';

          if (
            defaultText &&
            cuts.length === 0
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
   * ANALYSE ACTUAL VIDEO
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
      !file.type.startsWith(
        'video/'
      )
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
    setCurrentStage('');

    try {
      /*
       * =====================================================
       * STEP 1
       * BROWSER → VERCEL BLOB
       *
       * IMPORTANT:
       *
       * We are deliberately testing this 24 MB file
       * WITHOUT multipart.
       *
       * Vercel recommends multipart primarily for large
       * files such as files over 100 MB.
       *
       * This lets us isolate whether multipart was the
       * cause of the browser network error.
       * =====================================================
       */

      setCurrentStage(
        'STEP 1 — Preparing Blob upload'
      );

      setStatus(
        'Preparing direct Blob upload...'
      );

      const pathname =
        `videos/${Date.now()}-${crypto.randomUUID()}-${file.name}`;

      console.log(
        '========================================'
      );

      console.log(
        '[APP] BIKEZTAGRAM BLOB UPLOAD TEST'
      );

      console.log(
        '[APP] File name:',
        file.name
      );

      console.log(
        '[APP] File type:',
        file.type
      );

      console.log(
        '[APP] File size:',
        file.size
      );

      console.log(
        '[APP] File size MB:',
        (
          file.size /
          1024 /
          1024
        ).toFixed(2)
      );

      console.log(
        '[APP] Browser online:',
        navigator.onLine
      );

      console.log(
        '[APP] Upload URL:',
        '/api/upload'
      );

      console.log(
        '[APP] Multipart:',
        false
      );

      console.log(
        '[APP] Requested pathname:',
        pathname
      );

      console.log(
        '========================================'
      );

      setCurrentStage(
        'STEP 1 — Uploading video directly to Blob'
      );

      setStatus(
        'Uploading video to Blob storage... 0%'
      );

      /*
       * IMPORTANT:
       *
       * multipart is intentionally FALSE here.
       *
       * Your test file is approximately 24 MB.
       */

      const uploadStartedAt =
        Date.now();

      let lastProgress =
        -1;

      const blob =
        await upload(
          pathname,
          file,
          {
            access:
              'public',

            handleUploadUrl:
              '/api/upload',

            /*
             * IMPORTANT TEST:
             *
             * Do NOT use multipart for this
             * 24 MB diagnostic upload.
             */
            multipart:
              false,

            contentType:
              file.type ||
              'video/mp4',

            clientPayload:
              JSON.stringify({
                source:
                  'bikeztagram-ai',

                filename:
                  file.name,

                mimeType:
                  file.type ||
                  'video/mp4',

                size:
                  file.size,

                diagnostic:
                  'blob-upload-test-v2'
              }),

            onUploadProgress:
              (event) => {
                const percentage =
                  Number(
                    event?.percentage
                  );

                const loaded =
                  Number(
                    event?.loaded
                  ) || 0;

                const total =
                  Number(
                    event?.total
                  ) || file.size;

                if (
                  Number.isFinite(
                    percentage
                  )
                ) {
                  const safePercentage =
                    Math.max(
                      0,
                      Math.min(
                        100,
                        Math.round(
                          percentage
                        )
                      )
                    );

                  setProgress(
                    safePercentage
                  );

                  if (
                    safePercentage !==
                    lastProgress
                  ) {
                    lastProgress =
                      safePercentage;

                    console.log(
                      '[APP] Blob upload progress:',
                      {
                        percentage:
                          safePercentage,
                        loaded,
                        total,
                        elapsedMs:
                          Date.now() -
                          uploadStartedAt
                      }
                    );
                  }

                  setStatus(
                    `Uploading video to Blob storage... ${safePercentage}%`
                  );
                }
              }
          }
        );

      /*
       * =====================================================
       * STEP 2
       * BLOB UPLOAD COMPLETED
       * =====================================================
       */

      setCurrentStage(
        'STEP 2 — Blob upload completed'
      );

      console.log(
        '========================================'
      );

      console.log(
        '[APP] BLOB UPLOAD SUCCESS'
      );

      console.log(
        '[APP] Blob result:',
        blob
      );

      console.log(
        '[APP] Blob pathname:',
        blob?.pathname
      );

      console.log(
        '[APP] Blob URL:',
        blob?.url
      );

      console.log(
        '[APP] Blob content type:',
        blob?.contentType
      );

      console.log(
        '[APP] Blob upload elapsed:',
        Date.now() -
          uploadStartedAt,
        'ms'
      );

      console.log(
        '========================================'
      );

      if (!blob) {
        throw new Error(
          'Vercel Blob did not return an upload result.'
        );
      }

      if (!blob.pathname) {
        throw new Error(
          'Vercel Blob upload completed but returned no pathname.'
        );
      }

      if (!blob.url) {
        throw new Error(
          'Vercel Blob upload completed but returned no URL.'
        );
      }

      setProgress(100);

      setStatus(
        '✅ Video successfully stored in Blob. Preparing Gemini analysis...'
      );

      /*
       * =====================================================
       * STEP 3
       * SEND BLOB URL TO GEMINI ANALYSIS API
       * =====================================================
       */

      setCurrentStage(
        'STEP 3 — Sending Blob video URL to /api/analyse'
      );

      console.log(
        '[APP] Sending Blob URL to /api/analyse:',
        blob.url
      );

      console.log(
        '[APP] Sending Blob pathname to /api/analyse:',
        blob.pathname
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
                videoUrl:
                  blob.url,

                pathname:
                  blob.pathname,

                filename:
                  file.name,

                mimeType:
                  file.type ||
                  'video/mp4',

                prompt
              })
          }
        );

      const analysisText =
        await analysisResponse.text();

      let analysisData;

      try {
        analysisData =
          JSON.parse(
            analysisText
          );
      } catch {
        throw new Error(
          `Analysis server returned invalid JSON: ${analysisText.slice(
            0,
            1000
          )}`
        );
      }

      if (
        !analysisResponse.ok
      ) {
        throw new Error(
          analysisData?.error ||
            `Analysis server returned HTTP ${analysisResponse.status}`
        );
      }

      if (
        !analysisData?.analysis
      ) {
        throw new Error(
          'Gemini returned no analysis.'
        );
      }

      /*
       * =====================================================
       * STEP 4
       * GEMINI ANALYSIS COMPLETE
       * =====================================================
       */

      setCurrentStage(
        'STEP 4 — Gemini analysis completed'
      );

      setAnalysis(
        analysisData.analysis
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

      const generatedPlan =
        createPlanFromAnalysis(
          analysisData.analysis
        );

      setPlan(
        generatedPlan
      );

      console.log(
        '[APP] AI edit plan created:',
        generatedPlan
      );

      setStatus(
        `✅ Gemini analysed the actual video. ${describeAIEditPlan(
          generatedPlan
        )}`
      );

    } catch (error) {
      const details =
        makeErrorDetails(
          error,
          currentStage ||
            'Unknown stage'
        );

      console.error(
        '========================================'
      );

      console.error(
        '[APP] BIKEZTAGRAM FULL ERROR'
      );

      console.error(
        JSON.stringify(
          details,
          null,
          2
        )
      );

      console.error(
        '[APP] Original error:',
        error
      );

      console.error(
        '========================================'
      );

      setErrorDetails(
        details
      );

      setStatus(
        `❌ ERROR — ${details.message}`
      );

    } finally {
      setLoading(false);
    }
  }

  /*
   * =====================================================
   * BUILD FINAL AI VIDEO
   * =====================================================
   */

  async function buildAIEdit() {
    if (!file) {
      setStatus(
        'Please choose a video first.'
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

    setRendering(true);
    setRenderProgress(0);
    setErrorDetails(null);

    try {
      setCurrentStage(
        'STEP 6 — Rendering AI-directed video'
      );

      setStatus(
        '🎬 Building your AI-directed cinematic edit...'
      );

      const mediaItems = [
        {
          id:
            'video-0',

          file,

          name:
            file.name,

          type:
            file.type ||
            'video/mp4'
        }
      ];

      console.log(
        '[APP] Starting renderer.'
      );

      console.log(
        '[APP] Media items:',
        mediaItems
      );

      console.log(
        '[APP] AI plan:',
        plan
      );

      const outputBlob =
        await renderProject(
          mediaItems,
          plan,
          (percentage) => {
            const safePercentage =
              Math.max(
                0,
                Math.min(
                  100,
                  Number(
                    percentage
                  ) || 0
                )
              );

            setRenderProgress(
              safePercentage
            );

            setStatus(
              `🎬 Rendering AI edit... ${safePercentage}%`
            );
          }
        );

      if (!outputBlob) {
        throw new Error(
          'Renderer returned no video.'
        );
      }

      if (
        !(outputBlob instanceof Blob) ||
        outputBlob.size === 0
      ) {
        throw new Error(
          'Renderer completed but produced an empty video file.'
        );
      }

      const videoUrl =
        URL.createObjectURL(
          outputBlob
        );

      setRenderedVideoUrl(
        videoUrl
      );

      setRenderProgress(
        100
      );

      setCurrentStage(
        'STEP 7 — AI edit completed'
      );

      setStatus(
        `✅ AI edit completed successfully — ${(
          outputBlob.size /
          1024 /
          1024
        ).toFixed(2)} MB`
      );

      console.log(
        '[APP] Final rendered video:',
        {
          type:
            outputBlob.type,

          size:
            outputBlob.size
        }
      );

    } catch (error) {
      const details =
        makeErrorDetails(
          error,
          currentStage ||
            'AI render error'
        );

      console.error(
        '[APP] AI RENDER ERROR:',
        details
      );

      setErrorDetails(
        details
      );

      setStatus(
        `❌ RENDER ERROR — ${details.message}`
      );

    } finally {
      setRendering(false);
    }
  }

  function clearVideo() {
    if (
      renderedVideoUrl
    ) {
      try {
        URL.revokeObjectURL(
          renderedVideoUrl
        );
      } catch {}
    }

    setFile(null);
    setAnalysis(null);
    setPlan(null);
    setStatus('');
    setProgress(0);
    setRenderProgress(0);
    setRenderedVideoUrl('');
    setErrorDetails(null);
    setCurrentStage('');
  }

  return (
    <div className="app-container">

      <header className="app-header">
        <div>
          <h1>
            BIKEZTAGRAM AI
          </h1>

          <p>
            AI-powered motorcycle video editor
          </p>
        </div>
      </header>

      <main>

        <section className="form-group">

          <label htmlFor="video-file">
            Test motorcycle footage
          </label>

          <input
            id="video-file"
            type="file"
            accept="video/*"
            onChange={
              handleFileChange
            }
            disabled={
              loading ||
              rendering
            }
          />

          {file && (
            <p className="status-text">
              {file.name}
            </p>
          )}

        </section>

        <section className="form-group">

          <label htmlFor="analysis-prompt">
            Tell Gemini what to look for
          </label>

          <textarea
            id="analysis-prompt"
            rows="6"
            value={prompt}
            onChange={(event) =>
              setPrompt(
                event.target.value
              )
            }
            disabled={
              loading ||
              rendering
            }
          />

        </section>

        <div className="button-row">

          <button
            className="generate-btn"
            onClick={
              analyseActualVideo
            }
            disabled={
              loading ||
              rendering ||
              !file
            }
          >
            {loading
              ? '👁️ Analysing Video...'
              : '👁️ Analyse Actual Video'}
          </button>

          {plan &&
            !loading &&
            !rendering && (
              <button
                className="generate-btn"
                onClick={
                  buildAIEdit
                }
              >
                🎬 Build AI Edit
              </button>
            )}

          {!loading &&
            !rendering &&
            file && (
              <button
                className="clear-btn"
                onClick={
                  clearVideo
                }
              >
                Clear
              </button>
            )}

        </div>

        {(loading ||
          rendering) && (
          <section
            className="status-panel"
            style={{
              marginTop:
                '15px'
            }}
          >

            <p className="status-text">
              {status}
            </p>

            {currentStage && (
              <p
                style={{
                  fontSize:
                    '13px',
                  opacity:
                    0.8
                }}
              >
                {currentStage}
              </p>
            )}

            {loading && (
              <>
                <div
                  style={{
                    width:
                      '100%',
                    height:
                      '10px',
                    background:
                      '#333',
                    borderRadius:
                      '5px',
                    overflow:
                      'hidden',
                    marginTop:
                      '10px'
                  }}
                >

                  <div
                    style={{
                      width:
                        `${progress}%`,
                      height:
                        '100%',
                      background:
                        '#4fd1c5',
                      transition:
                        'width 0.2s ease'
                    }}
                  />

                </div>

                <div
                  style={{
                    marginTop:
                      '6px'
                  }}
                >
                  Blob upload: {progress}%
                </div>
              </>
            )}

            {rendering && (
              <>
                <div
                  style={{
                    width:
                      '100%',
                    height:
                      '10px',
                    background:
                      '#333',
                    borderRadius:
                      '5px',
                    overflow:
                      'hidden',
                    marginTop:
                      '10px'
                  }}
                >

                  <div
                    style={{
                      width:
                        `${renderProgress}%`,
                      height:
                        '100%',
                      background:
                        '#4fd1c5',
                      transition:
                        'width 0.2s ease'
                    }}
                  />

                </div>

                <div
                  style={{
                    marginTop:
                      '6px'
                  }}
                >
                  Render: {renderProgress}%
                </div>
              </>
            )}

          </section>
        )}

        {!loading &&
          !rendering &&
          status &&
          !errorDetails && (
            <section
              className="status-panel"
              style={{
                marginTop:
                  '15px'
              }}
            >

              <p className="status-text">
                {status}
              </p>

            </section>
          )}

        {errorDetails && (
          <section
            className="status-panel"
            style={{
              marginTop:
                '20px',
              border:
                '2px solid #ff4d4d',
              padding:
                '15px',
              borderRadius:
                '8px'
            }}
          >

            <h2
              style={{
                marginTop: 0
              }}
            >
              ❌ FULL ERROR DETAILS
            </h2>

            <p>
              <strong>
                The error is being kept on screen.
              </strong>
            </p>

            <p>
              This version records the exact
              upload stage and browser
              information.
            </p>

            <div
              style={{
                display:
                  'flex',
                gap:
                  '10px',
                flexWrap:
                  'wrap',
                marginBottom:
                  '15px'
              }}
            >

              <button
                className="generate-btn"
                onClick={
                  copyErrorDetails
                }
              >
                📋 Copy Error Details
              </button>

              <button
                className="generate-btn"
                onClick={
                  copyEverything
                }
              >
                📋 Copy Everything
              </button>

              <button
                className="clear-btn"
                onClick={
                  clearError
                }
              >
                Clear Error
              </button>

            </div>

            <pre
              style={{
                whiteSpace:
                  'pre-wrap',
                wordBreak:
                  'break-word',
                overflowX:
                  'auto',
                textAlign:
                  'left',
                margin: 0,
                padding:
                  '12px',
                background:
                  '#111',
                borderRadius:
                  '6px',
                fontSize:
                  '12px',
                lineHeight:
                  '1.5',
                color:
                  '#fff'
              }}
            >
              {getErrorText()}
            </pre>

          </section>
        )}

        {analysis && (
          <section
            className="result-container"
            style={{
              marginTop:
                '20px'
            }}
          >

            <h2>
              Gemini Video Analysis
            </h2>

            <div
              className="status-panel"
            >

              <pre
                style={{
                  whiteSpace:
                    'pre-wrap',
                  wordBreak:
                    'break-word',
                  textAlign:
                    'left',
                  margin: 0
                }}
              >
                {JSON.stringify(
                  analysis,
                  null,
                  2
                )}
              </pre>

            </div>

          </section>
        )}

        {plan && (
          <section
            className="result-container"
            style={{
              marginTop:
                '20px'
            }}
          >

            <h2>
              🎬 AI Edit Plan
            </h2>

            <div
              className="status-panel"
            >

              <p>
                {describeAIEditPlan(
                  plan
                )}
              </p>

              <pre
                style={{
                  whiteSpace:
                    'pre-wrap',
                  wordBreak:
                    'break-word',
                  textAlign:
                    'left',
                  margin: 0
                }}
              >
                {JSON.stringify(
                  plan,
                  null,
                  2
                )}
              </pre>

            </div>

          </section>
        )}

        {renderedVideoUrl && (
          <section
            className="result-container"
            style={{
              marginTop:
                '20px'
            }}
          >

            <h2>
              🏍️ AI Cinematic Edit
            </h2>

            <div
              className="status-panel"
            >

              <video
                src={
                  renderedVideoUrl
                }
                controls
                playsInline
                style={{
                  width:
                    '100%',
                  maxWidth:
                    '420px',
                  display:
                    'block',
                  margin:
                    '0 auto',
                  borderRadius:
                    '10px',
                  background:
                    '#000'
                }}
              />

              <p
                style={{
                  marginTop:
                    '12px'
                }}
              >
                Gemini selected the moments.
                The AI edit planner converted
                them into cuts, timing, speed,
                transitions and motion, and the
                browser renderer built the video.
              </p>

            </div>

          </section>
        )}

      </main>

    </div>
  );
      }
