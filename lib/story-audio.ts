// Where a story's audio lives in Firebase Storage. Import-free so tests (and the dev seed's test) can load it.

/** The bucket holding story audio: the build's own Firebase config, so dev builds never read production storage. */
export function storyAudioBucket(env: { FIREBASE_STORAGE_BUCKET?: string; NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?: string }): string | null {
  const bucket = env.FIREBASE_STORAGE_BUCKET || env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '';
  return /^[a-z0-9][a-z0-9._-]*$/.test(bucket) ? bucket : null;
}

/** Object path of a story's audio (the path the story uploader has always used). */
export function storyAudioPath(storyTitle: string): string {
  return `stories/${storyTitle}/${storyTitle}.wav`;
}

/** Public download URL for a story's audio. Readable only if the bucket's storage rules allow public reads. */
export function storyAudioUrl(bucket: string, storyTitle: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storyAudioPath(storyTitle))}?alt=media`;
}
