'use client';

import { useState, useCallback, useEffect } from 'react';
import { Box } from '@mantine/core';
import classes from './Stories.module.css';
import DocsList from './DocsList';
import { auth, fbfsdb } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { getDoc, doc } from 'firebase/firestore';
import type { UserDocument, Highlights } from '@/types/story';
import StoriesContext from './StoriesContext';
import { useRouter, usePathname } from 'next/navigation';

import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

export default function StoriesShell({ children }: { children: React.ReactNode }) {
    const [user] = useAuthState(auth);
    const [isAdmin, setIsAdmin] = useState(false);
    const [nowloading, setNowLoading] = useState("loading");
    const [documentList, setDocumentList] = useState<string[]>([]);
    const [draftsList, setDraftsList] = useState<string[]>([]);
    const [highlights, setHighlights] = useState<Highlights | false>(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    // State for Search/DocsList that needs to persist
    const router = useRouter();
    const pathname = usePathname();

    // Derive selected doc from URL for the list highlighting
    const slug = pathname?.replace("/stories/", "").replace("/stories", "").replaceAll("/", "") || "";
    const decodedSlug = decodeURIComponent(slug);
    // docIsSelected logic: if slug exists, we are viewing a doc.
    const docIsSelected = slug.length > 0 ? 'docisselected' : 'docnotselected';

    const loadMetadata = useCallback(async () => {
        // if (!user) return; // Allow public to see live docs? Logic suggests user check inside, but we need public access too.
        // Original code had `if (!user) return` but also loaded live docs. 
        // Let's load live docs regardless of user.

        try {
            let allLiveFB = await getDoc(doc(fbfsdb, `allDocuments/live`));
            if (allLiveFB.exists()) {
                let allLive = allLiveFB.data();
                let allLiveDocuments: string[] = allLive['documents'];
                allLiveDocuments.sort((a: string, b: string) => a.localeCompare(b));
                setDocumentList(allLiveDocuments);
            } else {
                setNowLoading('notloading');
            }

            if (user) {
                let userDoc = await getDoc(doc(fbfsdb, `users/${user.uid}`))
                if (userDoc.exists()) {
                    let userFields = userDoc.data() as UserDocument;
                    if (userFields?.admin) {
                        setIsAdmin(true)
                        let allDraftsFB = await getDoc(doc(fbfsdb, `allDocuments/drafts`));
                        if (allDraftsFB.exists()) {
                            let allDraftsFull = allDraftsFB.data();
                            let allDrafts: string[] = allDraftsFull['documents']
                            allDrafts.sort((a: string, b: string) => a.localeCompare(b))
                            setDraftsList(allDrafts)
                        }
                    } else {
                        setIsAdmin(false)
                    }
                }
            }
            setNowLoading('notloading');
        } catch (err) {
            setNowLoading('notloading');
        }
    }, [user]);

    useEffect(() => {
        loadMetadata();
    }, [loadMetadata]);

    const selectDoc = (chosendoc: string): void => {
        router.push("/stories/" + encodeURIComponent(chosendoc));
    }

    // Context value
    const contextValue = {
        isAdmin,
        user,
        documentList,
        draftsList,
        refreshMetadata: loadMetadata,
        nowloading,
        audioUrl,
        setAudioUrl
    };

    return (
        <StoriesContext.Provider value={contextValue}>
            <Box className={classes.documentPage}>
                <div className={classes.docViewer}>
                    <DocsList
                        isAdmin={isAdmin}
                        setHighlights={setHighlights}
                        docIsSelected={docIsSelected}
                        selectDoc={selectDoc}
                        getData={() => { }} // Not used in DocsList really, or used for "refresh"? DocsList triggers selectDoc mostly.
                        chosenDoc={decodedSlug || 'createnewstory'} // Fallback? Logic in DocsList highlights selected.
                        loading={nowloading}
                        documentList={documentList}
                        draftsList={draftsList}
                    />
                    {children}
                </div>
                {audioUrl && (
                    <div className={classes.audioFooter}>
                        <AudioPlayer
                            autoPlay
                            src={audioUrl}
                            style={{ boxShadow: 'none', background: 'var(--mantine-color-body)' }}
                        // Custom style to blend in or stick out?
                        // Default styles for h5-audio-player usually have white bg.
                        />
                    </div>
                )}
            </Box>
        </StoriesContext.Provider>
    );
}
