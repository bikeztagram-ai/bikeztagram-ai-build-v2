export const maxDuration = 10;

export default function handler(req, res) {
  const jobId = new URL(req.url, 'https://bikeztagram.local').searchParams.get('jobId') || 'none';
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: 'OK', jobId }));
}
