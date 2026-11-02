'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Box } from '@mantine/core';
import classes from './Stories.module.css';
import DocsList from './DocsList';
import { auth, fbfsdb } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import type { User } from "firebase/auth";
import { getDoc, doc } from 'firebase/firestore';
import type { UserDocument, Highlights } from '@/types/story';
import StoriesContext from './StoriesContext';
import { useRouter, usePathname } from 'next/navigation';

import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';

type MetadataSetters = {
    setDocumentList: (documents: string[]) => void;
    setDraftsList: (drafts: string[]) => void;
    setIsAdmin: (isAdmin: boolean) => void;
    setNowLoading: (state: string) => void;
};

// Wraps the setters so they do nothing once `isCurrent()` turns false (the user has changed).
function settersWhile(set: MetadataSetters, isCurrent: () => boolean): MetadataSetters {
    return {
        setDocumentList: (documents) => { if (isCurrent()) set.setDocumentList(documents); },
        setDraftsList: (drafts) => { if (isCurrent()) set.setDraftsList(drafts); },
        setIsAdmin: (isAdmin) => { if (isCurrent()) set.setIsAdmin(isAdmin); },
        setNowLoading: (state) => { if (isCurrent()) set.setNowLoading(state); },
    };
}

// Loads the live story list and, for admins, the drafts list, reporting each piece as it arrives.
async function fetchMetadata(user: User | null | undefined, set: MetadataSetters): Promise<void> {
    // Live docs load regardless of user, so the public can see them.
    try {
        let allLiveFB = await getDoc(doc(fbfsdb, `allDocuments/live`));
        if (allLiveFB.exists()) {
            let allLive = allLiveFB.data();
            let allLiveDocuments: string[] = allLive['documents'];
            allLiveDocuments.sort((a: string, b: string) => a.localeCompare(b));
            set.setDocumentList(allLiveDocuments);
        } else {
            set.setNowLoading('notloading');
        }

        if (user) {
            let userDoc = await getDoc(doc(fbfsdb, `users/${user.uid}`))
            if (userDoc.exists()) {
                let userFields = userDoc.data() as UserDocument;
                if (userFields?.admin) {
                    set.setIsAdmin(true)
                    let allDraftsFB = await getDoc(doc(fbfsdb, `allDocuments/drafts`));
                    if (allDraftsFB.exists()) {
                        let allDraftsFull = allDraftsFB.data();
                        let allDrafts: string[] = allDraftsFull['documents']
                        allDrafts.sort((a: string, b: string) => a.localeCompare(b))
                        set.setDraftsList(allDrafts)
                    }
                } else {
                    set.setIsAdmin(false)
                }
            }
        }
        set.setNowLoading('notloading');
    } catch (err) {
        set.setNowLoading('notloading');
    }
}

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

    // On sign-out, drop the previous user's admin view right away (adjusting state during render).
    const [metadataUser, setMetadataUser] = useState(user);
    if (metadataUser !== user) {
        setMetadataUser(user);
        if (!user) {
            setIsAdmin(false);
            setDraftsList([]);
        }
    }

    // The user the latest metadata load is for; results for any other user are ignored.
    const activeUser = useRef(user);

    const loadMetadata = useCallback(
        () => fetchMetadata(user, settersWhile({ setDocumentList, setDraftsList, setIsAdmin, setNowLoading }, () => activeUser.current === user)),
        [user]
    );

    useEffect(() => {
        activeUser.current = user;
        let ignore = false;
        // Every state update happens once a Firestore read settles, never synchronously here,
        // and none happens after the user changes.
        fetchMetadata(user, settersWhile({ setDocumentList, setDraftsList, setIsAdmin, setNowLoading }, () => !ignore));
        return () => {
            ignore = true;
        };
    }, [user]);

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
