export const maxDuration = 10;

export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({
    status: 'OK',
    service: 'music-engine',
    mode: 'diagnostic',
    message: 'Music engine function booted successfully.'
  }));
}
