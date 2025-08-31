import { useState, useRef } from 'react';
import Head from 'next/head';

interface UploadState {
  file: File | null;
  preview: string | null;
}

type AppState = 'idle' | 'running' | 'success' | 'error';

const DEFAULT_PROMPT = "Blend these two images: Put the garment from the second image onto the person in the first image. Create a realistic virtual try-on by editing the person to wear the garment while maintaining their pose, face, and natural lighting. Generate the final edited image.";

export default function Home() {
  const [personState, setPersonState] = useState<UploadState>({ file: null, preview: null });
  const [garmentState, setGarmentState] = useState<UploadState>({ file: null, preview: null });
  const [appState, setAppState] = useState<AppState>('idle');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>(DEFAULT_PROMPT);
  const [showPromptEditor, setShowPromptEditor] = useState<boolean>(false);
  const [hasTriedOnce, setHasTriedOnce] = useState<boolean>(false);

  const personInputRef = useRef<HTMLInputElement>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setState: React.Dispatch<React.SetStateAction<UploadState>>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (4MB max)
    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage('Image too large. Maximum size is 4MB.');
      setAppState('error');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file.');
      setAppState('error');
      return;
    }

    if (file.type === 'image/webp') {
      setErrorMessage('WebP format not supported. Please use JPG or PNG.');
      setAppState('error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setState({
        file,
        preview: e.target?.result as string
      });
      if (appState === 'error') {
        setAppState('idle');
        setErrorMessage('');
      }
      // Reset button text when images change
      setHasTriedOnce(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCombine = async () => {
    if (!personState.file || !garmentState.file) {
      setErrorMessage('Please upload both person and garment images.');
      setAppState('error');
      return;
    }

    setAppState('running');
    setErrorMessage('');
    setResultImage(null);

    try {
      const formData = new FormData();
      formData.append('person', personState.file);
      formData.append('garment', garmentState.file);
      formData.append('prompt', customPrompt.trim() || DEFAULT_PROMPT);

      const response = await fetch('/api/combine', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Something went wrong');
      }

      setResultImage(`data:image/png;base64,${result.image}`);
      setAppState('success');
      setHasTriedOnce(true);
    } catch (error) {
      console.error('Combine error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      setAppState('error');
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;

    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `vto-result-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canCombine = personState.file && garmentState.file && appState !== 'running';

  return (
    <>
      <Head>
        <title>Virtual Try-On</title>
        <meta name="description" content="AI-powered virtual garment try-on" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div className="container">
        <header>
          <h1>Virtual Try-On</h1>
          <p>Upload a person photo and garment image to see how they look together</p>
        </header>

        <div className="combine-section">
          <button 
            onClick={handleCombine}
            disabled={!canCombine}
            className={`combine-btn ${!canCombine ? 'disabled' : ''}`}
          >
            {appState === 'running' ? (
              <>
                <span className="btn-spinner"></span>
                Trying on...
              </>
            ) : (
              hasTriedOnce ? 'Try Again?' : 'Try It On'
            )}
          </button>
        </div>

        <main className="main-content">
          <div className="layout-container">
            {/* Left Column - Input Images */}
            <div className="inputs-column">
              {/* Person Upload Panel */}
              <div className="upload-panel">
                <h2>Person Photo</h2>
                <div 
                  className="upload-area compact"
                  onClick={() => personInputRef.current?.click()}
                >
                  {personState.preview ? (
                    <img src={personState.preview} alt="Person preview" className="preview-image" />
                  ) : (
                    <div className="upload-placeholder">
                      <div className="upload-icon">👤</div>
                      <p>Click to upload person photo</p>
                      <small>JPG, PNG • Max 4MB</small>
                    </div>
                  )}
                </div>
                <input
                  ref={personInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(e, setPersonState)}
                  style={{ display: 'none' }}
                />
                <small className="hint">Single subject, torso visible, arms not crossed</small>
              </div>

              {/* Garment Upload Panel */}
              <div className="upload-panel">
                <h2>Garment Image</h2>
                <div 
                  className="upload-area compact"
                  onClick={() => garmentInputRef.current?.click()}
                >
                  {garmentState.preview ? (
                    <img src={garmentState.preview} alt="Garment preview" className="preview-image" />
                  ) : (
                    <div className="upload-placeholder">
                      <div className="upload-icon">👕</div>
                      <p>Click to upload garment</p>
                      <small>JPG, PNG • Max 4MB</small>
                    </div>
                  )}
                </div>
                <input
                  ref={garmentInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(e, setGarmentState)}
                  style={{ display: 'none' }}
                />
                <small className="hint">Flat-lay product image on plain background works best</small>
              </div>
            </div>

            {/* Right Column - Result */}
            <div className="result-column">
              <div className="upload-panel result-panel">
                <h2>Result</h2>
                <div className="result-area large">
                  {appState === 'running' && (
                    <div className="loading">
                      <div className="spinner"></div>
                      <p>Creating your try-on...</p>
                      <small>This may take up to 60 seconds</small>
                    </div>
                  )}
                  {appState === 'success' && resultImage && (
                    <div className="result-success">
                      <img src={resultImage} alt="Virtual try-on result" className="result-image" />
                      <button onClick={handleDownload} className="download-btn">
                        Download PNG
                      </button>
                    </div>
                  )}
                  {appState === 'error' && (
                    <div className="error-state">
                      <div className="error-icon">⚠️</div>
                      <p className="error-message">{errorMessage}</p>
                    </div>
                  )}
                  {appState === 'idle' && (
                    <div className="upload-placeholder">
                      <div className="upload-icon">✨</div>
                      <p>Your result will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="prompt-section">
            <div className="prompt-header" onClick={() => setShowPromptEditor(!showPromptEditor)}>
              <h3>AI Prompt {showPromptEditor ? '▼' : '▶'}</h3>
              <small>Click to {showPromptEditor ? 'hide' : 'customize'} the instructions sent to the AI</small>
            </div>
            
            {showPromptEditor && (
              <div className="prompt-editor">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Enter custom prompt for the AI..."
                  rows={4}
                  className="prompt-textarea"
                />
                <div className="prompt-actions">
                  <button 
                    onClick={() => setCustomPrompt(DEFAULT_PROMPT)}
                    className="reset-btn"
                    type="button"
                  >
                    Reset to Default
                  </button>
                  <small className="prompt-hint">
                    Tip: Be specific about the style, lighting, and details you want
                  </small>
                </div>
              </div>
            )}
          </div>

        </main>

        <style jsx>{`
          .container {
            min-height: 100vh;
            background: #ffffff;
            padding: 40px 20px;
          }

          header {
            text-align: center;
            color: #1a1a1a;
            margin-bottom: 60px;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
          }

          header h1 {
            font-size: 3rem;
            margin-bottom: 16px;
            font-weight: 400;
            letter-spacing: -0.02em;
            font-family: 'Playfair Display', 'Georgia', serif;
          }

          header p {
            font-size: 1.2rem;
            color: #666;
            font-weight: 300;
            line-height: 1.6;
            font-family: 'Georgia', serif;
          }

          .main-content {
            max-width: 1200px;
            max-height: 900px;
            margin: 0 auto;
          }

          .layout-container {
            display: grid;
            grid-template-columns: 400px 1fr;
            gap: 48px;
            margin-bottom: 48px;
          }

          .inputs-column {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .result-column {
            display: flex;
          }

          .upload-panel {
            background: #ffffff;
            border-radius: 8px;
            padding: 24px;
            border: 1px solid #e5e7eb;
            transition: all 0.2s ease;
            flex: 1;
          }

          .upload-panel:hover {
            border-color: #d1d5db;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
          }

          .result-panel {
            width: 100%;
            display: flex;
            flex-direction: column;
            height: 100%;
          }

          .upload-panel h2 {
            margin: 0 0 20px 0;
            font-size: 1.375rem;
            font-weight: 400;
            color: #1a1a1a;
            font-family: 'Playfair Display', 'Georgia', serif;
            letter-spacing: -0.01em;
          }

          .upload-area, .result-area {
            border: 2px dashed #d1d5db;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            background: #fafafa;
          }

          .upload-area.compact {
            min-height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
          }

          .result-area.large {
            flex: 1;
            cursor: default;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .upload-area:hover {
            border-color: #9ca3af;
            background-color: #f5f5f5;
          }

          .preview-image {
            max-width: 100%;
            width: 100%;
            height: auto;
            object-fit: contain;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .result-image {
            max-width: 100%;
            max-height: 420px;
            object-fit: contain;
            border-radius: 6px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
            margin-bottom: 16px;
          }

          .upload-area img, .result-area img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 6px;
          }

          .upload-placeholder {
            text-align: center;
            color: #6b7280;
          }

          .upload-icon {
            font-size: 2.5rem;
            margin-bottom: 16px;
            opacity: 0.7;
          }

          .upload-placeholder p {
            margin: 0 0 12px 0;
            font-weight: 400;
            font-size: 1.1rem;
            font-family: 'Georgia', serif;
            color: #374151;
          }

          .upload-placeholder small {
            color: #9ca3af;
            font-size: 0.9rem;
          }

          .hint {
            display: block;
            margin-top: 16px;
            color: #6b7280;
            font-style: italic;
            text-align: center;
            font-size: 0.9rem;
            font-family: 'Georgia', serif;
          }

          .loading {
            text-align: center;
            color: #667eea;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e1e5e9;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
          }

          .loading p {
            font-weight: 600;
            margin: 0 0 8px 0;
          }

          .loading small {
            color: #94a3b8;
          }

          .result-success {
            text-align: center;
            width: 100%;
          }

          .download-btn {
            margin-top: 16px;
            background: #1a1a1a;
            color: white;
            border: none;
            padding: 18px 48px;
            font-size: 1.125rem;
            font-weight: 400;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-width: 160px;
            justify-content: center;
            font-family: 'Georgia', serif;
            letter-spacing: 0.02em;
          }

          .download-btn:hover {
            background: #374151;
            transform: translateY(-1px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }

          .error-state {
            text-align: center;
            color: #dc2626;
          }

          .error-icon {
            font-size: 3rem;
            margin-bottom: 12px;
          }

          .error-message {
            font-weight: 500;
            margin: 0;
          }

          .prompt-section {
            max-width: 1200px;
            margin: 0 auto 40px;
            background: #ffffff;
            border-radius: 8px;
            padding: 28px;
            border: 1px solid #e5e7eb;
            transition: all 0.2s ease;
          }

          .prompt-section:hover {
            border-color: #d1d5db;
          }

          .prompt-header {
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
            transition: all 0.2s ease;
          }

          .prompt-header:hover {
            background: #fafafa;
            margin: -12px;
            padding: 12px;
            border-radius: 6px;
          }

          .prompt-header h3 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 400;
            color: #1a1a1a;
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: 'Playfair Display', 'Georgia', serif;
            letter-spacing: -0.01em;
          }

          .prompt-header small {
            color: #6b7280;
            font-style: italic;
            font-family: 'Georgia', serif;
          }

          .prompt-editor {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e1e5e9;
          }

          .prompt-textarea {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-family: inherit;
            font-size: 0.95rem;
            line-height: 1.5;
            resize: vertical;
            transition: border-color 0.2s ease;
          }

          .prompt-textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          }

          .prompt-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 12px;
          }

          .reset-btn {
            padding: 8px 16px;
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .reset-btn:hover {
            background: #e2e8f0;
            border-color: #cbd5e1;
          }

          .prompt-hint {
            color: #64748b;
            font-style: italic;
          }

          .combine-section {
            text-align: center;
            margin-top: 20px;
            margin-bottom: 40px;
          }

          .combine-btn {
            background: #1a1a1a;
            color: white;
            border: none;
            padding: 18px 48px;
            font-size: 1.125rem;
            font-weight: 400;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-width: 160px;
            justify-content: center;
            font-family: 'Georgia', serif;
            letter-spacing: 0.02em;
          }

          .combine-btn:hover:not(.disabled) {
            background: #374151;
            transform: translateY(-1px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }

          .combine-btn.disabled {
            opacity: 0.4;
            cursor: not-allowed;
            background: #9ca3af;
          }

          .btn-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @media (max-width: 1024px) {
            .layout-container {
              grid-template-columns: 1fr;
              gap: 32px;
            }

            .inputs-column {
              flex-direction: row;
              gap: 24px;
            }

            .result-area.large {
              min-height: 320px;
            }

            .result-image {
              max-height: 280px;
            }
          }

          @media (max-width: 768px) {
            .container {
              padding: 20px 16px;
            }

            header h1 {
              font-size: 2.2rem;
            }

            header p {
              font-size: 1.1rem;
            }

            .layout-container {
              gap: 24px;
            }

            .inputs-column {
              flex-direction: column;
              gap: 20px;
            }

            .upload-panel {
              padding: 20px;
            }

            .upload-area.compact {
              min-height: 120px;
            }

            .result-area.large {
              min-height: 280px;
            }

            .preview-image {
              max-width: 100%;
              width: 100%;
              height: auto;
            }

            .result-image {
              max-height: 240px;
            }

            .combine-btn {
              padding: 14px 32px;
              font-size: 1rem;
            }
          }
        `}</style>

        <style jsx global>{`
          * {
            box-sizing: border-box;
          }

          html,
          body {
            padding: 0;
            margin: 0;
            font-family: 'Georgia', 'Times New Roman', serif;
            line-height: 1.6;
            color: #1a1a1a;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          a {
            color: inherit;
            text-decoration: none;
          }

          button {
            font-family: inherit;
          }

          textarea {
            font-family: inherit;
          }
        `}</style>
      </div>
    </>
  );
}