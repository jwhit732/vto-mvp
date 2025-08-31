import { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File } from 'formidable';
import fs from 'fs';
import sharp from 'sharp';

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const MAX_DIMENSION = 1024;

async function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE,
    maxFiles: 2,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

async function processImage(file: File): Promise<string> {
  const buffer = fs.readFileSync(file.filepath);
  
  // Get image metadata
  const metadata = await sharp(buffer).metadata();
  const { width = 0, height = 0 } = metadata;
  
  // Downscale if needed
  let processedBuffer = buffer;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    processedBuffer = await sharp(buffer)
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: false })
      .toBuffer();
  }
  
  // Convert to base64 without data URI prefix
  return processedBuffer.toString('base64');
}

function validateImage(file: File): { valid: boolean; error?: string } {
  if (!file.mimetype?.startsWith('image/')) {
    return { valid: false, error: 'File must be an image' };
  }
  
  if (file.mimetype === 'image/webp') {
    return { valid: false, error: 'WebP format not supported. Please use JPG or PNG.' };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Image too large. Maximum size is 4MB.' };
  }
  
  return { valid: true };
}

async function callGeminiAPI(personBase64: string, garmentBase64: string, personMimeType: string, garmentMimeType: string, customPrompt: string, requestId: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error(`[${requestId}] GEMINI_API_KEY not configured`);
    throw new Error('API key not configured yet - deployment test mode');
  }

  console.log(`[${requestId}] API key length: ${apiKey.length}`);
  console.log(`[${requestId}] Person image: ${personMimeType}, size: ${Math.round(personBase64.length * 0.75)} bytes`);
  console.log(`[${requestId}] Garment image: ${garmentMimeType}, size: ${Math.round(garmentBase64.length * 0.75)} bytes`);

  const requestBody = {
    contents: [{
      parts: [
        { 
          inline_data: { 
            mime_type: personMimeType, 
            data: personBase64 
          } 
        },
        { 
          inline_data: { 
            mime_type: garmentMimeType, 
            data: garmentBase64 
          } 
        },
        { 
          text: customPrompt 
        }
      ]
    }],
    safetySettings: [
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
    ],
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.4,
      topP: 0.95,
      topK: 40
    }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;
  console.log(`[${requestId}] Making request to Gemini API...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      // signal: AbortSignal.timeout(60000), // 60 second timeout - removed for compatibility
    });

    console.log(`[${requestId}] Gemini API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${requestId}] API error (${response.status}):`, errorText.substring(0, 500));
      
      // Check if we got HTML instead of JSON (wrong endpoint)
      if (errorText.includes('<!DOCTYPE') || errorText.includes('<html>')) {
        throw new Error(`API endpoint returned HTML page - model may not be available or endpoint is incorrect`);
      }
      
      // Parse error details if available
      try {
        const errorJson = JSON.parse(errorText);
        console.error(`[${requestId}] Parsed error:`, errorJson);
        
        if (errorJson.error?.message) {
          throw new Error(`API error: ${errorJson.error.message}`);
        }
      } catch (parseError) {
        console.error(`[${requestId}] Could not parse error response`);
      }
      
      throw new Error(`API error: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    let result;
    try {
      result = await response.json();
      console.log(`[${requestId}] Successfully parsed JSON response`);
      console.log(`[${requestId}] Response has candidates:`, !!result.candidates);
      console.log(`[${requestId}] Parts length:`, result.candidates?.[0]?.content?.parts?.length || 0);
    } catch (jsonError) {
      const responseText = await response.text();
      console.error(`[${requestId}] Failed to parse JSON response:`, responseText.substring(0, 500));
      
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
        throw new Error('API returned HTML page instead of JSON - model endpoint may be incorrect');
      }
      
      throw new Error('API returned invalid JSON response');
    }
    
    // Check for specific error conditions first
    if (result.candidates?.[0]?.finishReason) {
      const finishReason = result.candidates[0].finishReason;
      console.log(`[${requestId}] Finish reason:`, finishReason);
      console.log(`[${requestId}] Full candidate:`, JSON.stringify(result.candidates[0], null, 2));
      
      // STOP means successful completion, continue processing
      if (finishReason === 'STOP') {
        console.log(`[${requestId}] Generation completed successfully`);
        // Continue to extract the image data below
      } else if (finishReason === 'SAFETY') {
        throw new Error('Content generation blocked by safety filters. Try simpler images with basic clothing.');
      } else if (finishReason === 'RECITATION') {
        throw new Error('Content generation blocked due to potential copyright issues. Try images without logos or text.');
      } else {
        throw new Error(`Content generation failed: ${finishReason}`);
      }
    }

    // This debug info was already logged above when we parsed the response

    // Try multiple possible response structures
    let resultData = null;
    
    // Check the single part for image data
    if (result.candidates?.[0]?.content?.parts?.[0]) {
      const part = result.candidates[0].content.parts[0];
      console.log(`[${requestId}] Part 0 keys:`, Object.keys(part));
      
      // Check both camelCase and snake_case variants
      console.log(`[${requestId}] Part has inline_data:`, !!part.inline_data);
      console.log(`[${requestId}] Part has inlineData:`, !!part.inlineData);
      
      // Try snake_case first
      if (part.inline_data?.data) {
        console.log(`[${requestId}] Found image data in inline_data.data (snake_case)!`);
        resultData = part.inline_data.data;
      }
      // Try camelCase  
      else if (part.inlineData?.data) {
        console.log(`[${requestId}] Found image data in inlineData.data (camelCase)!`);
        resultData = part.inlineData.data;
      }
      
      if (!resultData && part.text) {
        console.log(`[${requestId}] Text length:`, part.text.length);
        console.log(`[${requestId}] Text preview:`, part.text.substring(0, 50));
        if (part.text.length > 1000 && part.text.match(/^[A-Za-z0-9+/]+=*$/)) {
          console.log(`[${requestId}] Found image data in text field!`);
          resultData = part.text;
        }
      }
      
      if (!resultData) {
        console.log(`[${requestId}] Part content:`, JSON.stringify(part, null, 2).substring(0, 300));
      }
    }

    if (!resultData) {
      console.error(`[${requestId}] No image data found in any expected location`);
      console.error(`[${requestId}] Response candidates exist:`, !!result.candidates);
      console.error(`[${requestId}] Response parts exist:`, !!result.candidates?.[0]?.content?.parts);
      console.error(`[${requestId}] Response parts length:`, result.candidates?.[0]?.content?.parts?.length || 0);
      throw new Error('Invalid response from Gemini API - no image data found');
    }

    console.log(`[${requestId}] Successfully received result image, size: ${Math.round(resultData.length * 0.75)} bytes`);
    return resultData;
    
  } catch (error) {
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Starting combine request`);
  
  const startTime = Date.now();

  try {
    const { fields, files } = await parseForm(req);
    
    const personFile = Array.isArray(files.person) ? files.person[0] : files.person;
    const garmentFile = Array.isArray(files.garment) ? files.garment[0] : files.garment;
    const customPrompt = Array.isArray(fields.prompt) ? fields.prompt[0] : fields.prompt;

    console.log(`[${requestId}] Received files:`, { 
      person: !!personFile, 
      garment: !!garmentFile,
      prompt: !!customPrompt 
    });

    if (!personFile || !garmentFile) {
      return res.status(400).json({ error: 'Both person and garment images are required' });
    }

    // Validate files
    const personValidation = validateImage(personFile);
    if (!personValidation.valid) {
      return res.status(400).json({ error: `Person image: ${personValidation.error}` });
    }

    const garmentValidation = validateImage(garmentFile);
    if (!garmentValidation.valid) {
      return res.status(400).json({ error: `Garment image: ${garmentValidation.error}` });
    }

    // Process images
    const personBase64 = await processImage(personFile);
    const garmentBase64 = await processImage(garmentFile);

    // Use custom prompt or fallback to default
    const defaultPrompt = "Blend these two images: Put the garment from the second image onto the person in the first image. Create a realistic virtual try-on by editing the person to wear the garment while maintaining their pose, face, and natural lighting. Generate the final edited image.";
    const promptToUse = customPrompt || defaultPrompt;
    
    console.log(`[${requestId}] Using prompt: ${promptToUse.substring(0, 100)}...`);

    // Call Gemini API
    const resultBase64 = await callGeminiAPI(
      personBase64, 
      garmentBase64, 
      personFile.mimetype || 'image/jpeg', 
      garmentFile.mimetype || 'image/png',
      promptToUse,
      requestId
    );

    const endTime = Date.now();
    console.log(`[${requestId}] Request completed in ${endTime - startTime}ms`);

    res.status(200).json({ image: resultBase64 });

  } catch (error) {
    const endTime = Date.now();
    console.error(`[${requestId}] Request failed in ${endTime - startTime}ms:`, error);
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      // API key issues
      if (errorMessage.includes('gemini_api_key') || errorMessage.includes('api key')) {
        return res.status(500).json({ error: 'Service configuration error. Please check API key.' });
      }
      
      // Authentication/authorization errors
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
        return res.status(502).json({ error: 'API authentication failed. Please check your API key permissions.' });
      }
      
      // Quota/rate limiting errors
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        return res.status(502).json({ error: 'API quota exceeded. Please try again later.' });
      }
      
      // Timeout errors
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        return res.status(502).json({ error: 'Request timed out. Please try with smaller images or try again later.' });
      }
      
      // Content/safety errors
      if (errorMessage.includes('content generation failed') || errorMessage.includes('safety')) {
        return res.status(400).json({ error: 'Content could not be generated. Please try different images that comply with safety guidelines.' });
      }
      
      // File size errors
      if (errorMessage.includes('maxfilesize') || errorMessage.includes('file too large')) {
        return res.status(413).json({ error: 'File too large. Maximum size is 4MB per image.' });
      }
      
      // Generic Gemini API errors
      if (errorMessage.includes('gemini api')) {
        return res.status(502).json({ error: `AI service error: ${error.message.substring(0, 100)}` });
      }
      
      // Invalid response errors
      if (errorMessage.includes('invalid response') || errorMessage.includes('no image data')) {
        return res.status(502).json({ error: 'AI service returned invalid response. Please try again.' });
      }
    }

    // Generic fallback error
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
  }
}