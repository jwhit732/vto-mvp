import { useState, useRef } from 'react';
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

const DEFAULT_PROMPT = "Blend these two images: Put the garment from the second image onto the person in the first image. Create a realistic virtual try-on by editing the person to wear the garment while maintaining their pose, face, and natural lighting. Generate the final edited image.";

// Stock image data
const STOCK_PEOPLE: StockImage[] = [
  {
    id: "person-1",
    name: "Light Complexion Model",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face",
    alt: "Light complexion male model in casual wear"
  },
  {
    id: "person-2", 
    name: "Medium Complexion Model",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop&crop=face",
    alt: "Medium complexion male model"
  },
  {
    id: "person-3",
    name: "Dark Complexion Model", 
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop&crop=face",
    alt: "Dark complexion male model"
  },
  {
    id: "person-4",
    name: "Female Model",
    image: "https://images.unsplash.com/photo-1494790108755-2616c23dd4f6?w=400&h=600&fit=crop&crop=face", 
    alt: "Female model"
  },
  {
    id: "person-5",
    name: "Athletic Build Model",
    image: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=600&fit=crop&crop=face",
    alt: "Athletic build male model"
  }
];

const STOCK_GARMENTS: StockImage[] = [
  {
    id: "garment-1",
    name: "Red Hoodie",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=600&fit=crop",
    alt: "Red hooded sweatshirt"
  },
  {
    id: "garment-2",
    name: "Blue Denim Jacket", 
    image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=600&fit=crop",
    alt: "Blue denim jacket"
  },
  {
    id: "garment-3",
    name: "Black T-Shirt",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=600&fit=crop", 
    alt: "Black cotton t-shirt"
  },
  {
    id: "garment-4",
    name: "White Button Shirt",
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=600&fit=crop",
    alt: "White button-up shirt"
  },
  {
    id: "garment-5", 
    name: "Gray Sweater",
    image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=600&fit=crop",
    alt: "Gray knit sweater"
  }
];

export default function Home() {
  const [personState, setPersonState] = useState<UploadState>({ file: null, preview: null });
  const [garmentState, setGarmentState] = useState<UploadState>({ file: null, preview: null });
  const [appState, setAppState] = useState<AppState>('idle');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>(DEFAULT_PROMPT);
  const [showPromptEditor, setShowPromptEditor] = useState<boolean>(false);
  const [hasTriedOnce, setHasTriedOnce] = useState<boolean>(false);

  // Carousel states - Initialize with first stock image
  const [personCarousel, setPersonCarousel] = useState<CarouselState>({
    currentIndex: 0,
    isUsingStock: true,
    stockImages: STOCK_PEOPLE
  });
  const [garmentCarousel, setGarmentCarousel] = useState<CarouselState>({
    currentIndex: 0,
    isUsingStock: true,
    stockImages: STOCK_GARMENTS
  });

  const personInputRef = useRef<HTMLInputElement>(null);
  const garmentInputRef = useRef<HTMLInputElement>(null);

  // Carousel navigation handlers
  const handlePersonCarouselPrev = () => {
    setPersonCarousel(prev => {
      const newIndex = prev.currentIndex === 0 ? 5 : prev.currentIndex - 1; // 5 = upload index
      return {
        ...prev,
        currentIndex: newIndex,
        isUsingStock: newIndex < 5
      };
    });
    // Reset hasTriedOnce when changing images
    setHasTriedOnce(false);
  };

  const handlePersonCarouselNext = () => {
    setPersonCarousel(prev => {
      const newIndex = prev.currentIndex === 5 ? 0 : prev.currentIndex + 1; // 5 = upload index
      return {
        ...prev,
        currentIndex: newIndex,
        isUsingStock: newIndex < 5
      };
    });
    // Reset hasTriedOnce when changing images
    setHasTriedOnce(false);
  };

  const handleGarmentCarouselPrev = () => {
    setGarmentCarousel(prev => {
      const newIndex = prev.currentIndex === 0 ? 5 : prev.currentIndex - 1; // 5 = upload index
      return {
        ...prev,
        currentIndex: newIndex,
        isUsingStock: newIndex < 5
      };
    });
    // Reset hasTriedOnce when changing images
    setHasTriedOnce(false);
  };

  const handleGarmentCarouselNext = () => {
    setGarmentCarousel(prev => {
      const newIndex = prev.currentIndex === 5 ? 0 : prev.currentIndex + 1; // 5 = upload index
      return {
        ...prev,
        currentIndex: newIndex,
        isUsingStock: newIndex < 5
      };
    });
    // Reset hasTriedOnce when changing images
    setHasTriedOnce(false);
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
      // Set carousel to upload mode (index 5)
      setCarouselState(prev => ({
        ...prev,
        currentIndex: 5,
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
    const response = await fetch(url);
    const blob = await response.blob();
    return new File([blob], filename, { type: mimeType });
  };

  const handleCombine = async () => {
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

    try {
      const formData = new FormData();
      
      // Handle person image (stock or uploaded)
      let personFile: File;
      if (personImage.isStock) {
        personFile = await urlToFile(personImage.url, 'person-stock.jpg', 'image/jpeg');
      } else {
        personFile = personState.file!;
      }
      
      // Handle garment image (stock or uploaded)
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

  const canCombine = (() => {
    const personImage = getCurrentImage(personCarousel, personState);
    const garmentImage = getCurrentImage(garmentCarousel, garmentState);
    return personImage.url && garmentImage.url && appState !== 'running';
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
                  {personCarousel.currentIndex === 5 ? (
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
                  {personCarousel.currentIndex === 5 ? 
                    'Single subject, torso visible, arms not crossed' : 
                    personCarousel.stockImages[personCarousel.currentIndex].name
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
                  {garmentCarousel.currentIndex === 5 ? (
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
                  {garmentCarousel.currentIndex === 5 ? 
                    'Flat-lay product image on plain background works best' : 
                    garmentCarousel.stockImages[garmentCarousel.currentIndex].name
                  }
                </small>
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