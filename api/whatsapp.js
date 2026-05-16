// api/whatsapp.js
//
// Twilio webhook — called every time someone sends our number a WhatsApp.
// For now we just echo the message back so we can verify the pipe works.
// In Phase 3+ we'll add real parsing, logging, scheduled reminders, etc.
//
// Twilio sends the message as application/x-www-form-urlencoded POST body.
// Vercel auto-parses that into req.body for us.
//
// We respond with TwiML — a tiny XML format Twilio understands. The <Message>
// inside <Response> tells Twilio to send that text back to the user.

export default async function handler(req, res) {
  // Only accept POST (Twilio uses POST). Reject anything else.
  if (req.method !== 'POST') {
    return res.status(405).type('text/plain').send('Method not allowed');
  }

  // Twilio's POST body fields. From = sender's WhatsApp address, Body = message text.
  const from = req.body?.From || 'unknown';
  const body = (req.body?.Body || '').trim();

  console.log(`[whatsapp] from=${from} body="${body}"`);

  // Build the reply. Phase 2 just echoes — we'll add real intelligence next.
  const reply = body
    ? `got it, you said: "${body}"`
    : `got it (empty message)`;

  // Send TwiML back to Twilio. Twilio relays the <Message> to the user.
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(reply)}</Message>
</Response>`;

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(twiml);
}

// XML special characters must be escaped, otherwise a message with <, >, &
// breaks Twilio's parser.
function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
