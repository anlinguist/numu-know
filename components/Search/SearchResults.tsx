import React, { useEffect, useState } from 'react';
import { Card, Text, Title, Stack, Divider, HoverCard, Button, ActionIcon, Group } from '@mantine/core';
import { IoOpenOutline } from 'react-icons/io5';
import Link from 'next/link';
import parse from 'html-react-parser';
import { sanitizeSearchHighlight } from '@/lib/sanitize';
import type { Highlights, Word, AlgoliaSearchHit, GroupedSearchResults } from '@/types/story';
import classes from './Search.module.css';

interface SearchResultsProps {
    result: GroupedSearchResults[string];
    changedict?: (e: React.MouseEvent, title: string) => void;
    setHighlights?: (highlights: Highlights | false) => void;
    onClose: () => void;
    finalResults?: GroupedSearchResults;
    setFinalResults?: (results: GroupedSearchResults) => void;
}

function SearchResults(props: SearchResultsProps) {
    const result = props.result;
    const storyTitle = result.storyTitle || result.objectID;

    // Construct highlights param and display nodes
    let display_nodes: React.ReactNode[] = [];
    let final_highlights: Highlights = {};
    let hasMatches = false;

    // Helper to render word attributes in tooltip
    // word_obj is the raw word object from hit.words (attributes are strings)
    const getWordAtts = (word_obj: Word) => {
        let word_obj_keys = Object.keys(word_obj)
        let priority = ['morphology', 'gloss', 'Gloss', 'note', 'Note', 'notes'];

        let sorted_keys = word_obj_keys.sort(function (a, b) {
            let orderA = priority.indexOf(a);
            let orderB = priority.indexOf(b);
            if (orderA !== -1 && orderB !== -1) return orderA - orderB;
            else if (orderA !== -1) return -1;
            else if (orderB !== -1) return 1;
            else return a.localeCompare(b);
        });

        return (
            <div className={classes.wordAttContainer}>
                {sorted_keys.map((att, attIndex) => {
                    if (att.startsWith("variant") || att === "word" || att === "punctuation") return null;
                    const val = word_obj[att];

                    // Handle both string and possible object structure just in case, but usually string in raw hit
                    let displayVal = "";
                    if (typeof val === 'string') {
                        displayVal = val;
                    } else if (val && typeof val === 'object' && 'value' in val) {
                        displayVal = String((val as any).value);
                    }

                    if (!displayVal) return null;

                    // Strip em tags if they exist in raw data (unlikely but safe)
                    displayVal = displayVal.replace(/<\/?em>/g, "");

                    return (
                        <div key={`wordatt${attIndex}`}>
                            <Text size="xs" c="dimmed" tt="uppercase" className={classes.wordAttLabel}>{att}</Text>
                            <Text size="sm">{displayVal}</Text>
                        </div>
                    )
                })}
            </div>
        )
    }

    if (result.sentenceHits && result.sentenceHits.length > 0) {
        // Sort hits by sIndex to show them in order
        const sortedHits = [...result.sentenceHits].sort((a: AlgoliaSearchHit, b: AlgoliaSearchHit) => a.sIndex - b.sIndex);

        sortedHits.forEach((hit: AlgoliaSearchHit, index: number) => {
            const sIndex = hit.sIndex;
            const highlightResult = hit._highlightResult;

            // Container for this sentence's matches
            let sentenceContent: React.ReactNode[] = [];
            let hitHasMatch = false;

            // --- Block Matches ---
            if (highlightResult && highlightResult.block && (highlightResult.block.matchLevel === 'full' || highlightResult.block.matchLevel === 'partial')) {
                const highlightedBlock = sanitizeSearchHighlight(highlightResult.block.value);

                sentenceContent.push(
                    <div key={'b-' + sIndex} className={classes.resultBlock}>
                        <Text
                            size="md"
                            style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}
                        >
                            {parse(highlightedBlock)}
                        </Text>
                    </div>
                );
                hitHasMatch = true;
            }

            // --- Sentence (Gloss) Display ---
            // hit.words is the array of raw word objects
            if (hit.words && Array.isArray(hit.words)) {
                let wordNodes: React.ReactNode[] = [];
                let matchedWordIndices: number[] = [];

                hit.words.forEach((word: Word, wIndex: number) => {
                    // Determine if this specific word is matched using highlightResult
                    let isWordMatch = false;
                    if (highlightResult && highlightResult.words && highlightResult.words[wIndex]) {
                        const wr = highlightResult.words[wIndex];

                        // Check ALL attributes for a match
                        isWordMatch = Object.keys(wr).some(att =>
                            wr[att] && (wr[att].matchLevel === 'full' || wr[att].matchLevel === 'partial')
                        );
                    }

                    if (isWordMatch) matchedWordIndices.push(wIndex);

                    // Get the word value to display
                    // Handle string vs object structure
                    let wordVal = "";
                    if (typeof word.word === 'string') wordVal = word.word;
                    else if (word.word && word.word.value) wordVal = word.word.value;
                    else if (typeof word.Word === 'string') wordVal = word.Word;
                    else if (word.Word && word.Word.value) wordVal = word.Word.value;

                    // We need to render the word value, potentially highlighted from algolia?
                    let displayHTML = wordVal;

                    // If the *value being displayed* (the word itself) was matched, get the highlighted version
                    const wordHighlight = highlightResult?.words?.[wIndex]?.word || highlightResult?.words?.[wIndex]?.Word;
                    if (wordHighlight && wordHighlight.matchLevel !== 'none' && wordHighlight.value) {
                        displayHTML = sanitizeSearchHighlight(wordHighlight.value);
                    }

                    // Check if word has attributes for tooltip
                    const hasAtts = Object.keys(word).some(k => !k.startsWith('variant') && k !== 'word' && k !== 'punctuation');

                    if (hasAtts) {
                        wordNodes.push(
                            <HoverCard key={`w-${sIndex}-${wIndex}`} withArrow shadow="md" withinPortal>
                                <HoverCard.Target>
                                    <span className={`${classes.storyWord} ${isWordMatch ? classes.highlighted : ''}`}>
                                        {parse(displayHTML)}
                                    </span>
                                </HoverCard.Target>
                                <HoverCard.Dropdown style={{ maxWidth: '300px', zIndex: 200 }}>
                                    {getWordAtts(word)}
                                </HoverCard.Dropdown>
                            </HoverCard>
                        )
                    } else if (word.punctuation) {
                        // Punctuation
                        let puncVal = "";
                        if (typeof word.punctuation === 'string') puncVal = word.punctuation;
                        else if (word.punctuation && word.punctuation.value) puncVal = word.punctuation.value;

                        // Match 'ChosenDoc' logic for quotes
                        if (puncVal === "“") {
                            if (wIndex === 0) {
                                wordNodes.push(
                                    <span key={`p-${sIndex}-${wIndex}`} className={classes.punctuationFirst}>{puncVal}</span>
                                )
                            } else {
                                wordNodes.push(
                                    <span key={`p-${sIndex}-${wIndex}`} className={classes.punctuation}>{puncVal}</span>
                                )
                            }
                        } else {
                            wordNodes.push(
                                <span key={`p-${sIndex}-${wIndex}`}>{puncVal}</span>
                            )
                        }
                    } else {
                        // Word without attributes and not punctuation
                        wordNodes.push(
                            <span key={`w-${sIndex}-${wIndex}`} className={classes.storyWord}>{parse(displayHTML)}</span>
                        )
                    }
                });

                if (matchedWordIndices.length > 0) {
                    final_highlights[sIndex] = matchedWordIndices;
                    hitHasMatch = true;
                }

                // If translation matched, we definitely want to show the sentence gloss too
                const translationMatch = highlightResult?.translation?.matchLevel === 'full' || highlightResult?.translation?.matchLevel === 'partial';

                // Render the row of words if there's any match in this sentence (block, words, or translation)
                if (hitHasMatch || translationMatch) {
                    const specificHighlights = {
                        [sIndex]: matchedWordIndices,
                        ...(highlightResult?.translation?.matchedWords ? { ['t-' + sIndex]: highlightResult.translation.matchedWords } : {})
                    };
                    const encodedSpecific = encodeURIComponent(JSON.stringify(specificHighlights));
                    const sentenceLink = `/stories/${result.objectID}?highlights=${encodedSpecific}&scrollTo=${sIndex}`;

                    sentenceContent.push(
                        <Group key={'gloss-' + sIndex} wrap="nowrap" align="flex-start" justify="space-between" className={classes.glossRow}>
                            <div className={classes.storyOriginal}>
                                {wordNodes}
                            </div>
                            <ActionIcon
                                component={Link}
                                href={sentenceLink}
                                onClick={props.onClose}
                                variant="subtle"
                                color="gray"
                                size="sm"
                                aria-label="Go to sentence"
                                ml="xs"
                            >
                                <IoOpenOutline />
                            </ActionIcon>
                        </Group>
                    );

                    // If we show gloss, we mark hasMatches true so we don't show fallback
                    hasMatches = true;
                }
            }


            // --- Translation Matches ---
            // Note: hit.translation can be string or object depending on data, but highlightResult always has value
            if (highlightResult && highlightResult.translation && (highlightResult.translation.matchLevel === 'full' || highlightResult.translation.matchLevel === 'partial')) {
                const highlightedTranslation = sanitizeSearchHighlight(highlightResult.translation.value);

                if (highlightResult.translation.matchedWords) {
                    final_highlights['t-' + sIndex] = highlightResult.translation.matchedWords;
                }

                sentenceContent.push(
                    <div key={'t-' + sIndex}>
                        <Text
                            size="md"
                            c="dimmed"
                            fs="italic"
                            style={{ lineHeight: 1.4 }}
                        >
                            {parse(highlightedTranslation)}
                        </Text>
                    </div>
                );
                hitHasMatch = true;
                hasMatches = true;
            } else if (hitHasMatch && hit.translation) {
                // Get raw translation value safely
                let transVal = "";
                if (typeof hit.translation === 'string') transVal = hit.translation;
                else if (hit.translation && hit.translation.value) transVal = hit.translation.value;

                sentenceContent.push(
                    <div key={'t-' + sIndex}>
                        <Text
                            size="md"
                            c="dimmed"
                            fs="italic"
                            style={{ lineHeight: 1.4 }}
                        >
                            {transVal}
                        </Text>
                    </div>
                );
            }

            if (sentenceContent.length > 0) {
                display_nodes.push(
                    <div key={`s-group-${sIndex}`}>
                        {sentenceContent}
                        <Divider my="sm" variant="dashed" />
                    </div>
                )
            }
        });
    }

    // Fallback if no specific matches found (e.g. title matched)
    if (!hasMatches && result.sentenceHits && result.sentenceHits.length > 0) {
        const firstHit = result.sentenceHits[0];
        let text = "";
        // Helper to extract text from block or translation
        const extractText = (obj: any) => {
            if (typeof obj === 'string') return obj;
            if (obj && typeof obj === 'object' && 'value' in obj) return String(obj.value);
            return "";
        }

        if (firstHit.block) {
            text = extractText(firstHit.block);
        }

        if (!text && firstHit.translation) {
            text = extractText(firstHit.translation);
        }

        if (text) {
            display_nodes.push(
                <Text key="fallback" size="sm" c="dimmed" lineClamp={3}>
                    {text}
                </Text>
            )
        }
    }

    const encoded_highlights = encodeURIComponent(JSON.stringify(final_highlights));

    return (
        <div className={classes.docCard}>
            <Card padding="lg" radius="md" withBorder={false} className="search-result-card">
                <div className={classes.resultHeader}>
                    <Title order={3} className={classes.resultTitle} mb={0}>
                        <Link href={`/stories/${result.objectID}?highlights=${encoded_highlights}`} onClick={props.onClose} className={classes.resultLink}>
                            {storyTitle}
                        </Link>
                    </Title>
                    <Button
                        component={Link}
                        href={`/stories/${result.objectID}?highlights=${encoded_highlights}`}
                        onClick={props.onClose}
                        variant="subtle"
                        size="xs"
                    >
                        See all
                    </Button>
                </div>

                <Stack gap="xs">
                    {display_nodes}
                </Stack>
            </Card>
        </div>
    )
}

export default SearchResults
