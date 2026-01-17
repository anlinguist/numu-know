'use client';

import { useEffect } from 'react';
import josue_pic from '@/assets/josue_wrpt_shirt.jpeg';
import welcomeData from '@/assets/welcome.json';
import {
    HoverCard,
    Stack,
    Container,
    Title,
    Text,
    Image,
    Group,
    Divider,
    Box
} from '@mantine/core';
import parse from 'html-react-parser';
import { sanitizeHTML } from '@/lib/sanitize';
import classes from './Home.module.css';

import type { BlogPost, Word, WelcomeContent } from '@/types/story';

const welcome = welcomeData as WelcomeContent;

interface HomeProps {
    blogPosts: BlogPost[];
}

function Home({ blogPosts }: HomeProps): React.JSX.Element {
    const capitalize = (s: string): string => {
        if (typeof s !== 'string') return '';
        return s.charAt(0).toUpperCase() + s.slice(1);
    };

    const getWordAtts = (word_obj: Word): React.JSX.Element => {
        const word_obj_keys = Object.keys(word_obj) as (keyof Word)[];
        const priority = [
            'morphology',
            'gloss',
            'notes'
        ];
        const sorted_word_obj_keys = word_obj_keys.sort((a, b) => {
            const aStr = String(a);
            const bStr = String(b);
            const firstIndex = priority.indexOf(aStr);
            const secondIndex = priority.indexOf(bStr);
            return (
                (firstIndex === -1 ? 5 : firstIndex) -
                (secondIndex === -1 ? 5 : secondIndex)
            );
        });

        return (
            <Stack gap="xs">
                {sorted_word_obj_keys.map((att) => {
                    // Ensure att is treated as a string for comparison
                    const attStr = String(att);
                    if (attStr.startsWith("variant") || attStr === "word" || attStr === "Word") {
                        return null;
                    }
                    const val = word_obj[att];
                    let displayVal = "";

                    if (typeof val === 'string') {
                        displayVal = val;
                    } else if (typeof val === 'object' && val !== null && 'value' in val) {
                        displayVal = val.value as string;
                    }

                    if (!displayVal) return null;

                    return (
                        <div className={classes.wordattandval} key={attStr}>
                            <span className={classes.wordatt}>{capitalize(attStr)}</span>
                            <span>{displayVal}</span>
                        </div>
                    );
                })}
            </Stack>
        );
    };

    useEffect(() => {
        document.title = `Numu Know`;
    }, []);


    return (
        <Container size="lg" className={classes.welcomedocumentpage}>
            <Title className={classes.welcome}>Pesa mu kemmana!</Title>

            <div className={classes.welcomeBlock}>
                <Image
                    src={josue_pic.src}
                    alt={'josue with walker river paiute tribe shirt'}
                    radius="md"
                    className={classes.welcomeBlockImg}
                />

                <Box className={classes.welcomeBlockTxt}>
                    {
                        welcome.data.map((row, index: number) => {
                            if ('block' in row) {
                                return (
                                    <Text className={classes.informational} key={index}>
                                        {row.block.replace("```", "")}
                                    </Text>
                                );
                            }
                            else {
                                const wordSet = row.words;
                                return (
                                    <div className={classes.storyline} key={index}>
                                        <div className={classes.storyOriginal}>
                                            {
                                                wordSet.map((ind_word, wordindex: number) => {
                                                    const wordText = typeof ind_word.word === 'object' ? ind_word.word.value : ind_word.word;
                                                    const punctText = typeof ind_word.punctuation === 'object' ? ind_word.punctuation.value : ind_word.punctuation;

                                                    if (wordText) {
                                                        return (
                                                            <HoverCard key={index.toString() + wordindex.toString()} width={300} position="top" withArrow arrowSize={12} shadow="md" offset={-5}>
                                                                <HoverCard.Target>
                                                                    <span className={classes.storyword}>{wordText}</span>
                                                                </HoverCard.Target>
                                                                <HoverCard.Dropdown>
                                                                    {getWordAtts(ind_word)}
                                                                </HoverCard.Dropdown>
                                                            </HoverCard>
                                                        );
                                                    }
                                                    else if (punctText) {
                                                        return (
                                                            <span key={index.toString() + wordindex.toString()}>{punctText}</span>
                                                        );
                                                    }
                                                    return null;
                                                })
                                            }
                                        </div>
                                        <Text className={classes.storyTranslation}>{row.translation}</Text>
                                    </div>
                                );
                            }
                        })
                    }
                </Box>
            </div>

            <Divider className={classes.divider} />

            {
                blogPosts.filter(post => post.id === 62).map((post, index) => {
                    const sanitizedContent = sanitizeHTML(post.content.rendered);
                    return (
                        <div key={`blogpost${index}`}>
                            <Title className={classes.welcome}>{post.title.rendered}</Title>
                            <div key={index} className={classes.welcomeabout}>
                                <div>{parse(sanitizedContent)}</div>
                            </div>
                        </div>
                    );
                })
            }
            <Divider className={classes.divider} />
            <Text className={classes.designedby}>The Numu-Know website was designed and developed by Andrew Nelson.</Text>
        </Container>
    );
}

export default Home;
