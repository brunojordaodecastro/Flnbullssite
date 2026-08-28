import { env } from "cloudflare:workers";

/**
 * Returns the Cloudflare R2 bucket bound as PLAYER_MEDIA.
 * Used to store and retrieve player avatar photos.
 */
export function getR2(): R2Bucket {
  if (!env.PLAYER_MEDIA) {
    throw new Error(
      "Cloudflare R2 binding `PLAYER_MEDIA` is unavailable. Set the `r2` field in .openai/hosting.json to `PLAYER_MEDIA`.",
    );
  }

  return env.PLAYER_MEDIA;
}

