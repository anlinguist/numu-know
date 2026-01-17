'use client';

import React, { useEffect, useState } from 'react';
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

function Search(props: SearchProps) {
    const [searchLoader, setSearchLoader] = useState('loading')
    const [results, setResults] = useState<Array<GroupedSearchResults[string]>>([])
    const [showClearSearch, setShowClearSearch] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [finalResults, setFinalResults] = useState<GroupedSearchResults>({})
    const [searchError, setSearchError] = useState('')

    const queryNumu = async (query: string | undefined): Promise<void> => {
        if (!query) return;

        // Client-side validation
        const trimmedQuery = query.trim();
        if (trimmedQuery.length === 0) {
            setSearchError('Search query cannot be empty');
            setSearchLoader('');
            return;
        }

        if (trimmedQuery.length > MAX_SEARCH_QUERY_LENGTH) {
            setSearchError(`Search query too long. Maximum ${MAX_SEARCH_QUERY_LENGTH} characters allowed.`);
            setSearchLoader('');
            return;
        }

        setSearchError('');

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
                setSearchError(errorData.error || 'Search failed');
                setSearchLoader('');
                return;
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
            const resultsArray = Object.values(groupedResults);

            setResults(resultsArray);
            setSearchLoader('');
        } catch (error) {
            setSearchError('Network error. Please try again.');
            setSearchLoader('');
        }
    }

    const newSearch = (e: React.FormEvent): void => {
        e.preventDefault();
        setResults([]);
        setSearchError('');
        setSearchLoader('loading');
        queryNumu(searchTerm);
    }

    useEffect(() => {
        if (props.opened && props.searchTerm) {
            setSearchTerm(props.searchTerm)
            queryNumu(props.searchTerm);
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
