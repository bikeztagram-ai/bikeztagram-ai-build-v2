/* Bikeztagram AI — automatic music source identification.
   This resolver identifies catalogue tracks and returns official metadata.
   It deliberately does not download streaming audio or turn a preview URL
   into a transform source. A transformable master must come from an authorised
   source or user-supplied audio the user has rights to transform.
*/
export const maxDuration = 10;

const json = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(payload));
};

const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

function scoreTrack(track, query) {
  const q = clean(query).toLowerCase();
  const hay = [track.trackName, track.artistName, track.collectionName].map(clean).join(' ').toLowerCase();
  let score = 0;
  for (const token of q.split(/[^a-z0-9]+/).filter(x => x.length > 2)) {
    if (hay.includes(token)) score += 1;
  }
  if (clean(track.trackName).toLowerCase() === q) score += 8;
  return score;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
  const url = new URL(req.url || '', 'http://bikeztagram.local');
  const query = clean(url.searchParams.get('q'));
  if (query.length < 3) return json(res, 400, { error: 'A song or artist query is required.' });

  try {
    const endpoint = new URL('https://itunes.apple.com/search');
    endpoint.searchParams.set('term', query);
    endpoint.searchParams.set('media', 'music');
    endpoint.searchParams.set('entity', 'song');
    endpoint.searchParams.set('limit', '8');
    endpoint.searchParams.set('country', 'GB');

    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) return json(res, 502, { error: 'Music catalogue search failed.', providerStatus: response.status });

    const data = await response.json();
    const tracks = Array.isArray(data?.results) ? data.results : [];
    const ranked = tracks
      .filter(track => track.trackName && track.artistName)
      .map(track => ({ track, score: scoreTrack(track, query) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ track }) => ({
        id: track.trackId,
        title: track.trackName,
        artist: track.artistName,
        album: track.collectionName || '',
        year: track.releaseDate ? String(track.releaseDate).slice(0, 4) : '',
        durationMs: Number(track.trackTimeMillis) || null,
        artworkUrl: track.artworkUrl100 || '',
        officialUrl: track.trackViewUrl || '',
        previewUrl: track.previewUrl || '',
        sourceType: track.previewUrl ? 'catalogue-preview' : 'metadata-only',
        transformReady: false
      }));

    return json(res, 200, {
      query,
      matched: ranked.length > 0,
      sourcePolicy: 'Catalogue identification only. Streaming previews are not treated as transformable masters.',
      matches: ranked
    });
  } catch (error) {
    return json(res, 502, { error: 'Music source identification failed.', details: error?.message || String(error) });
  }
}
