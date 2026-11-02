'use client';

import React, { useEffect, useRef, useState } from 'react';
import { IoMdClose, IoIosSearch } from 'react-icons/io';
import { Loader, TextInput, Modal } from '@mantine/core';
import { MAX_SEARCH_QUERY_LENGTH } from '@/lib/constants';
import SearchResults from './SearchResults';
import type { Highlights, AlgoliaSearchHit, GroupedSearchResults } from '@/types/story';
import classes from './Search.module.css';

interface SearchProps {
    onClose: () => void;
    changedict: (e: React.MouseEvent, title: string) => void;
    setHighlights: (highlights: Highlights | false) => void;
    searchTerm?: string;
    opened: boolean;
}

type SearchOutcome = { error: string } | { results: Array<GroupedSearchResults[string]> };

// Validates the query and asks /api/queryNumu, grouping the hits by story. Touches no React state.
async function searchNumu(query: string | undefined): Promise<SearchOutcome | null> {
    if (!query) return null;

    // Client-side validation
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
        return { error: 'Search query cannot be empty' };
    }

    if (trimmedQuery.length > MAX_SEARCH_QUERY_LENGTH) {
        return { error: `Search query too long. Maximum ${MAX_SEARCH_QUERY_LENGTH} characters allowed.` };
    }

    try {
        const sendObj = {
            q_type: 'simple',
            q_word: trimmedQuery
        };

        const response = await fetch('/api/queryNumu', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sendObj)
        });

        if (!response.ok) {
            const errorData = await response.json();
            return { error: errorData.error || 'Search failed' };
        }

        const hits: AlgoliaSearchHit[] = await response.json();

        // Group hits by storyID
        const groupedResults: GroupedSearchResults = {};
        if (Array.isArray(hits)) {
            hits.forEach((hit) => {
                const storyID = hit.storyID;
                if (!groupedResults[storyID]) {
                    groupedResults[storyID] = {
                        objectID: storyID,
                        storyTitle: hit.storyTitle || storyID,
                        sentenceHits: []
                    };
                }
                groupedResults[storyID].sentenceHits.push(hit);
            });
        }

        // Convert grouped object to array
        return { results: Object.values(groupedResults) };
    } catch (error) {
        return { error: 'Network error. Please try again.' };
    }
}

function Search(props: SearchProps) {
    const [searchLoader, setSearchLoader] = useState('loading')
    const [results, setResults] = useState<Array<GroupedSearchResults[string]>>([])
    const [showClearSearch, setShowClearSearch] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [finalResults, setFinalResults] = useState<GroupedSearchResults>({})
    const [searchError, setSearchError] = useState('')

    const applySearchOutcome = (outcome: SearchOutcome | null): void => {
        if (!outcome) return;
        if ('error' in outcome) {
            setSearchError(outcome.error);
        } else {
            setResults(outcome.results);
        }
        setSearchLoader('');
    }

    // Every search takes a new number; only the latest one may set state, so a slow
    // earlier search can't overwrite newer results.
    const latestSearch = useRef(0)

    const queryNumu = async (query: string | undefined): Promise<void> => {
        const request = ++latestSearch.current;
        const outcome = await searchNumu(query);
        if (request === latestSearch.current) {
            applySearchOutcome(outcome);
        }
    }

    const newSearch = (e: React.FormEvent): void => {
        e.preventDefault();
        setResults([]);
        setSearchError('');
        setSearchLoader('loading');
        queryNumu(searchTerm);
    }

    // When the modal opens (or the outer search term changes while it is open), seed the
    // input from the outer search term. This adjusts state during render rather than in an effect.
    const [seededFrom, setSeededFrom] = useState({ opened: false, searchTerm: '' })
    if (seededFrom.opened !== props.opened || seededFrom.searchTerm !== (props.searchTerm ?? '')) {
        setSeededFrom({ opened: props.opened, searchTerm: props.searchTerm ?? '' })
        if (props.opened && props.searchTerm) {
            setSearchTerm(props.searchTerm)
            setSearchError('')
        }
    }

    // ...and run that search. The request is the effect; its state updates happen once it settles.
    useEffect(() => {
        if (props.opened && props.searchTerm) {
            const request = ++latestSearch.current;
            searchNumu(props.searchTerm).then((outcome) => {
                if (request === latestSearch.current) {
                    applySearchOutcome(outcome);
                }
            });
        }
    }, [props.searchTerm, props.opened])



    // ... class definitions ...

    return (
        <Modal
            opened={props.opened}
            onClose={props.onClose}
            size="xl"
            padding="lg"
            title="Search Stories"
            styles={{ body: { minHeight: '60vh' } }}
        >
            <div className={classes.searchContent}>
                {/* Search Bar */}
                <div className={classes.searchBoxContainer}>
                    <TextInput
                        size="lg"
                        radius="xl"
                        placeholder="Search"
                        value={searchTerm}
                        error={searchError}
                        maxLength={MAX_SEARCH_QUERY_LENGTH}
                        onChange={(event) => {
                            setSearchTerm(event.currentTarget.value);
                            setSearchError('');
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                newSearch(event as any);
                            }
                        }}
                        leftSection={<IoIosSearch size={20} />}
                        rightSection={
                            searchTerm && (
                                <IoMdClose
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                        setSearchTerm('');
                                        setResults([]);
                                    }}
                                />
                            )
                        }
                    />
                </div>

                {/* Results or Loader */}
                <div className={classes.resultsContainerWrapper}>
                    {searchLoader === 'loading' && (
                        <div className={classes.searchLoaderOverlay}>
                            <Loader size="xl" />
                        </div>
                    )}

                    <div>
                        {results.map((result, index) => {
                            return (
                                <SearchResults onClose={props.onClose} finalResults={finalResults} setFinalResults={setFinalResults} key={index} result={result} />
                            )
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    )
}

export default Search
