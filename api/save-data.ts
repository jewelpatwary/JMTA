import { put } from '@vercel/blob';
import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage & { body: any }, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const { url } = await put(
      'data/app-data.json',
      JSON.stringify(req.body),
      {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      }
    );
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, url }));
  } catch (error) {
    console.error('Blob save error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Failed to save data' }));
  }
}