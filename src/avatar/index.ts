// ORIRO CLI — avatar module (Step 1A). Pick 1 of 70 ORIRO-owned faces; it floats in the
// terminal and speaks (and listens) in its paired voice. Avatar = the face, the voice
// package = the voice, the coder = the brain — matched by voice_id. On-device, $0, owned.
//
// Models are NEVER bundled: images lazy-fetch from ORIRO's public endpoint; the voice
// (TTS/STT) is injected by the voice package via the voice seam. The avatar always
// renders (inline image or ASCII card) and the CLI never breaks if audio is unavailable.

export type { AvatarEntry } from "./manifest.js";
export {
  AVATARS,
  AVATAR_COUNT,
  AVATAR_ORIGIN,
  avatarCategories,
  avatarsInCategory,
  avatarBySlug,
  avatarImageUrl,
} from "./manifest.js";

export type { AvatarConfig } from "./config.js";
export {
  readAvatarConfig,
  writeAvatarConfig,
  isAvatarConfigured,
  getSelectedAvatar,
  setSelectedAvatar,
} from "./config.js";

export {
  ensureAvatarImage,
  isAvatarCached,
  readCachedAvatar,
  avatarCachePath,
  avatarCacheDir,
} from "./cache.js";

export type { ImageProtocol } from "./render.js";
export { detectImageProtocol, encodeInlineImage, renderCard, renderAvatar } from "./render.js";

export type { VoiceSynth, VoiceListen } from "./voice.js";
export {
  registerVoiceSynth,
  registerVoiceListen,
  hasVoice,
  hasMic,
  speak,
  listen,
  playWav,
} from "./voice.js";

export { selectAvatarInteractive, runAvatarOnboarding, previewAvatar } from "./onboarding.js";
