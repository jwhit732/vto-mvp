import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  // Validate API key format
  if (!apiKey.startsWith('AIzaSy') || apiKey.length !== 39) {
    return res.status(500).json({ error: 'Invalid API key format' });
  }

  try {
    // Test a simple request to verify the API key works
    const testResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );

    if (testResponse.ok) {
      const models = await testResponse.json();
      const availableModels = models.models?.map((model: any) => model.name) || [];
      const imageModels = availableModels.filter((name: string) => 
        name.includes('image') || name.includes('vision') || name.includes('generate')
      );
      
      return res.status(200).json({ 
        status: 'success', 
        message: 'API key is valid',
        availableModels: availableModels.slice(0, 10), // First 10 models
        imageModels,
        modelsCount: models.models?.length || 0
      });
    } else {
      const errorText = await testResponse.text();
      console.error('API key test failed:', testResponse.status, errorText);
      
      if (testResponse.status === 401 || testResponse.status === 403) {
        return res.status(502).json({ error: 'API key is invalid or lacks permissions' });
      }
      
      return res.status(502).json({ error: `API test failed: ${testResponse.status}` });
    }
  } catch (error) {
    console.error('API key test error:', error);
    return res.status(502).json({ error: 'Could not connect to Gemini API' });
  }
}