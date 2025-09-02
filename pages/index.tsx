import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

interface StockImage {
  id: string;
  name: string;
  image: string;
  alt: string;
}

interface UploadState {
  file: File | null;
  preview: string | null;
}

interface CarouselState {
  currentIndex: number;
  isUsingStock: boolean;
  stockImages: StockImage[];
}

type AppState = 'idle' | 'running' | 'success' | 'error';
type LayoutMode = 'input-focus' | 'result-focus';

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
  const [stockPeople, setStockPeople] = useState<StockImage[]>([]);
  const [stockGarments, setStockGarments] = useState<StockImage[]>([]);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('input-focus');
  const [showFullScreen, setShowFullScreen] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(0);
  const [rateLimitDelay, setRateLimitDelay] = useState<number>(0);

  // Carousel states - Initialize with first stock image
  const [personCarousel, setPersonCarousel] = useState<CarouselState>({
    currentIndex: 0,
    isUsingStock: true,
    stockImages: []
  });
  const [garmentCarousel, setGarmentCarousel] = useState<CarouselState>({
    currentIndex: 0,
    isUsingStock: true,
    stockImages: []
  });

  const personInputRef = useRef<HTMLInputElement>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);

  // Load stock images and loading messages from JSON files
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load stock images
        const stockResponse = await fetch('/stock-images/data.json');
        const stockData = await stockResponse.json();
        setStockPeople(stockData.people);
        setStockGarments(stockData.garments);
        
        // Update carousel states with loaded data
        setPersonCarousel(prev => ({ ...prev, stockImages: stockData.people }));
        setGarmentCarousel(prev => ({ ...prev, stockImages: stockData.garments }));

        // Load loading messages
        const messagesResponse = await fetch('/loading-messages/messages.json');
        const messagesData = await messagesResponse.json();
        setLoadingMessages(messagesData.messages.map((msg: any) => msg.text));
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, []);

  // Handle loading message rotation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (appState === 'running' && loadingMessages.length > 0) {
      interval = setInterval(() => {
        setCurrentMessageIndex(prev => (prev + 1) % loadingMessages.length);
      }, 3500); // Change message every 3.5 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [appState, loadingMessages.length]);

  // Handle rate limit countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (rateLimitDelay > 0) {
      interval = setInterval(() => {
        setRateLimitDelay(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [rateLimitDelay]);

  // Carousel navigation handlers
  const handlePersonCarouselPrev = () => {
    setPersonCarousel(prev => {
      const uploadIndex = prev.stockImages.length;
      const newIndex = prev.currentIndex === 0 ? uploadIndex : prev.currentIndex - 1;
      return {
        ...prev,
        currentIndex: newIndex,
        isUsingStock: newIndex < uploadIndex
      };
    });
    // Reset hasTriedOnce when changing images and return to input focus
    setHasTriedOnce(false);
    setLayoutMode('input-focus');
  };

  const handlePersonCarouselNext = () => {
    setPersonCarousel(prev => {
      const uploadIndex = prev.stockImages.length;
      const newIndex = prev.currentIndex === uploadIndex ? 0 : prev.currentIndex + 1;
      return {
        ...prev,
        currentIndex: newIndex,
        isUsingStock: newIndex < uploadIndex
      };
    });
    // Reset hasTriedOnce when changing images and return to input focus
    setHasTriedOnce(false);
    setLayoutMode('input-focus');
  };

  const handleGarmentCarouselPrev = () => {
    setGarmentCarousel(prev => {
      const uploadIndex = prev.stockImages.length;
      const newIndex = prev.currentIndex === 0 ? uploadIndex : prev.currentIndex - 1;
      return {
        ...prev,
        currentIndex: newIndex,
        isUsingStock: newIndex < uploadIndex
      };
    });
    // Reset hasTriedOnce when changing images and return to input focus
    setHasTriedOnce(false);
    setLayoutMode('input-focus');
  };

  const handleGarmentCarouselNext = () => {
    setGarmentCarousel(prev => {
      const uploadIndex = prev.stockImages.length;
      const newIndex = prev.currentIndex === uploadIndex ? 0 : prev.currentIndex + 1;
      return {
        ...prev,
        currentIndex: newIndex,
        isUsingStock: newIndex < uploadIndex
      };
    });
    // Reset hasTriedOnce when changing images and return to input focus
    setHasTriedOnce(false);
    setLayoutMode('input-focus');
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setState: React.Dispatch<React.SetStateAction<UploadState>>,
    setCarouselState: React.Dispatch<React.SetStateAction<CarouselState>>
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
      // Set carousel to upload mode (last index after stock images)
      setCarouselState(prev => ({
        ...prev,
        currentIndex: prev.stockImages.length,
        isUsingStock: false
      }));
      if (appState === 'error') {
        setAppState('idle');
        setErrorMessage('');
      }
      // Reset button text when images change
      setHasTriedOnce(false);
    };
    reader.readAsDataURL(file);
  };

  // Helper function to get current image data
  const getCurrentImage = (carousel: CarouselState, uploadState: UploadState): { url: string; isStock: boolean } => {
    if (carousel.isUsingStock && carousel.currentIndex < carousel.stockImages.length) {
      return {
        url: carousel.stockImages[carousel.currentIndex].image,
        isStock: true
      };
    } else if (uploadState.preview) {
      return {
        url: uploadState.preview,
        isStock: false
      };
    }
    return { url: '', isStock: false };
  };

  // Helper function to convert URL to File object for stock images
  const urlToFile = async (url: string, filename: string, mimeType: string): Promise<File> => {
    try {
      // Use our server-side proxy to avoid CORS issues
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      return new File([blob], filename, { type: mimeType });
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      
      // Create a solid colored placeholder instead of trying canvas
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Create a gradient background
        const gradient = ctx.createLinearGradient(0, 0, 400, 600);
        gradient.addColorStop(0, '#f8f9fa');
        gradient.addColorStop(1, '#e9ecef');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 600);
        
        // Add text
        ctx.fillStyle = '#6c757d';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Image Unavailable', 200, 280);
        ctx.font = '14px Arial';
        ctx.fillText('Please upload your own image', 200, 320);
      }
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], filename, { type: 'image/png' }));
          } else {
            // Final fallback - create a simple blob
            const fallbackBlob = new Blob(['placeholder'], { type: 'text/plain' });
            resolve(new File([fallbackBlob], filename, { type: 'text/plain' }));
          }
        }, 'image/png', 0.8);
      });
    }
  };

  const handleCombine = async () => {
    // If this is a "try again" click, reset to initial layout first
    if (hasTriedOnce) {
      setLayoutMode('input-focus');
      setResultImage(null);
      setHasTriedOnce(false);
      setAppState('idle');
      return;
    }

    const personImage = getCurrentImage(personCarousel, personState);
    const garmentImage = getCurrentImage(garmentCarousel, garmentState);

    if (!personImage.url || !garmentImage.url) {
      setErrorMessage('Please select both person and garment images.');
      setAppState('error');
      return;
    }

    setAppState('running');
    setErrorMessage('');
    setResultImage(null);
    setLayoutMode('result-focus'); // Switch to result layout immediately

    try {
      const formData = new FormData();
      
      // Handle person image (should be uploaded file now)
      let personFile: File;
      if (personImage.isStock) {
        personFile = await urlToFile(personImage.url, 'person-stock.jpg', 'image/jpeg');
      } else {
        personFile = personState.file!;
      }
      
      // Handle garment image (should be uploaded file now)
      let garmentFile: File;
      if (garmentImage.isStock) {
        garmentFile = await urlToFile(garmentImage.url, 'garment-stock.jpg', 'image/jpeg');
      } else {
        garmentFile = garmentState.file!;
      }

      formData.append('person', personFile);
      formData.append('garment', garmentFile);
      formData.append('prompt', customPrompt.trim() || DEFAULT_PROMPT);

      const response = await fetch('/api/combine', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle rate limiting specifically
        if (response.status === 429) {
          if (result.type === 'delay') {
            setRateLimitDelay(result.retryAfter);
            setErrorMessage(`${result.error} Countdown: ${result.retryAfter}s`);
          } else {
            setErrorMessage(result.error);
          }
          setAppState('error');
          return;
        }
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

  const handleResultClick = () => {
    if (resultImage) {
      setShowFullScreen(true);
    }
  };

  const handleFullScreenClose = () => {
    setShowFullScreen(false);
  };

  const canCombine = (() => {
    const personImage = getCurrentImage(personCarousel, personState);
    const garmentImage = getCurrentImage(garmentCarousel, garmentState);
    return personImage.url && garmentImage.url && appState !== 'running' && rateLimitDelay === 0;
  })();

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
          <p>Try combining a model and a garment, or upload your own</p>
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
            ) : rateLimitDelay > 0 ? (
              `Wait ${rateLimitDelay}s`
            ) : (
              hasTriedOnce ? 'Try Again?' : 'Try It On'
            )}
          </button>
          {resultImage && (
            <button onClick={handleDownload} className="download-btn">
              Save Result?
            </button>
          )}
        </div>

        <main className="main-content">
          <div className={`layout-container ${layoutMode}`}>
            {/* Left Column - Input Images */}
            <div className="inputs-column">
              {/* Person Upload Panel */}
              <div className="upload-panel">
                <div className="carousel-header">
                  <h2>Person Photo</h2>
                  <div className="carousel-nav">
                    <button 
                      className="carousel-arrow" 
                      onClick={handlePersonCarouselPrev}
                      aria-label="Previous person"
                    >
                      ←
                    </button>
                    <button 
                      className="carousel-arrow" 
                      onClick={handlePersonCarouselNext}
                      aria-label="Next person"
                    >
                      →
                    </button>
                  </div>
                </div>
                <div className="upload-area compact">
                  {personCarousel.currentIndex === personCarousel.stockImages.length ? (
                    // Upload interface
                    <div 
                      className="upload-content"
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
                  ) : (
                    // Stock image
                    <img 
                      src={personCarousel.stockImages[personCarousel.currentIndex].image} 
                      alt={personCarousel.stockImages[personCarousel.currentIndex].alt}
                      className="preview-image" 
                    />
                  )}
                </div>
                <input
                  ref={personInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(e, setPersonState, setPersonCarousel)}
                  style={{ display: 'none' }}
                />
                <small className="hint">
                  {personCarousel.currentIndex === personCarousel.stockImages.length ? 
                    'Single subject, torso visible, arms not crossed' : 
                    personCarousel.stockImages[personCarousel.currentIndex]?.name
                  }
                </small>
              </div>

              {/* Garment Upload Panel */}
              <div className="upload-panel">
                <div className="carousel-header">
                  <h2>Garment Image</h2>
                  <div className="carousel-nav">
                    <button 
                      className="carousel-arrow" 
                      onClick={handleGarmentCarouselPrev}
                      aria-label="Previous garment"
                    >
                      ←
                    </button>
                    <button 
                      className="carousel-arrow" 
                      onClick={handleGarmentCarouselNext}
                      aria-label="Next garment"
                    >
                      →
                    </button>
                  </div>
                </div>
                <div className="upload-area compact">
                  {garmentCarousel.currentIndex === garmentCarousel.stockImages.length ? (
                    // Upload interface
                    <div 
                      className="upload-content"
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
                  ) : (
                    // Stock image
                    <img 
                      src={garmentCarousel.stockImages[garmentCarousel.currentIndex].image} 
                      alt={garmentCarousel.stockImages[garmentCarousel.currentIndex].alt}
                      className="preview-image" 
                    />
                  )}
                </div>
                <input
                  ref={garmentInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => handleFileUpload(e, setGarmentState, setGarmentCarousel)}
                  style={{ display: 'none' }}
                />
                <small className="hint">
                  {garmentCarousel.currentIndex === garmentCarousel.stockImages.length ? 
                    'Flat-lay product image on plain background works best' : 
                    garmentCarousel.stockImages[garmentCarousel.currentIndex]?.name
                  }
                </small>
              </div>
            </div>

            {/* Right Column - Result (only show when needed) */}
            {(appState !== 'idle') && (
              <div className="result-column">
              <div className="upload-panel result-panel">
                <h2>Result</h2>
                <div className="result-area large">
                  {appState === 'running' && (
                    <div className="loading">
                      <div className="spinner"></div>
                      <p>Creating your try-on...</p>
                      <small className="loading-message">
                        {loadingMessages.length > 0 ? loadingMessages[currentMessageIndex] : 'This may take up to 60 seconds'}
                      </small>
                    </div>
                  )}
                  {appState === 'success' && resultImage && (
                    <div className="result-success">
                      <img 
                        src={resultImage} 
                        alt="Virtual try-on result" 
                        className="result-image clickable" 
                        onClick={handleResultClick}
                        title="Click to view full screen"
                      />
                    </div>
                  )}
                  {appState === 'error' && (
                    <div className="error-state">
                      <div className="error-icon">{rateLimitDelay > 0 ? '⏱️' : '⚠️'}</div>
                      <p className="error-message">
                        {rateLimitDelay > 0 ? (
                          <>
                            {errorMessage.replace(/Countdown: \d+s/, `Countdown: ${rateLimitDelay}s`)}
                            <br />
                            <small style={{color: '#667eea', fontWeight: 'normal'}}>
                              You can try again in {rateLimitDelay} seconds
                            </small>
                          </>
                        ) : (
                          errorMessage
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              </div>
            )}
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

        {/* Full Screen Modal */}
        {showFullScreen && resultImage && (
          <div className="fullscreen-modal" onClick={handleFullScreenClose}>
            <div className="fullscreen-content">
              <button className="close-button" onClick={handleFullScreenClose}>×</button>
              <img src={resultImage} alt="Virtual try-on result - Full screen" className="fullscreen-image" />
            </div>
          </div>
        )}

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
            gap: 48px;
            margin-bottom: 48px;
            transition: all 0.5s ease;
          }

          .layout-container.input-focus {
            grid-template-columns: 1fr;
            max-width: 900px;
            margin: 0 auto 48px;
          }

          .layout-container.result-focus {
            grid-template-columns: 1fr;
            max-width: 1000px;
            margin: 0 auto 48px;
          }

          .layout-container.result-focus .result-column {
            order: 1;
            margin-bottom: 32px;
          }

          .layout-container.result-focus .inputs-column {
            order: 2;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
          }

          .layout-container.result-focus .upload-panel {
            padding: 16px;
          }

          .layout-container.result-focus .upload-area.compact {
            height: 160px;
          }

          .inputs-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
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

          .carousel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

          .carousel-nav {
            display: flex;
            gap: 8px;
          }

          .carousel-arrow {
            background: #f8f9fa;
            border: 1px solid #e1e5e9;
            border-radius: 4px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 14px;
            color: #374151;
          }

          .carousel-arrow:hover {
            background: #e9ecef;
            border-color: #d1d5db;
            color: #1a1a1a;
          }

          .upload-content {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
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
            height: 400px;
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
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }

          .result-image.clickable {
            cursor: pointer;
          }

          .result-image.clickable:hover {
            transform: scale(1.02);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          }

          .upload-area img, .result-area img {
            max-width: 100%;
            height: 400px;
            object-fit: cover;
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
            background: #1a1a1a;
            color: white;
            border: none;
            padding: 18px 48px;
            min-width: 160px;
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
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 16px;
          }

          .combine-btn {
            background: #1a1a1a;
            color: white;
            border: none;
            padding: 18px 48px;
            min-width: 160px;
            font-size: 1.125rem;
            font-weight: 400;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
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

          /* Full Screen Modal */
          .fullscreen-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            cursor: pointer;
          }

          .fullscreen-content {
            position: relative;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .fullscreen-image {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }

          .close-button {
            position: absolute;
            top: -40px;
            right: -40px;
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.9);
            border: none;
            border-radius: 50%;
            font-size: 24px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease;
            color: #333;
          }

          .close-button:hover {
            background: rgba(255, 255, 255, 1);
          }

          /* Loading message animation */
          .loading-message {
            transition: opacity 0.3s ease;
            min-height: 1.2em;
            display: block;
          }

          @media (max-width: 1024px) {
            .layout-container.input-focus {
              grid-template-columns: 1fr;
              gap: 32px;
              max-width: 600px;
            }

            .layout-container.result-focus {
              grid-template-columns: 1fr;
              gap: 32px;
            }

            .layout-container.result-focus .inputs-column {
              grid-template-columns: 1fr;
              gap: 20px;
            }

            .inputs-column {
              display: grid;
              grid-template-columns: 1fr;
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

            .layout-container.input-focus,
            .layout-container.result-focus {
              gap: 24px;
            }

            .layout-container.result-focus .inputs-column {
              grid-template-columns: 1fr;
              gap: 20px;
            }

            .inputs-column {
              display: grid;
              grid-template-columns: 1fr;
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

            .combine-btn, .download-btn {
              padding: 14px 32px;
              font-size: 1rem;
            }

            .close-button {
              top: 10px;
              right: 10px;
              width: 35px;
              height: 35px;
              font-size: 20px;
            }

            .fullscreen-content {
              max-width: 95vw;
              max-height: 95vh;
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