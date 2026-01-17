'use client';

import dynamic from 'next/dynamic';
import { Loader, UnstyledButton, Box, Stack, ScrollArea, TextInput } from '@mantine/core';
import { useState, useRef } from 'react';
import classes from './Stories.module.css';
import { IoIosSearch, IoMdClose } from 'react-icons/io';
import type { Highlights } from '@/types/story';

const Search = dynamic(() => import('@/components/Search/Search'), {
    ssr: false,
});

interface DocsListProps {
    isAdmin: boolean;
    setHighlights: (highlights: Highlights | false) => void;
    docIsSelected: string;
    selectDoc: (doc: string) => void;
    getData: (doc: string) => void;
    chosenDoc: string;
    loading: string;
    documentList: string[];
    draftsList: string[];
}

function DocsList(props: DocsListProps) {
    const [fullscreen, setFullScreen] = useState('')
    const [showClearSearch, setShowClearSearch] = useState('hidden')
    const [searchTerm, setSearchTerm] = useState('')
    const blurInputRef = useRef<HTMLInputElement>(null)

    const createStory = () => {
        props.setHighlights(false)
        props.selectDoc('createnewstory')
    }

    const changedict = (doc: string) => {
        props.setHighlights(false)
        props.selectDoc(doc)
    }

    const numuknowsearch = async (event: React.FormEvent) => {
        event.preventDefault();
        blurAll();
        setFullScreen('fullscreen');
    }

    const blurAll = () => {
        // Use ref to blur the search input
        if (blurInputRef.current) {
            blurInputRef.current.blur();
        }
    }

    // Helper to toggle full screen off
    const handleSetFullScreen = () => {
        setFullScreen('');
    }

    return (
        <Box className={`${classes.documentSearchContainer} ${props.docIsSelected === 'docisselected' ? classes.hiddenOnMobile : ''}`}>
            <Search setHighlights={props.setHighlights} changedict={(e, doc) => changedict(doc)} opened={fullscreen !== ''} onClose={handleSetFullScreen} searchTerm={searchTerm} />

            <Box p="sm" className={classes.searchHeader}>
                <TextInput
                    placeholder="Search"
                    ref={blurInputRef}
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.currentTarget.value);
                        if (e.currentTarget.value === "") {
                            setShowClearSearch('hidden')
                        } else {
                            setShowClearSearch('')
                        }
                    }}
                    rightSection={
                        <>
                            {searchTerm && (
                                <IoMdClose
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setSearchTerm('')}
                                />
                            )}
                            {!searchTerm && <IoIosSearch />}
                        </>
                    }
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            numuknowsearch(e);
                        }
                    }}
                />
            </Box>

            <ScrollArea className={classes.documentsContainer} type="auto">
                {
                    props.documentList.length === 0 && props.loading !== 'notloading' &&
                    <div className={classes.documentLoader}><Loader size='xl' /></div>
                }
                <Stack gap="xs" className={classes.documentsList}>
                    {props.isAdmin && props.loading === 'notloading' && (
                        <UnstyledButton
                            onClick={createStory}
                            className={`${classes.indDoc} ${props.chosenDoc === 'createnewstory' ? classes.selectedDoc : ""}`}
                        >
                            Create a new story
                        </UnstyledButton>
                    )}
                    {
                        props.draftsList.length > 0 &&
                        props.draftsList.map((doc, index) => {
                            return (
                                <UnstyledButton
                                    onClick={() => changedict(doc)}
                                    className={`${classes.indDoc} ${props.chosenDoc === doc ? classes.selectedDoc : ""}`}
                                    key={`draft-${index}`}
                                >
                                    <span>{doc}</span><span className={classes.draftLabel}>{'(draft)'}</span>
                                </UnstyledButton>
                            )
                        })
                    }
                    {
                        props.documentList.map((doc, index) => {
                            return (
                                <UnstyledButton
                                    onClick={() => changedict(doc)}
                                    className={`${classes.indDoc} ${props.chosenDoc === doc ? classes.selectedDoc : ""}`}
                                    key={index}
                                >
                                    {doc}
                                </UnstyledButton>
                            )
                        }
                        )}
                </Stack>
            </ScrollArea>
        </Box>
    )
}

export default DocsList;
