'use client';

import React, { useState, useEffect } from 'react';
import {
    Loader, // Replaces Spinner
    HoverCard,
    Modal,
    Button,
    Textarea,
    Stack,
    Group,
    TextInput,
    ActionIcon,
    Title,
    Text,
    Badge,
    Menu,
    Box,
    Paper,
    ScrollArea,
    Alert
} from '@mantine/core'; // Replaces Chakra components
import classes from './Stories.module.css';
import { modals } from '@mantine/modals';
import { useDisclosure } from '@mantine/hooks'; // Replaces chakra useDisclosure
import { IoIosArrowRoundBack } from 'react-icons/io';
import { IoInformationCircle } from 'react-icons/io5';
import { FaRegEdit, FaTrash, FaEllipsisH } from 'react-icons/fa';
import { doc, setDoc, updateDoc, arrayRemove, arrayUnion, deleteDoc } from "firebase/firestore";
import { fbfsdb } from '@/lib/firebase';
import NewAtt from './NewAtt';
import Creator from './Creator';
import app from '@/lib/firebase';
import AudioPlayer from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import parse from 'html-react-parser';
import type { StoryContent, Highlights, Word, UserUID, NewAttribute } from '@/types/story';
import { sanitizeSearchHighlight } from '@/lib/sanitize';
import { updateWord as updateWordAction, deleteStory as deleteStoryAction, publishDraft } from '@/app/actions/story-actions';
import { auth } from '@/lib/firebase';
import { showSuccess, showError } from '@/lib/notifications';

interface ChosenDocProps {
    isAdmin: boolean;
    user: string | undefined;
    highlights: Highlights | false;
    docIsSelected: string;
    setHighlights: (h: Highlights | false) => void;
    getData: (doc: string) => void;
    selectDoc: (doc: string) => void;
    chosenDoc: string;
    docContent: StoryContent | null;
    docLoading: string;
    storyStatus: string;
    setAudioVisible: (v: boolean) => void;
    scrollTo: string | null;
    audioUrl: string | null;
}

function ChosenDoc({ isAdmin, user, highlights, docIsSelected, setHighlights, getData, selectDoc, chosenDoc, docContent, docLoading, storyStatus, setAudioVisible, scrollTo, audioUrl }: ChosenDocProps) {
    const [opened, { open, close }] = useDisclosure(false); // Mantine useDisclosure
    const [editWordDetails, setEditWordDetails] = useState<Word | null>(null);
    const [sentenceIndex, setSentenceIndex] = useState<number | null>(null);
    const [wordIndex, setWordIndex] = useState<number | null>(null);
    const [editingCurrentWordObj, setEditingCurrentWordObj] = useState<Word | null>(null);
    const [editWordLoading, setEditWordLoading] = useState(false);
    const [newAttributes, setNewAttributes] = useState<NewAttribute[]>([]);
    // audioUrl is now passed as prop
    const [isEditingContent, setIsEditingContent] = useState(false);

    const deleteAtt = (att: string) => {
        const newItems = { ...editingCurrentWordObj };
        delete newItems[att];
        setEditingCurrentWordObj(newItems);
    }

    const addAnAttribute = () => {
        // first, check that last attribute is completed
        if (newAttributes.length > 0) {
            let lastEl = newAttributes[newAttributes.length - 1]
            if (lastEl.attributeName.trim().length === 0) {
                return
            }
        }
        setNewAttributes(newAttributes => [...newAttributes, { attributeName: '', attributeValue: '' }])
    }

    const capitalize = (s: string) => {
        if (typeof s !== 'string') return ''
        return s.charAt(0).toUpperCase() + s.slice(1)
    }

    const closeModal = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditWordLoading(true);

        try {
            if (sentenceIndex !== null && wordIndex !== null && editingCurrentWordObj) {
                // Get Firebase ID token
                const token = await auth.currentUser?.getIdToken();
                if (!token) {
                    showError({ message: 'Authentication required' });
                    setEditWordLoading(false);
                    return;
                }

                // Use server action to update the word
                const result = await updateWordAction(
                    token,
                    chosenDoc,
                    sentenceIndex,
                    wordIndex,
                    editingCurrentWordObj,
                    storyStatus as 'draft' | 'live'
                );

                if (result.success) {
                    showSuccess({ message: 'Word updated successfully' });
                    // Refresh the story data
                    getData(chosenDoc);
                    close();
                } else {
                    showError({ message: result.error || 'Failed to update word' });
                }
            }
        } catch (error) {
            showError({ message: 'Failed to update word' });
        } finally {
            setEditWordLoading(false);
        }
    }

    const confirmDialog = (msg: string, labels: { confirm: string, cancel: string } = { confirm: 'Confirm', cancel: 'Cancel' }): Promise<boolean> => {
        return new Promise((resolve) => {
            modals.openConfirmModal({
                title: 'Please Confirm',
                centered: true,
                children: (
                    <Text size="sm">
                        {msg}
                    </Text>
                ),
                labels: labels,
                groupProps: { justify: 'space-between' },
                confirmProps: { color: 'dark' },
                onCancel: () => resolve(false),
                onConfirm: () => resolve(true),
            });
        });
    }

    const editWord = (word_obj: Word, sindex: number, windex: number) => {
        setEditWordDetails(word_obj);
        setEditingCurrentWordObj(word_obj)
        setSentenceIndex(sindex);
        setWordIndex(windex);
        setNewAttributes([]);
        open();
    }

    const editWordAtts = (word_obj: Word) => {
        if (!word_obj) return null;
        let word_obj_keys = Object.keys(word_obj)
        let priority = [
            'word',
            'morphology',
            'gloss',
            'notes'
        ]
        let sorted_word_obj_keys = word_obj_keys.sort(function (a, b) {
            let orderA = priority.indexOf(a);
            let orderB = priority.indexOf(b);
            if (orderA !== -1 && orderB !== -1) {
                return orderA - orderB;
            } else if (orderA !== -1) {
                return -1;
            } else if (orderB !== -1) {
                return 1;
            } else {
                return a.localeCompare(b);
            }
        });

        return (
            <Stack gap="sm">
                {sorted_word_obj_keys.map((att, index) => {
                    if (att.startsWith("variant")) {
                        return false
                    }
                    if (att === 'word') {
                        return (
                            <div key={`editAtt${index}`}>
                                <Textarea
                                    label={capitalize(att)}
                                    disabled
                                    value={(() => {
                                        const val = word_obj[att];
                                        if (typeof val === 'string') return val;
                                        if (val && typeof val === 'object' && 'value' in val) return (val as any).value;
                                        return '';
                                    })()}
                                    styles={{ label: { color: '#e5e5e5', marginBottom: '4px' } }}
                                />
                            </div>
                        )
                    }
                    return (
                        <div key={`editAtt${index}`}>
                            <Group justify="space-between" mb={4}>
                                <Title order={6} c="gray.3" size="sm" style={{ fontWeight: 700 }}>{capitalize(att)}</Title>
                                <ActionIcon
                                    size="sm"
                                    color="red"
                                    variant="subtle"
                                    onClick={() => deleteAtt(att)}
                                    aria-label="Delete attribute"
                                >
                                    <FaTrash size={12} />
                                </ActionIcon>
                            </Group>
                            <Textarea
                                defaultValue={(() => {
                                    const val = word_obj[att];
                                    if (typeof val === 'string') return val;
                                    if (val && typeof val === 'object' && 'value' in val) return (val as any).value;
                                    return '';
                                })()}
                                onChange={((e) => setTimeout(() => setEditingCurrentWordObj({
                                    ...editingCurrentWordObj,
                                    [att]: e.target.value
                                }), 5))}
                            />
                        </div>
                    )
                })}
            </Stack>
        )
    }

    const getWordAtts = (word_obj: Word) => {
        let word_obj_keys = Object.keys(word_obj)
        let priority = [
            'morphology',
            'gloss',
            'notes'
        ]
        let sorted_word_obj_keys = word_obj_keys.sort(function (a, b) {
            let orderA = priority.indexOf(a);
            let orderB = priority.indexOf(b);
            if (orderA !== -1 && orderB !== -1) {
                return orderA - orderB;
            } else if (orderA !== -1) {
                return -1;
            } else if (orderB !== -1) {
                return 1;
            } else {
                return a.localeCompare(b);
            }
        });

        return (
            <div>
                {sorted_word_obj_keys.map((att, attIndex) => {
                    if (att.startsWith("variant") || att === "word") {
                        return false
                    }
                    return (
                        <div className={classes.wordAttAndVal} key={`wordatt${attIndex}`}><span className={classes.wordAtt}>{capitalize(att)}</span><span>
                            {(() => {
                                const val = word_obj[att];
                                if (typeof val === 'string') return val;
                                if (val && typeof val === 'object' && 'value' in val) return (val as any).value;
                                return '';
                            })()}
                        </span></div>
                    )
                })}
            </div>
        )
    }

    const createNewDoc = () => {
        return (<Creator setHighlights={setHighlights} selectDoc={selectDoc} confirmDialog={confirmDialog} />)
    }

    const toggleStoryStatus = async () => {
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                showError({ message: 'Authentication required' });
                return;
            }

            if (storyStatus === 'draft') {
                const publishConfirmed = await confirmDialog('Are you sure you want to publish this draft?');
                if (!publishConfirmed) return;

                // Ask about Klaviyo notification
                const shouldNotify = await confirmDialog(
                    'Do you want to share this story with users who have subscribed to new stories?',
                    { confirm: 'Yes', cancel: 'No' }
                );

                // Send Klaviyo notification if requested
                if (shouldNotify) {
                    try {
                        await fetch('/api/newStory', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                story_title: chosenDoc,
                                story_content: docContent
                            })
                        });
                        showSuccess({ message: 'Story notification sent to subscribers' });
                    } catch (err) {
                        showError({ message: 'Failed to send notification, but continuing with publish' });
                    }
                }

                // Publish the draft using server action
                const result = await publishDraft(token, chosenDoc);
                if (result.success) {
                    showSuccess({ message: 'Story published successfully' });
                    getData(chosenDoc);
                } else {
                    showError({ message: result.error || 'Failed to publish story' });
                }
            } else {
                // Unpublish: move from live to draft
                const unpublishConfirmed = await confirmDialog('Are you sure you want to unpublish this story?');
                if (!unpublishConfirmed) return;

                // Use direct Firestore for unpublish (no server action exists yet)
                await updateDoc(doc(fbfsdb, `allDocuments/drafts`), {
                    documents: arrayUnion(chosenDoc)
                });
                await updateDoc(doc(fbfsdb, `allDocuments/live`), {
                    documents: arrayRemove(chosenDoc)
                });
                await setDoc(doc(fbfsdb, `drafts/${chosenDoc}`), {
                    data: docContent
                });
                await deleteDoc(doc(fbfsdb, `documents/${chosenDoc}`));

                showSuccess({ message: 'Story unpublished successfully' });
                getData(chosenDoc);
            }
        } catch (err) {
            showError({ message: 'Failed to toggle story status' });
        }
    }

    const deleteStory = async () => {
        const confirmed = await confirmDialog(`Are you sure you want to delete "${chosenDoc}"? This cannot be undone.`);
        if (!confirmed) return;

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) {
                showError({ message: 'Authentication required' });
                return;
            }

            const result = await deleteStoryAction(
                token,
                chosenDoc,
                storyStatus as 'draft' | 'live'
            );

            if (result.success) {
                showSuccess({ message: 'Story deleted successfully' });
                selectDoc("");
            } else {
                showError({ message: result.error || 'Failed to delete story' });
            }
        } catch (err) {
            showError({ message: 'Failed to delete story' });
        }
    }

    const renderADoc = () => {
        // Pre-process content to group consecutive blocks
        const processedContent: (any)[] = [];

        const safeContent = docContent || [];

        safeContent.forEach((row, i) => {
            if ('block' in row) {
                const lastItem = processedContent[processedContent.length - 1];
                if (processedContent.length > 0 && lastItem && lastItem.isBlock) {
                    lastItem.blocks.push(row.block);
                } else {
                    processedContent.push({ isBlock: true, blocks: [row.block] });
                }
            } else {
                processedContent.push({ isBlock: false, data: row, index: i });
            }
        });

        return (
            <>
                {
                    processedContent.length > 0 &&
                    <Box pb="xl">
                        {
                            isAdmin &&
                            <Group justify="center" align="center" mb="lg" gap="xs">
                                <Title order={1} className={classes.docTitle}>{chosenDoc}</Title>
                                <Menu shadow="md" width={200} position="bottom-end">
                                    <Menu.Target>
                                        <ActionIcon variant="subtle" color="gray" aria-label="Story options">
                                            <FaEllipsisH size={16} />
                                        </ActionIcon>
                                    </Menu.Target>

                                    <Menu.Dropdown>
                                        <Menu.Label>Status: {storyStatus}</Menu.Label>
                                        <Menu.Item
                                            onClick={() => toggleStoryStatus()}
                                        >
                                            {storyStatus === 'draft' ? 'Publish to Live' : 'Revert to Draft'}
                                        </Menu.Item>

                                        <Menu.Divider />

                                        <Menu.Label>Management</Menu.Label>
                                        <Menu.Item
                                            leftSection={<FaRegEdit size={14} />}
                                            onClick={() => setIsEditingContent(true)}
                                        >
                                            Edit Content
                                        </Menu.Item>
                                        <Menu.Item
                                            color="red"
                                            leftSection={<FaTrash size={14} />}
                                            onClick={() => deleteStory()}
                                        >
                                            Delete Story
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Group>
                        }
                        {
                            !isAdmin &&
                            <Title order={1} className={classes.docTitle} ta="center" mb="lg">{chosenDoc}</Title>
                        }

                        {
                            processedContent.map((row, mapIndex) => {
                                if (row.isBlock) {
                                    return (
                                        <Alert variant="light" color="gray" icon={<IoInformationCircle />} key={`alert-${mapIndex}`} my="md" className={classes.informational}>
                                            <Stack gap="sm">
                                                {row.blocks.map((blockText: string, bIndex: number) => (
                                                    <Text key={bIndex}>{blockText.replace("```", "")}</Text>
                                                ))}
                                            </Stack>
                                        </Alert>
                                    )
                                }
                                else {
                                    const { data: storyRow, index } = row;
                                    let wordSet = storyRow.words
                                    return (
                                        <div className={classes.storyLine} key={index} id={`sentence-${index}`}>
                                            <div className={classes.storyOriginal}>
                                                {
                                                    wordSet.map((ind_word: Word, wordindex: number) => {
                                                        if (ind_word['word']) {
                                                            const hasAtts = Object.keys(ind_word).some(key => !key.startsWith('variant') && key !== 'word');
                                                            const shouldShowHover = isAdmin || hasAtts;
                                                            const isHighlighted = highlights && highlights[index] && Array.isArray(highlights[index]) && (highlights[index] as number[]).includes(wordindex);

                                                            if (!shouldShowHover) {
                                                                const wordVal = typeof ind_word['word'] === 'string' ? ind_word['word'] : (ind_word['word'] as any)?.value || '';
                                                                return (
                                                                    <span key={index.toString() + wordindex.toString()} className={`${classes.storyWord} ${isHighlighted ? classes.storyWordHighlighted : ''}`} style={{ cursor: 'default' }}>{wordVal}</span>
                                                                )
                                                            }

                                                            return (
                                                                <HoverCard key={index.toString() + wordindex.toString()} width={300} position="top" withArrow arrowSize={12} shadow="md" offset={-5}>
                                                                    <HoverCard.Target>
                                                                        <span style={{ cursor: 'pointer' }} className={`${classes.storyWord} ${isHighlighted ? classes.storyWordHighlighted : ''}`}>
                                                                            {typeof ind_word['word'] === 'string' ? ind_word['word'] : (ind_word['word'] as any)?.value}
                                                                        </span>
                                                                    </HoverCard.Target>
                                                                    <HoverCard.Dropdown className='numuknowpopup'>
                                                                        <div className='numuknowpopupcontent' style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                                                            {
                                                                                isAdmin &&
                                                                                <FaRegEdit className='adminEditWordAtts' style={{ cursor: 'pointer', float: 'right', marginBottom: '5px' }} onClick={((e) => editWord(ind_word, index, wordindex))} />
                                                                            }
                                                                            {getWordAtts(ind_word)}
                                                                        </div>
                                                                    </HoverCard.Dropdown>
                                                                </HoverCard>
                                                            )
                                                        }
                                                        else if (ind_word['punctuation']) {
                                                            const pVal = typeof ind_word['punctuation'] === 'string' ? ind_word['punctuation'] : (ind_word['punctuation'] as any)?.value;
                                                            const displayVal = pVal?.trim();
                                                            const isOpening = ["“", "\"", "‘", "(", "[", "{", "«"].includes(displayVal);

                                                            return (
                                                                <span
                                                                    key={index.toString() + wordindex.toString()}
                                                                    className={isOpening ? classes.openingQuote : ''}
                                                                >
                                                                    {displayVal}
                                                                </span>
                                                            )
                                                        }
                                                        return false
                                                    })
                                                }
                                            </div>
                                            <div className={classes.storyTranslation}>
                                                {(() => {
                                                    const tMatches = highlights && highlights['t-' + index];
                                                    if (tMatches && Array.isArray(tMatches)) {
                                                        let text = storyRow.translation;
                                                        (tMatches as string[]).forEach((word: string) => {
                                                            const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                                            text = text.replace(new RegExp(`(${safeWord})`, 'gi'), "<span class='matched_item'>$1</span>");
                                                        });
                                                        return <span>{parse(sanitizeSearchHighlight(text))}</span>;
                                                    } else if (tMatches) {
                                                        return <span className='matched_item'>{storyRow.translation}</span>
                                                    }
                                                    return storyRow.translation;
                                                })()}
                                            </div>
                                        </div>
                                    )
                                }
                            })
                        }

                        <Modal opened={opened} onClose={close} title="Edit Word" centered>
                            <form id='editWordForm' onSubmit={((e) => closeModal(e))}>
                                <Stack gap="md">
                                    {editWordDetails && editWordAtts(editWordDetails)}
                                    <>{newAttributes.map((newAtt, index) => {
                                        return (<NewAtt key={index} editingCurrentWordObj={editingCurrentWordObj} setEditingCurrentWordObj={setEditingCurrentWordObj} deleteAtt={deleteAtt} currentIndex={index} newAtt={newAtt} newAttributes={newAttributes} setNewAttributes={setNewAttributes} />)
                                    })}</>

                                    <Group grow mt="md">
                                        <Button variant="default" onClick={((e) => { addAnAttribute() })}>
                                            Add Attribute
                                        </Button>
                                        <Button loading={editWordLoading} color="dark" type='submit'>
                                            Confirm
                                        </Button>
                                    </Group>
                                </Stack>
                            </form>
                        </Modal>
                    </Box>
                }
                {
                    docContent && docContent.length === 0 && docLoading === 'notloading' &&
                    <div>
                        <div className={classes.docTitle}>Uh-Oh!</div>
                        <p className={classes.docNotFound}>We couldn't find that story.</p>
                    </div>
                }
            </>
        )
    }


    useEffect(() => {
        setIsEditingContent(false);
        document.title = `Numu Know - ${chosenDoc}`
    }, [chosenDoc]);

    useEffect(() => {
        if (docLoading !== 'docloading') {
            if (scrollTo) {
                setTimeout(() => {
                    const el = document.getElementById(`sentence-${scrollTo}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Also clear the overrides so user can scroll freely or subsequent scrolls work? 
                        // But we also want to ensure we don't just scroll to top 0 immediately.
                    }
                }, 500); // Small delay to ensuring rendering
            } else {
                document.querySelector('#documentContent')?.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }, [docLoading, scrollTo])



    return (
        <Box className={`${classes.chosenDoc} ${docIsSelected === 'docisselected' ? classes.visibleOnMobile : ''}`}>
            <IoIosArrowRoundBack onClick={() => { selectDoc("") }} id='backtodocs' className={classes.backToDocs} />
            {/* Note: back button styling is now in CSS module */}

            {docLoading !== 'notloading' && (
                <div className={classes.documentLoader}><Loader size='xl' /></div>
            )}

            <ScrollArea className={classes.documentContent} type="auto" viewportRef={(ref) => {
                // We need to attach the id documentContent to the viewport for scrolling logic or handle ref content
                // Original used document.querySelector('#documentContent')
                if (ref) ref.id = 'documentContent';
            }}>
                {chosenDoc === "createnewstory" ? (
                    createNewDoc()
                ) : isEditingContent ? (
                    <Creator
                        setHighlights={setHighlights}
                        selectDoc={(d) => {
                            selectDoc(d);
                            setIsEditingContent(false);
                        }}
                        confirmDialog={confirmDialog}
                        initialData={docContent || undefined}
                        initialTitle={chosenDoc}
                        initialStatus={storyStatus as any}
                        onCancel={() => setIsEditingContent(false)}
                    />
                ) : (
                    renderADoc()
                )}
            </ScrollArea>
        </Box>
    )
}

export default ChosenDoc;
