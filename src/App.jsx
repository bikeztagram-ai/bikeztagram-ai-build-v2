import React, { useState } from 'react';
import './styles.css';

export default function App() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile =
      event.target.files?.[0] || null;

    setFile(selectedFile);
    setAnalysis(null);

    if (selectedFile) {
      const sizeMB =
        selectedFile.size /
        (1024 * 1024);

      setStatus(
        `Loaded: ${selectedFile.name} (${sizeMB.toFixed(1)} MB)`
      );
    } else {
      setStatus('');
    }
  };

  const analyseVideo = async () => {
    if (!file) {
      setStatus(
        'Please select a video first.'
      );
      return;
    }

    if (!file.type.startsWith('video/')) {
      setStatus(
        'Please upload a video clip.'
      );
      return;
    }

    setIsProcessing(true);
    setAnalysis(null);

    try {
      setStatus(
        'Preparing your video for Gemini...'
      );

      const formData =
        new FormData();

      formData.append(
        'video',
        file,
        file.name
      );

      formData.append(
        'filename',
        file.name
      );

      formData.append(
        'mimeType',
        file.type || 'video/mp4'
      );

      formData.append(
        'prompt',
        prompt ||
          'Analyse this motorcycle footage for the strongest cinematic moments, camera movement, action, composition and best timestamps for an exciting social-media motorcycle trailer.'
      );

      setStatus(
        'Uploading the actual video to Gemini...'
      );

      const response =
        await fetch(
          '/api/analyse',
          {
            method: 'POST',
            body: formData
          }
        );

      const responseText =
        await response.text();

      let data;

      try {
        data =
          JSON.parse(
            responseText
          );
      } catch {
        throw new Error(
          `The analysis server returned an invalid response: ${
            responseText.slice(
              0,
              300
            ) ||
            'Empty response'
          }`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Analysis server error (${response.status})`
        );
      }

      if (!data?.analysis) {
        throw new Error(
          'Gemini did not return an analysis.'
        );
      }

      setAnalysis(
        data.analysis
      );

      setStatus(
        '✅ Gemini has analysed the actual video.'
      );
    } catch (error) {
      console.error(
        'Video analysis error:',
        error
      );

      setStatus(
        `Something went wrong: ${
          error?.message ||
          'Unknown error'
        }`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const clearTest = () => {
    setFile(null);
    setPrompt('');
    setStatus('');
    setAnalysis(null);
  };

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
          <label htmlFor="media-upload">
            Test motorcycle footage
          </label>

          <input
            id="media-upload"
            type="file"
            accept="video/*"
            onChange={
             
