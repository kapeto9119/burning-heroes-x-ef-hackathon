import { NextRequest, NextResponse } from 'next/server';

const HIGGSFIELD_API_KEY = '184a4cd0-2084-4d5c-a5e6-783e89bf96b1';
const HIGGSFIELD_SECRET = '5c08efefca0d3a2766db52591eb847b4e654719e226b360bc90074e423657a8c';
const BASE_URL = 'https://platform.higgsfield.ai/v1';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Generate video from image with subtle ambient motion
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
          prompt: "Subtle ambient motion with gentle floating and zoom effects, cyberpunk atmosphere with vivid orange, yellow and red lighting",
          input_images: [
            {
              type: "image_url",
              image_url: imageUrl
            }
          ]
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `API request failed: ${error}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ jobId: data.id });
  } catch (error) {
    console.error('Error generating video:', error);
    return NextResponse.json({ error: 'Failed to generate video' }, { status: 500 });
  }
}
