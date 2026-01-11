import React, { useState, useRef } from 'react';
import './App.css';

const API_BASE_URL = 'https://ocr-api-1bet.onrender.com/v1';

function App() {
  const [files, setFiles] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, polling, complete, error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setError(null);
    setResult(null);
    setJobId(null);
    setStatus('idle');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
    setError(null);
    setResult(null);
    setJobId(null);
    setStatus('idle');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const pollForResult = async (id) => {
    const pollInterval = 2000; // Poll every 2 seconds
    const maxAttempts = 150; // Max 5 minutes of polling
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${API_BASE_URL}/jobs/${id}/summary`);
        const data = await response.json();

        // Check if job is still pending or processing
        if (data.state === 'PENDING' || data.state === 'PROCESSING') {
          // Update status with progress if available
          setStatus(`polling - ${data.state}`);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        }

        // Job is complete (or failed)
        if (response.ok) {
          setResult(data);
          setStatus('complete');
          return;
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (err) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    setError('Polling timed out. Please try again.');
    setStatus('error');
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Please select at least one file.');
      return;
    }

    setStatus('uploading');
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      const newJobId = data.job_id;
      setJobId(newJobId);
      setStatus('polling');

      // Start polling for results
      await pollForResult(newJobId);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const handleReset = () => {
    setFiles([]);
    setJobId(null);
    setStatus('idle');
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="App">
      <div className="container">
        <h1>MapleStory Idle OCR Parser</h1>
        
        <div 
          className="drop-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div className="drop-zone-content">
            <span className="drop-icon">📁</span>
            <p>Drop files here or click to select</p>
            <p className="hint">Supports multiple image files</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="file-list">
            <h3>Selected Files ({files.length}):</h3>
            <ul>
              {files.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="button-group">
          <button 
            className="submit-btn"
            onClick={handleSubmit}
            disabled={files.length === 0 || status === 'uploading' || status === 'polling' || status.startsWith('polling')}
          >
            {status === 'uploading' ? 'Uploading...' : 
             status === 'polling' || status.startsWith('polling') ? 'Processing...' : 
             'Upload & Process'}
          </button>
          <button 
            className="reset-btn"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>

        {jobId && (
          <div className="job-info">
            <p><strong>Job ID:</strong> {jobId}</p>
          </div>
        )}

        {(status === 'polling' || status.startsWith('polling')) && (
          <div className="status-box polling">
            <div className="spinner"></div>
            <p>Processing your files... This may take a few minutes.</p>
            {status.includes('-') && <p className="status-detail">Status: {status.split(' - ')[1]}</p>}
          </div>
        )}

        {error && (
          <div className="status-box error">
            <p>❌ {error}</p>
          </div>
        )}

        {result && (
          <div className="result-box">
            <h3>✅ Results:</h3>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
