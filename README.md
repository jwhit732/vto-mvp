# Virtual Try-On MVP

AI-powered virtual garment try-on using Google Gemini 2.5 Flash Image Preview.

<!-- Test comment for VS Code Git workflow -->
<!-- Environment variables configured - ready for deployment -->

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure your Gemini API key in `.env.local`:
```
GEMINI_API_KEY=your_actual_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. Upload a person photo (single subject, torso visible, arms not crossed)
2. Upload a garment image (flat-lay product image on plain background)
3. Click "Combine" and wait up to 60 seconds
4. Download the result as PNG

## Features

- **Three-panel UI**: Person upload, garment upload, result display
- **Image validation**: Max 4MB, JPG/PNG only (no WebP)
- **Automatic downscaling**: Images over 1024px are resized
- **Real-time feedback**: Loading states, error messages
- **Download functionality**: Save results as PNG files

## Technical Details

- **Frontend**: Next.js with TypeScript, vanilla CSS
- **Backend**: Next.js API route with multipart form parsing
- **AI Model**: Google Gemini 2.5 Flash Image Preview
- **Image Processing**: Sharp.js for resizing and optimization
- **Form Handling**: Formidable for multipart uploads

## API Endpoint

`POST /api/combine`
- Accepts multipart form with `person` and `garment` file fields
- Returns JSON with base64-encoded PNG result
- Handles validation, preprocessing, and error states

## Environment Variables

- `GEMINI_API_KEY`: Required - Your Google AI Studio API key

## Limitations

- Local development only (localhost:3000)
- No persistence or database
- Best results with upper-body garments and front-facing photos
- Flat-lay garments work better than worn garments