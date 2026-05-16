// api/whatsapp.js
//
// Twilio webhook — called every time someone sends our number a WhatsApp.
// For now we just echo the message back so we can verify the pipe works.
// In Phase 3+ we'll add real parsing, logging, scheduled reminders, etc.

export default async function handler(req, res) {
  // Friendly GET response — for when you accidentally visit this URL in
  // a browser. Twilio always POSTs, so this never affects real traffic.
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(
      'this endpoint is the Twilio WhatsApp webhook.\n' +
      'it expects POST requests from Twilio.\n' +
      'visiting it directly in a browser does nothing useful.\n'
    );
  }

  // Everything other than POST gets 405 Method Not Allowed
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(405).send('method not allowed — POST only');
  }

  // From Twilio: application/x-www-form-urlencoded body, auto-parsed by Vercel.
  // Defensive defaults in case the body is missing or malformed.
  const body = req.body || {};
  const from = body.From || 'unknown';
  const text = (body.Body || '').trim();

  console.log(`[whatsapp] from=${from} body="${text}"`);

  const reply = text
    ? `got it, you said: "${text}"`
    : `got it (empty message)`;

  // TwiML response — XML format Twilio expects.
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(reply)}</Message>
</Response>`;

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(twiml);
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
