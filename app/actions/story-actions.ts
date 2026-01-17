'use server';

// Server Actions for story operations
// This replaces client-side Firestore writes with server-side operations

import { getDb } from '@/lib/firebase-admin';
import { getAdminAuth, getAdminStorage } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { DEFAULT_STORY_AUTHOR, DEFAULT_STORY_VARIANT } from '@/lib/constants';
import { logger } from '@/lib/logger';
import type { StoryContent, Word } from '@/types/story';

interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Verify user authentication from token
 */
async function verifyUser(token: string): Promise<{ uid: string; isAdmin: boolean } | null> {
  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const db = getDb();
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    const isAdmin = userData?.['admin'] === true;

    return { uid, isAdmin };
  } catch (error) {
    logger.error('Auth verification failed', error);
    return null;
  }
}

/**
 * Get the signed audio URL for a story
 */
export async function getStoryAudioUrl(storyTitle: string): Promise<ActionResult<string | null>> {
  try {
    const bucket = getAdminStorage().bucket('numu-know.appspot.com'); // Or get default bucket
    // Note: The bucket name might need to be explicitly configured or retrieved from environment if not default.
    // Based on client usage: ref(storage, `stories/${chosenDoc}/${chosenDoc}.wav`)
    // The bucket name is usually default. If initializeApp is called without storageBucket, we might need to specify it.
    // Assuming default bucket for now.

    // Actually, getAdminStorage().bucket() with no args uses default if options provided, but our init doesn't provide storageBucket.
    // We should explicitly use the one implied by the project.
    // The bucket is typically `${projectId}.appspot.com` or custom.
    // Let's assume standard convention 'numu-know.appspot.com' or check env.

    // Better: check if the file exists first.
    // path: stories/${storyTitle}/${storyTitle}.wav

    // Wait, getDownloadURL on client provides a public long-lived URL if not protected rules.
    // Server side, getSignedUrl is common.
    // Or if public, we can just construct it.
    // But signedUrl is safer if we want to ensure existence.

    const file = bucket.file(`stories/${storyTitle}/${storyTitle}.wav`);

    // Check existence first
    const [exists] = await file.exists();
    if (!exists) {
      return { success: true, data: null };
    }

    // Construct public Download URL
    // Format: https://firebasestorage.googleapis.com/v0/b/[bucket]/o/[path]?alt=media
    // Path must be URL encoded.
    const encodedPath = encodeURIComponent(`stories/${storyTitle}/${storyTitle}.wav`);
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;

    return { success: true, data: publicUrl };
  } catch (error) {
    logger.error('Failed to get audio URL', error);
    return { success: false, error: 'Failed to retrieve audio' };
  }
}

/**
 * Create or update a story (draft or live)
 */
export async function saveStory(
  token: string,
  title: string,
  content: StoryContent,
  status: 'draft' | 'live' = 'draft'
): Promise<ActionResult<{ title: string }>> {
  try {
    const user = await verifyUser(token);
    if (!user || !user.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate inputs
    if (!title || title.trim().length === 0) {
      return { success: false, error: 'Title is required' };
    }

    if (!content || content.length === 0) {
      return { success: false, error: 'Story content is required' };
    }

    const db = getDb();
    const trimmedTitle = title.trim();

    // Prepare story data
    const storyData = {
      data: content,
      author: DEFAULT_STORY_AUTHOR,
      defaultVar: DEFAULT_STORY_VARIANT,
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
    };

    if (status === 'live') {
      // Save to live documents
      await db.collection('documents').doc(trimmedTitle).set({
        item: storyData
      });

      // Update live documents index
      await db.collection('allDocuments').doc('live').set({
        documents: require('firebase-admin').firestore.FieldValue.arrayUnion(trimmedTitle)
      }, { merge: true });

      logger.info('Story published to live', { title: trimmedTitle, uid: user.uid });
    } else {
      // Save to drafts
      await db.collection('drafts').doc(trimmedTitle).set(storyData);

      // Update drafts index
      await db.collection('allDocuments').doc('drafts').set({
        documents: require('firebase-admin').firestore.FieldValue.arrayUnion(trimmedTitle)
      }, { merge: true });

      logger.info('Story saved as draft', { title: trimmedTitle, uid: user.uid });
    }

    // Revalidate relevant pages
    revalidatePath('/stories');
    revalidatePath(`/stories/${trimmedTitle}`);

    return { success: true, data: { title: trimmedTitle } };
  } catch (error) {
    logger.error('Failed to save story', error);
    return { success: false, error: 'Failed to save story' };
  }
}

/**
 * Delete a story
 */
export async function deleteStory(
  token: string,
  title: string,
  status: 'draft' | 'live'
): Promise<ActionResult> {
  try {
    const user = await verifyUser(token);
    if (!user || !user.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const db = getDb();
    const collection = status === 'live' ? 'documents' : 'drafts';
    const indexDoc = status === 'live' ? 'live' : 'drafts';

    // Delete the story
    await db.collection(collection).doc(title).delete();

    // Remove from index
    await db.collection('allDocuments').doc(indexDoc).update({
      documents: require('firebase-admin').firestore.FieldValue.arrayRemove(title)
    });

    logger.info('Story deleted', { title, status, uid: user.uid });

    // Revalidate relevant pages
    revalidatePath('/stories');
    revalidatePath(`/stories/${title}`);

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete story', error);
    return { success: false, error: 'Failed to delete story' };
  }
}

/**
 * Update a single word in a story
 */
export async function updateWord(
  token: string,
  storyTitle: string,
  sentenceIndex: number,
  wordIndex: number,
  updatedWord: Word,
  status: 'draft' | 'live'
): Promise<ActionResult> {
  try {
    const user = await verifyUser(token);
    if (!user || !user.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const db = getDb();
    const collection = status === 'live' ? 'documents' : 'drafts';

    // Get the current story
    const storyDoc = await db.collection(collection).doc(storyTitle).get();
    if (!storyDoc.exists) {
      return { success: false, error: 'Story not found' };
    }

    const storyData = storyDoc.data();
    const content = status === 'live' ? storyData?.item?.data : storyData?.data;

    if (!content || !Array.isArray(content)) {
      return { success: false, error: 'Invalid story data' };
    }

    // Update the specific word
    const sentence = content[sentenceIndex];
    if ('words' in sentence && Array.isArray(sentence.words)) {
      sentence.words[wordIndex] = updatedWord;

      // Save updated content
      if (status === 'live') {
        await db.collection(collection).doc(storyTitle).update({
          'item.data': content,
          'item.updatedAt': new Date().toISOString(),
          'item.updatedBy': user.uid,
        });
      } else {
        await db.collection(collection).doc(storyTitle).update({
          data: content,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid,
        });
      }

      logger.info('Word updated', { storyTitle, sentenceIndex, wordIndex, uid: user.uid });

      // Revalidate the story page
      revalidatePath(`/stories/${storyTitle}`);

      return { success: true };
    }

    return { success: false, error: 'Invalid sentence structure' };
  } catch (error) {
    logger.error('Failed to update word', error);
    return { success: false, error: 'Failed to update word' };
  }
}

/**
 * Publish a draft to live
 */
export async function publishDraft(
  token: string,
  title: string
): Promise<ActionResult> {
  try {
    const user = await verifyUser(token);
    if (!user || !user.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const db = getDb();

    // Get draft
    const draftDoc = await db.collection('drafts').doc(title).get();
    if (!draftDoc.exists) {
      return { success: false, error: 'Draft not found' };
    }

    const draftData = draftDoc.data();

    // Publish to live
    await db.collection('documents').doc(title).set({
      item: {
        ...draftData,
        publishedAt: new Date().toISOString(),
        publishedBy: user.uid,
      }
    });

    // Update live documents index
    await db.collection('allDocuments').doc('live').set({
      documents: require('firebase-admin').firestore.FieldValue.arrayUnion(title)
    }, { merge: true });

    // Optionally remove from drafts
    await db.collection('drafts').doc(title).delete();
    await db.collection('allDocuments').doc('drafts').update({
      documents: require('firebase-admin').firestore.FieldValue.arrayRemove(title)
    });

    logger.info('Draft published to live', { title, uid: user.uid });

    // Revalidate pages
    revalidatePath('/stories');
    revalidatePath(`/stories/${title}`);

    return { success: true };
  } catch (error) {
    logger.error('Failed to publish draft', error);
    return { success: false, error: 'Failed to publish draft' };
  }
}

/**
 * Update user notification preferences
 */
export async function updateUserPreferences(
  token: string,
  preferences: {
    newStories?: boolean;
    newBlogPosts?: boolean;
  }
): Promise<ActionResult> {
  try {
    const user = await verifyUser(token);
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const db = getDb();
    await db.collection('users').doc(user.uid).update(preferences);

    logger.info('User preferences updated', { uid: user.uid, preferences });

    return { success: true };
  } catch (error) {
    logger.error('Failed to update preferences', error);
    return { success: false, error: 'Failed to update preferences' };
  }
}
