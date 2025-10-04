// netlify/functions/track.js
// POST { event: 'page_view' | 'lead_submitted' | ..., data?: {...} }
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors(), body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const row = {
      timestamp: new Date().toISOString(),
      event: payload.event || 'unknown',
      ...payload.data
    };

    if (process.env.SHEETS_WEBHOOK) {
      try {
        await fetch(process.env.SHEETS_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row)
        });
      } catch (e) {
        console.warn('track webhook failed', e);
      }
    } else {
      // No-op; you can still see the events in Function logs
      console.log('track', row);
    }

    return { statusCode: 204, headers: cors(), body: '' };
  } catch (e) {
    return { statusCode: 400, headers: cors(), body: 'Bad Request' };
  }
};

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
