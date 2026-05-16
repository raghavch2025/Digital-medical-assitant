// api/hello.js
//
// First Vercel serverless function. Doesn't do anything useful yet — just
// proves the deploy pipeline works end-to-end. We'll keep this file around
// as a "is the bot alive?" health check we can hit from a browser.

export default function handler(req, res) {
  res.status(200).json({
    message: 'hello from digital raghav v2',
    time: new Date().toISOString(),
  });
}
