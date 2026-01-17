'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { fbfsdb } from "@/lib/firebase";
import { getDoc, doc } from 'firebase/firestore';
import type { StoryContent, Highlights } from '@/types/story';
import ChosenDoc from './ChosenDoc';
import { getStoryAudioUrl } from '@/app/actions/story-actions';
import { useStories } from './StoriesContext';

export default function StoryContentWrapper() {
    const { isAdmin, user, setAudioUrl } = useStories();
    const [docContent, setDocContent] = useState<StoryContent | null>(null);
    const [docLoading, setDocLoading] = useState('loading'); // Start loading to prevent flash of empty state
    const [storyStatus, setStoryStatus] = useState<string>('');
    // const [audioUrl, setAudioUrl] = useState<string | null>(null); // -> Managed by Context now
    const [audioVisible, setAudioVisible] = useState(false);
    const [highlights, setHighlights] = useState<Highlights | false>(false);
    const [scrollTo, setScrollTo] = useState<string | null>(null);
    const [scrollHasHappened, setScrollHasHappened] = useState(false);
    const loadedDocRef = useRef<string | null>(null);

    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();

    // Derive chosen doc
    const slug = pathname?.replace("/stories/", "").replace("/stories", "").replaceAll("/", "") || "";
    const decodedSlug = decodeURIComponent(slug);
    const docToSee = slug.length > 0 ? decodedSlug : 'A Bird Story'; // Default on desktop
    const docIsSelected = slug.length > 0 ? 'docisselected' : 'docnotselected';

    // Handle URL params
    useEffect(() => {
        if (searchParams) {
            if (searchParams.has('highlights')) {
                const hl = searchParams.get('highlights');
                if (hl) {
                    try {
                        setHighlights(JSON.parse(hl));
                    } catch (error) {
                        console.error('Failed to parse highlights from URL:', error);
                        setHighlights(false);
                    }
                }
            }

            if (searchParams.has('scrollTo')) {
                setScrollTo(searchParams.get('scrollTo'));
            } else {
                setScrollTo(null);
            }
        }
    }, [searchParams]);

    const loadStoryContent = useCallback(async (chosendoc: string) => {
        if (!chosendoc) {
            setDocLoading('notloading');
            return;
        }

        try {
            let storyContent = null;
            let status = '';
            let fetchedAudioUrl = null;

            const [audioRes, storyLive] = await Promise.all([
                getStoryAudioUrl(chosendoc),
                getDoc(doc(fbfsdb, `documents/${chosendoc}`))
            ]);

            if (audioRes.success) {
                fetchedAudioUrl = audioRes.data || null;
            }

            if (storyLive.exists()) {
                storyContent = storyLive.data()['item']['data'];
                status = 'live';
            } else if (isAdmin) {
                let storyDraft = await getDoc(doc(fbfsdb, `drafts/${chosendoc}`));
                if (storyDraft.exists()) {
                    storyContent = storyDraft.data()['data'];
                    status = 'draft';
                }
            }

            if (storyContent) {
                setDocContent(storyContent);
                setStoryStatus(status);
                setAudioUrl(fetchedAudioUrl); // Context update
                setAudioVisible(!!fetchedAudioUrl);
                loadedDocRef.current = chosendoc;
            } else {
                setDocContent([]);
                setAudioUrl(null); // Context update
                setAudioVisible(false);
            }
        } catch (e) {
            setDocContent([]);
            setAudioUrl(null); // Context update
            setAudioVisible(false);
        } finally {
            setDocLoading('notloading');
        }
    }, [isAdmin, setAudioUrl]);

    // Effect to load content
    useEffect(() => {
        if (docToSee) {
            // Only set loading if it's a new doc, otherwise we might just be re-running due to admin/auth check
            if (loadedDocRef.current !== docToSee) {
                setDocLoading('loading');
            }
            loadStoryContent(docToSee);
        }
    }, [docToSee, loadStoryContent]);

    const selectDoc = (chosendoc: string): void => {
        router.push("/stories/" + encodeURIComponent(chosendoc));
    }

    return (
        <ChosenDoc
            isAdmin={isAdmin}
            user={user?.uid}
            highlights={highlights}
            scrollTo={scrollTo}
            docIsSelected={docIsSelected}
            setHighlights={setHighlights}
            getData={loadStoryContent}
            selectDoc={selectDoc}
            chosenDoc={docToSee}
            docContent={docContent}
            docLoading={docLoading}
            storyStatus={storyStatus}
            setAudioVisible={setAudioVisible}
            audioUrl={null} // Audio player is now globally handled
        />
    );
}
