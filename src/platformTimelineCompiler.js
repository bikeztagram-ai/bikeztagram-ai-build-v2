/* BIKEZTAGRAM AI — platform timeline compiler.
   Derives output variants from the master director timeline without changing
   source timing, story order, audio timing, motion or editorial decisions. */

import { buildPlatformFraming } from './platformReframe.js';

const PLATFORM_KEYS = ['instagramReel', 'tiktok', 'youtubeShorts', 'youtube', 'square'];

function cloneCut(cut, framing) {
  return {
    ...cut,
    sourceTiming: { startTime: cut.startTime, duration: cut.duration },
    platformFraming: {
      aspect: framing.output.aspect,
      width: framing.output.width,
      height: framing.output.height,
      crop: framing.crop,
      safeArea: framing.safeArea
    },
    preserved: {
      storyRole: cut.storyRole,
      storyOrder: cut.storyOrder,
      motion: cut.motionStyle,
      speed: { start: cut.speed, end: cut.speedEnd },
      transition: cut.transition,
      audioSync: cut.audioSync,
      beatTreatment: cut.beatTreatment
    }
  };
}

export function compilePlatformTimeline(masterTimeline, analysis = {}) {
  if (!masterTimeline?.cuts?.length) throw new Error('Master director timeline contains no cuts.');
  return {
    version: 'platform-timeline-v1',
    sourceVersion: masterTimeline.version,
    title: masterTimeline.title,
    targetDuration: masterTimeline.targetDuration,
    duration: masterTimeline.duration,
    source: 'bikeztagram-master-director-timeline',
    preserveMasterTimeline: true,
    preserveAudioTimeline: true,
    platforms: PLATFORM_KEYS.map((platform) => {
      const framing = buildPlatformFraming(analysis, platform);
      return {
        platform,
        output: framing.output,
        safeArea: framing.safeArea,
        crop: framing.crop,
        cuts: masterTimeline.cuts.map((cut) => cloneCut(cut, framing))
      };
    })
  };
}

export function assertPlatformTimelineParity(masterTimeline, platformTimeline) {
  const expected = masterTimeline?.cuts || [];
  for (const platform of platformTimeline?.platforms || []) {
    if (platform.cuts.length !== expected.length) throw new Error(`${platform.platform}: cut count changed.`);
    platform.cuts.forEach((cut, index) => {
      const source = expected[index];
      if (cut.startTime !== source.startTime || cut.duration !== source.duration) throw new Error(`${platform.platform}: source timing changed at cut ${index + 1}.`);
      if (cut.storyOrder !== source.storyOrder || cut.storyRole !== source.storyRole) throw new Error(`${platform.platform}: story order changed at cut ${index + 1}.`);
    });
  }
  return true;
}
