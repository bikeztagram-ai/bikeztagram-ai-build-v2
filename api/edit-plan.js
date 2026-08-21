export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is missing in Vercel settings.' });
    const { prompt = '', analysis = null, targetDuration = 15 } = req.body || {};
    if (!analysis || typeof analysis !== 'object') return res.status(400).json({ success: false, error: 'No Gemini video analysis was supplied.' });
    const availableMoments = Array.isArray(analysis.bestMoments) ? analysis.bestMoments : [];
    const subject = analysis?.subject?.description || analysis?.subject?.primarySubject || analysis?.primarySubject || analysis?.contentType || 'the uploaded subject';
    const directorPrompt = `You are the final AI edit director for BIKEZTAGRAM AI, a GENERAL-PURPOSE AI FILMMAKER.\n\nA separate Gemini stage has already watched the ACTUAL uploaded media and produced the verified analysis below. Do NOT analyse the media again. Turn only that verified evidence into a strong cinematic social-media edit plan.\n\nThe uploaded subject may be ANYTHING. Never assume a motorcycle unless the verified analysis says so.\n\nSUBJECT:\n${subject}\n\nUSER CREATIVE REQUEST:\n${prompt || 'Create a cinematic social-media video from the supplied media.'}\n\nTARGET DURATION:\n${Math.max(5, Math.min(60, Number(targetDuration) || 15))} seconds\n\nVERIFIED MEDIA ANALYSIS:\n${JSON.stringify(analysis, null, 2)}\n\nDIRECTOR RULES:\n- Use ONLY moments and facts supported by the supplied analysis.\n- Never invent source footage, actions, camera angles or events.\n- Prefer the strongest verified moments and avoid repetitive shots.\n- Build a visual story appropriate to the subject and request: hook, establish, build, reveal, action/emotion and hero ending as evidence allows.\n- Use exact start/end timestamps from bestMoments when available.\n- Each cut must reference a verified bestMoments index.\n- If there are not enough verified moments, use fewer cuts rather than inventing shots.\n- Preserve subject identity and continuity.\n- Keep text minimal unless requested or clearly supported.\n\nReturn ONLY valid JSON using this structure:\n{\"title\":\"string\",\"style\":\"string\",\"colorGrade\":\"string\",\"textOverlay\":\"\",\"editorialStructure\":[\"hook\",\"establish\",\"build\",\"reveal\",\"hero\"],\"cuts\":[{\"momentIndex\":0,\"startTime\":0,\"endTime\":0,\"duration\":2,\"purpose\":\"hook\",\"transition\":\"hard-cut\",\"motionStyle\":\"static\",\"speed\":1,\"text\":\"\"}]}\n\nValidation rules: momentIndex must refer to bestMoments; timestamps must remain inside the verified moment; duration 0.5–4 seconds; speed 0.5–1.5; maximum 8 cuts; prefer 3–6; never invent footage or duplicate moments unnecessarily.`;
    const models = ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash'];
    const failures = [];
    let geminiData = null;
    for (const model of models) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: directorPrompt }] }], generationConfig: { responseMimeType: 'application/json' } }) });
        const responseText = await response.text();
        if (!response.ok) {
          failures.push(`${model}: HTTP ${response.status}`);
          if ([404, 408, 425, 429, 500, 502, 503, 504].includes(response.status)) continue;
          return res.status(500).json({ success:false,error:`Gemini error ${response.status}: ${responseText.slice(0,500)}` });
        }
        try { geminiData = JSON.parse(responseText); } catch { failures.push(`${model}: invalid response JSON`); continue; }
        if (geminiData?.candidates?.[0]?.content?.parts?.some((part) => typeof part.text === 'string')) break;
        failures.push(`${model}: empty response`);
      } catch (error) { failures.push(`${model}: ${error?.message || String(error)}`); }
    }
    if (!geminiData) return res.status(500).json({ success:false,error:`Gemini director unavailable after model failover. ${failures.join(' | ')}` });
    let modelText = String(geminiData?.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')?.text || '').replace(/```json/gi,'').replace(/```/g,'').trim();
    let plan; try { plan = JSON.parse(modelText); } catch { return res.status(500).json({ success:false,error:'Gemini created an invalid edit plan.' }); }
    if (!plan || !Array.isArray(plan.cuts) || !plan.cuts.length) return res.status(500).json({ success:false,error:'Gemini did not create any usable cuts.' });
    const validTransitions = new Set(['hard-cut','fade-in','fade-out','dip-black','crossfade','flash-cut','whip-left','whip-right']);
    const validMotionStyles = new Set(['static','slow-push','slow-pull','pan-left','pan-right','tilt-up','tilt-down']);
    plan.cuts = plan.cuts.map((cut) => {
      const momentIndex=Number(cut.momentIndex);
      if(!Number.isInteger(momentIndex)||momentIndex<0||momentIndex>=availableMoments.length)return null;
      const moment=availableMoments[momentIndex];
      const momentStart=Number(moment?.start),momentEnd=Number(moment?.end);
      if(!Number.isFinite(momentStart)||!Number.isFinite(momentEnd)||momentEnd<=momentStart)return null;
      const momentLength=momentEnd-momentStart;
      if(momentLength<0.5)return null;
      const requestedStart=Number(cut.startTime),requestedEnd=Number(cut.endTime);
      const startTime=Number.isFinite(requestedStart)
        ? Math.min(momentEnd-0.5,Math.max(momentStart,Math.min(requestedStart,momentEnd-0.5)))
        : momentStart;
      const endTime=Number.isFinite(requestedEnd)
        ? Math.max(startTime+0.5,Math.min(requestedEnd,momentEnd))
        : momentEnd;
      const safeEndTime=Math.min(momentEnd,Math.max(startTime+0.5,endTime));
      if(safeEndTime>momentEnd||startTime<momentStart||safeEndTime-startTime<0.5)return null;
      const availableDuration=safeEndTime-startTime;
      const duration=Math.max(0.5,Math.min(4,Number(cut.duration)||Math.min(2,availableDuration),availableDuration));
      return {momentIndex,startTime,endTime:safeEndTime,duration,purpose:String(cut.purpose||'cinematic'),transition:validTransitions.has(String(cut.transition))?String(cut.transition):'hard-cut',motionStyle:validMotionStyles.has(String(cut.motionStyle))?String(cut.motionStyle):'static',speed:Math.max(0.5,Math.min(1.5,Number(cut.speed)||1)),text:String(cut.text||'')};
    }).filter(Boolean).slice(0,8);
    if (!plan.cuts.length) return res.status(500).json({ success:false,error:'Gemini returned no cuts linked to verified media moments.' });
    return res.status(200).json({ success:true,plan });
  } catch (error) { console.error('[EDIT PLAN] Error:',error); return res.status(500).json({ success:false,error:error?.message||'Unknown edit-plan error.' }); }
}
