/* Bikeztagram AI — Song Intelligence / catalogue reconstruction planner.
   Resolves a named song to public catalogue metadata and builds a transparent,
   inferred Song DNA profile for a style transformation. It never downloads
   catalogue audio and never treats a streaming preview as a transform source.
*/
export const maxDuration = 12;

const clean = value => String(value || '').replace(/\s+/g,' ').trim();
const json = (res,status,payload) => {
  res.statusCode=status;
  res.setHeader('Content-Type','application/json');
  res.setHeader('Cache-Control','no-store');
  return res.end(JSON.stringify(payload));
};

function scoreTrack(track,query){
  const q=clean(query).toLowerCase();
  const hay=[track.trackName,track.artistName,track.collectionName].map(clean).join(' ').toLowerCase();
  let score=0;
  const tokens=q.split(/[^a-z0-9]+/).filter(x=>x.length>2);
  for(const token of tokens) if(hay.includes(token)) score++;
  if(clean(track.trackName).toLowerCase()===q) score+=10;
  if(tokens.some(t=>clean(track.trackName).toLowerCase()===t)) score+=3;
  return score;
}

function inferDna(track,mb){
  const genre=clean(track.primaryGenreName)||clean(track.genre)||'Rock / pop';
  const g=genre.toLowerCase();
  const artist=clean(track.artistName);
  const title=clean(track.trackName);
  const year=Number(String(track.releaseDate||'').slice(0,4))||null;
  let instrumentation='Electric guitars, bass, drums and a focused lead vocal';
  let rhythm='Steady 4/4 groove with a strong backbeat';
  let energy='high';
  let vocalCharacter='Clear lead vocal with strong rhythmic phrasing';
  if(/dance|electronic|edm|house|trance|techno/.test(g)){
    instrumentation='Synth bass, layered electronic drums, pads, arpeggios and a prominent lead vocal';
    rhythm='Four-on-the-floor pulse with syncopated percussion';
    energy='high';
    vocalCharacter='Clean, hook-forward lead vocal designed for a dense electronic mix';
  }else if(/hip.?hop|rap/.test(g)){
    instrumentation='Drums, sub-bass, sampled/percussive textures and a front-and-centre vocal';
    rhythm='Beat-led pocket with syncopated accents and space around the vocal';
    energy='medium-high';
    vocalCharacter='Rhythmic lead delivery with tight phrasing and a memorable hook';
  }else if(/country|folk/.test(g)){
    instrumentation='Acoustic/electric guitars, bass, live drums and roots-oriented lead vocal';
    rhythm='Human live-band groove with clear downbeat movement';
    energy='medium';
    vocalCharacter='Story-led lead vocal with natural phrasing';
  }else if(/jazz|blues|soul|funk/.test(g)){
    instrumentation='Live rhythm section, bass, expressive keys/guitar and a prominent lead vocal';
    rhythm='Loose pocket with syncopation and dynamic push-pull';
    energy='medium';
    vocalCharacter='Expressive lead vocal with phrasing over the groove';
  }else if(/metal|punk|hard rock|rock/.test(g)){
    instrumentation='Layered electric guitars, bass, live drums and a dominant lead vocal';
    rhythm='Driving backbeat with riff-led momentum';
    energy='high';
    vocalCharacter='Powerful lead vocal with punchy rhythmic phrasing';
  }
  const era=year?(year<1980?'1970s or earlier':year<1990?'1980s':year<2000?'1990s':year<2010?'2000s':year<2020?'2010s':'2020s'):'unknown era';
  const structure=mb?.length
    ? 'Catalogue recording length about '+Math.round(mb.length/1000)+' seconds; rebuild with intro, verse, chorus/hook, contrast section and ending as appropriate'
    : 'Rebuild with a clear intro, verse, chorus/hook, contrast section and ending';
  const knownFacts=[year?('released '+year):'',mb?.isrc?'ISRC '+mb.isrc:'',track.collectionName?'album '+clean(track.collectionName):''].filter(Boolean).join('; ');
  return {
    artist,title,genre,era,energy,rhythm,instrumentation,vocalCharacter,structure,
    knownFacts,
    confidence: mb?.id ? 'High identity confidence; medium musical-trait confidence' : 'High catalogue identity confidence; low-to-medium musical-trait confidence'
  };
}

async function searchMusicBrainz(track){
  const endpoint=new URL('https://musicbrainz.org/ws/2/recording');
  endpoint.searchParams.set('query','recording:"'+clean(track.trackName).replace(/"/g,'')+'" AND artist:"'+clean(track.artistName).replace(/"/g,'')+'"');
  endpoint.searchParams.set('fmt','json');
  endpoint.searchParams.set('limit','3');
  const r=await fetch(endpoint,{headers:{Accept:'application/json','User-Agent':'BikeztagramAI/1.0 (music-intelligence; contact via github.com/bikeztagram-ai)'}});
  if(!r.ok) return null;
  const data=await r.json();
  const row=data?.recordings?.[0];
  if(!row) return null;
  return {
    id:row.id||'',
    length:Number(row.length)||Number(track.trackTimeMillis)||null,
    isrc:Array.isArray(row.isrcs)&&row.isrcs.length?row.isrcs[0]:'',
    score:Number(row.score)||0
  };
}

export default async function handler(req,res){
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed.'});
  const url=new URL(req.url||'','http://bikeztagram.local');
  const query=clean(url.searchParams.get('q'));
  if(query.length<3) return json(res,400,{error:'Name the artist and song you want Bikeztagram to reconstruct.'});

  try{
    const endpoint=new URL('https://itunes.apple.com/search');
    endpoint.searchParams.set('term',query);
    endpoint.searchParams.set('media','music');
    endpoint.searchParams.set('entity','song');
    endpoint.searchParams.set('limit','10');
    endpoint.searchParams.set('country','GB');
    const response=await fetch(endpoint,{headers:{Accept:'application/json'}});
    if(!response.ok) return json(res,502,{error:'Catalogue identification failed.',providerStatus:response.status});
    const data=await response.json();
    const tracks=Array.isArray(data?.results)?data.results:[];
    const ranked=tracks.filter(t=>t.trackName&&t.artistName)
      .map(track=>({track,score:scoreTrack(track,query)}))
      .sort((a,b)=>b.score-a.score)
      .slice(0,5);

    const matches=[];
    for(const {track,score} of ranked){
      let mb=null;
      try{mb=await searchMusicBrainz(track);}catch{}
      const songDna=inferDna(track,mb);
      matches.push({
        id:track.trackId,
        title:track.trackName,
        artist:track.artistName,
        album:track.collectionName||'',
        year:track.releaseDate?String(track.releaseDate).slice(0,4):'',
        durationMs:Number(track.trackTimeMillis)||null,
        artworkUrl:track.artworkUrl100||'',
        officialUrl:track.trackViewUrl||'',
        previewUrl:track.previewUrl||'',
        sourceType:track.previewUrl?'catalogue-preview':'metadata-only',
        transformReady:false,
        matchScore:score,
        musicBrainzId:mb?.id||'',
        isrc:mb?.isrc||'',
        songDna
      });
      if(matches.length>=3) break;
    }

    return json(res,200,{
      query,
      matched:matches.length>0,
      architecture:'Song Intelligence → Song DNA → Transformation Director → Reconstruction',
      sourcePolicy:'Catalogue metadata only. No streaming audio is downloaded or treated as a transformable master.',
      matches
    });
  }catch(error){
    return json(res,502,{error:'Song Intelligence lookup failed.',details:error?.message||String(error)});
  }
}
