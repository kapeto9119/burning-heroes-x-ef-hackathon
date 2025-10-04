import { NextRequest, NextResponse } from 'next/server';

const HIGGSFIELD_API_KEY = '184a4cd0-2084-4d5c-a5e6-783e89bf96b1';
const HIGGSFIELD_SECRET = '5c08efefca0d3a2766db52591eb847b4e654719e226b360bc90074e423657a8c';
const BASE_URL = 'https://platform.higgsfield.ai/v1';

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    const response = await fetch(`${BASE_URL}/generation-results/${jobId}`, {
      method: 'GET',
      headers: {
        'hf-api-key': HIGGSFIELD_API_KEY,
        'hf-secret': HIGGSFIELD_SECRET,
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `Failed to fetch results: ${error}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error checking video status:', error);
    return NextResponse.json({ error: 'Failed to check video status' }, { status: 500 });
  }
}
