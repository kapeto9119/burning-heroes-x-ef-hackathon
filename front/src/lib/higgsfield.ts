// Higgsfield API Integration
const HIGGSFIELD_API_KEY = '184a4cd0-2084-4d5c-a5e6-783e89bf96b1';
const HIGGSFIELD_SECRET = '5c08efefca0d3a2766db52591eb847b4e654719e226b360bc90074e423657a8c';
const BASE_URL = 'https://platform.higgsfield.ai/v1';

interface GenerationResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_url?: string;
  error?: string;
}

export async function generateImageToVideo(imageUrl: string, motionId?: string): Promise<string> {
  try {
    // Step 1: Create video generation request
    const response = await fetch(`${BASE_URL}/image2video/dop`, {
      method: 'POST',
      headers: {
        'hf-api-key': HIGGSFIELD_API_KEY,
        'hf-secret': HIGGSFIELD_SECRET,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        params: {
          image_url: imageUrl,
          motion_id: motionId || undefined, // Optional motion preset
          duration: 5, // 5 second video
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const jobId = data.id;

    // Step 2: Poll for results
    return await pollForResult(jobId);
  } catch (error) {
    console.error('Error generating video:', error);
    throw error;
  }
}

async function pollForResult(jobId: string): Promise<string> {
  const maxAttempts = 60; // 60 attempts
  const pollInterval = 2000; // 2 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/generation-results/${jobId}`, {
        method: 'GET',
        headers: {
          'hf-api-key': HIGGSFIELD_API_KEY,
          'hf-secret': HIGGSFIELD_SECRET,
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch results: ${response.statusText}`);
      }

      const result: GenerationResult = await response.json();

      if (result.status === 'completed' && result.result_url) {
        return result.result_url;
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'Video generation failed');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error(`Poll attempt ${attempt + 1} failed:`, error);
      if (attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error('Video generation timed out');
}

export async function generateTextToImage(prompt: string): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/text2image/soul`, {
      method: 'POST',
      headers: {
        'hf-api-key': HIGGSFIELD_API_KEY,
        'hf-secret': HIGGSFIELD_SECRET,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        params: {
          prompt: prompt,
          width_and_height: '1920x1080',
          enhance_prompt: true,
          quality: '1080p',
          batch_size: 1,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const jobId = data.id;

    // Poll for image result
    return await pollForResult(jobId);
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}
