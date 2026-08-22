# Private Blob read fix

The source-library analysis must receive a readable Blob URL.

The production failure was `Could not download source media. HTTP 403` when `api/analyse-library.js` fetched the source URL. That means the returned Blob URL was not anonymously readable.

Vercel private Blob storage requires authenticated reads. The upload flow therefore remains a signed PUT, while the source library now receives a separate signed GET URL scoped to the same pathname.

The GET signature must never be stripped from `url` because Gemini analysis fetches that URL server-side.
