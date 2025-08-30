import { useState, useRef } from 'react';
import Head from 'next/head';

interface UploadState {
  file: File | null;
  preview: string | null;
}

type AppState = 'idle' | 'running' | 'success' | 'error';

export default function Home() {
  const [personState, setPersonState] = useState<UploadState>({ file: null, preview: null });
  const [garmentState, setGarmentState] = useState<UploadState>({ file: null, preview: null });
  const [appState, setAppState] = useState<AppState>('idle');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

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
        <title>Virtual Try-On MVP</title>
        <meta name="description" content="AI-powered virtual garment try-on" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="container">
        <header>
          <h1>Virtual Try-On</h1>
          <p>Upload a person photo and garment image to see how they look together</p>
        </header>

        <main className="main-content">
          <div className="upload-panels">
            {/* Person Upload Panel */}
            <div className="upload-panel">
              <h2>Person Photo</h2>
              <div 
                className="upload-area"
                onClick={() => personInputRef.current?.click()}
              >
                {personState.preview ? (
                  <img src={personState.preview} alt="Person preview" />
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
                className="upload-area"
                onClick={() => garmentInputRef.current?.click()}
              >
                {garmentState.preview ? (
                  <img src={garmentState.preview} alt="Garment preview" />
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

            {/* Result Panel */}
            <div className="upload-panel">
              <h2>Result</h2>
              <div className="result-area">
                {appState === 'running' && (
                  <div className="loading">
                    <div className="spinner"></div>
                    <p>Creating your try-on...</p>
                    <small>This may take up to 60 seconds</small>
                  </div>
                )}
                {appState === 'success' && resultImage && (
                  <div className="result-success">
                    <img src={resultImage} alt="Virtual try-on result" />
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

          <div className="combine-section">
            <button 
              onClick={handleCombine}
              disabled={!canCombine}
              className={`combine-btn ${!canCombine ? 'disabled' : ''}`}
            >
              {appState === 'running' ? (
                <>
                  <span className="btn-spinner"></span>
                  Combining...
                </>
              ) : (
                'Combine'
              )}
            </button>
          </div>
        </main>

        <style jsx>{`
          .container {
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
          }

          header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
          }

          header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 700;
          }

          header p {
            font-size: 1.1rem;
            opacity: 0.9;
          }

          .main-content {
            max-width: 1200px;
            margin: 0 auto;
          }

          .upload-panels {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 24px;
            margin-bottom: 32px;
          }

          .upload-panel {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }

          .upload-panel h2 {
            margin: 0 0 16px 0;
            font-size: 1.25rem;
            font-weight: 600;
            color: #333;
          }

          .upload-area, .result-area {
            border: 2px dashed #e1e5e9;
            border-radius: 12px;
            min-height: 250px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
          }

          .upload-area:hover {
            border-color: #667eea;
            background-color: #f8f9ff;
          }

          .result-area {
            cursor: default;
          }

          .upload-area img, .result-area img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 8px;
          }

          .upload-placeholder {
            text-align: center;
            color: #64748b;
          }

          .upload-icon {
            font-size: 3rem;
            margin-bottom: 12px;
          }

          .upload-placeholder p {
            margin: 0 0 8px 0;
            font-weight: 500;
          }

          .upload-placeholder small {
            color: #94a3b8;
          }

          .hint {
            display: block;
            margin-top: 12px;
            color: #64748b;
            font-style: italic;
            text-align: center;
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
            padding: 12px 24px;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s ease;
          }

          .download-btn:hover {
            background: #059669;
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

          .combine-section {
            text-align: center;
          }

          .combine-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 16px 48px;
            font-size: 1.125rem;
            font-weight: 600;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-width: 140px;
            justify-content: center;
          }

          .combine-btn:hover:not(.disabled) {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          }

          .combine-btn.disabled {
            opacity: 0.6;
            cursor: not-allowed;
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

          @media (max-width: 768px) {
            .container {
              padding: 16px;
            }

            header h1 {
              font-size: 2rem;
            }

            .upload-panels {
              grid-template-columns: 1fr;
              gap: 20px;
            }

            .upload-panel {
              padding: 20px;
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
            font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
              Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
              sans-serif;
          }

          a {
            color: inherit;
            text-decoration: none;
          }
        `}</style>
      </div>
    </>
  );
}