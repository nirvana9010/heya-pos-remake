import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  
  if (!token) {
    return new Response('Token required', { status: 400 });
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const sseUrl = `${apiUrl}/api/v1/merchant/notifications/stream?token=${encodeURIComponent(token)}`;

  console.log('[SSE Proxy] Connecting to:', sseUrl);

  try {
    const response = await fetch(sseUrl, {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
      // @ts-ignore - Next.js specific option
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[SSE Proxy] Backend error:', response.status, response.statusText);
      return new Response(`Backend error: ${response.statusText}`, { status: response.status });
    }

    // Check if response is event stream
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('text/event-stream')) {
      console.error('[SSE Proxy] Invalid content type:', contentType);
      return new Response('Invalid response type', { status: 500 });
    }

    // Create a TransformStream to proxy the SSE data
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Pass through the data
            controller.enqueue(value);
          }
        } catch (error) {
          console.error('[SSE Proxy] Stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[SSE Proxy] Connection error:', error);
    return new Response('Connection failed', { status: 500 });
  }
}