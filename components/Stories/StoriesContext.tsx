'use client';

import { createContext, useContext } from 'react';

interface StoriesContextType {
    isAdmin: boolean;
    user: any; // Using any for Firebase user type simplicity, or specific type if available
    documentList: string[];
    draftsList: string[];
    refreshMetadata: () => void;
    nowloading: string;
    audioUrl: string | null;
    setAudioUrl: (url: string | null) => void;
}

const StoriesContext = createContext<StoriesContextType | undefined>(undefined);

export function useStories() {
    const context = useContext(StoriesContext);
    if (!context) {
        throw new Error('useStories must be used within a StoriesProvider');
    }
    return context;
}

export default StoriesContext;
