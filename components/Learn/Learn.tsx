'use client';

import React, { useEffect, useState } from 'react'
import ModalVideo from 'react-modal-video'
import "react-modal-video/scss/modal-video.scss";
import { Loader, Grid, Card, Text, Badge } from '@mantine/core'; // Changed Spinner to Loader
import { collection, getDocs } from 'firebase/firestore';
import { fbfsdb } from '@/lib/firebase';
import Link from 'next/link';
import TikTok from './TikTok';
import type { BlogPost } from '@/types/story';

import classes from './Learn.module.css';

interface YouTubeVideo {
    vid_id: string;
    vid_description: string;
    vid_title: string;
    vid_publishDate: string;
    vid_image: string;
    publish_date: string; // Firebase field name
}

interface LearningMaterials {
    youtube: YouTubeVideo[];
    blog: BlogPost[];
    tiktok: unknown[];
    instagram: unknown[];
}

interface LearnProps {
    blogPosts: BlogPost[];
}

export default function Learn({ blogPosts }: LearnProps) {
    const [learningMaterials, setLearningMaterials] = useState<LearningMaterials>({
        youtube: [],
        blog: [],
        tiktok: [],
        instagram: []
    })
    const [isOpen, setOpen] = useState(false)
    const [selectedVid, setSelectedVid] = useState<string | null>(null)
    const [loading, setLoading] = useState(true);

    const openYTModal = (vid_id: string) => {
        setSelectedVid(vid_id)
        setOpen(true)
    }

    useEffect(() => {
        document.title = `Numu Know - Learn`

        // get data directly from firebase
        const getLearningMaterialsYT = async () => {
            let allYTvids = await getDocs(collection(fbfsdb, `ytvids`));
            let ytvidsArr: YouTubeVideo[] = []
            allYTvids.forEach((video) => {
                let video_data = video.data();
                let docData: YouTubeVideo = {
                    "vid_id": video.id,
                    "vid_description": video_data['description'],
                    "vid_title": video_data['title'],
                    "vid_publishDate": video_data['publish_date'],
                    "vid_image": video_data['image'],
                    "publish_date": video_data['publish_date']
                }

                ytvidsArr.push(docData)
            });

            ytvidsArr.sort(function (a, b) {
                return new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime();
            });

            setLearningMaterials(prev => ({
                ...prev,
                youtube: ytvidsArr
            }))
            setLoading(false)
        }

        getLearningMaterialsYT().catch(() => {
            // Silently fail - YouTube videos are optional content
        });
    }, [])

    return (
        <div className={classes.container}>
            <div className={classes.section}>
                <div className={classes.sectionTitle}>Blog Posts</div>
                {
                    <div className={classes.blogList}>
                        <Grid justify="center" gutter="xl">
                            {blogPosts && blogPosts.map((item, index) => {
                                if (item.tags.includes(759719916)) {
                                    return null
                                }
                                return (
                                    <Grid.Col span={{ base: 12, sm: 6, md: 4 }} key={index}>
                                        <Link href={`/learn/${item.slug}`} style={{ textDecoration: 'none' }}>
                                            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%" className="blog-card">
                                                <Text fw={500} size="lg" lineClamp={2}>
                                                    {item.title.rendered}
                                                </Text>
                                                <Text size="sm" c="dimmed" mt="xs" lineClamp={3}>
                                                    Read this article
                                                </Text>
                                            </Card>
                                        </Link>
                                    </Grid.Col>
                                )
                            })}
                        </Grid>
                    </div>
                }
            </div>
            {/* <div id='tiktoksection'>
                    <div className='welcome'>TikTok Videos</div>
                    <TikTok />
                </div> */}
            <div className={classes.section}>
                <ModalVideo channel='youtube' isOpen={isOpen} videoId={selectedVid || ''} onClose={() => setOpen(false)} />
                <div className={classes.sectionTitle}>Youtube Videos</div>
                {
                    loading &&
                    <div className={classes.loadingContainer}>
                        <Loader size='xl' />
                    </div>
                }
                {
                    !loading &&
                    <div className={classes.videosContainer}>
                        {learningMaterials['youtube']?.map((item: YouTubeVideo, index: number) => {
                            return (
                                <div key={index} className={classes.videoCard} onClick={(() => { openYTModal(item.vid_id) })}>
                                    <img src={item.vid_image} alt={'youtube vid: ' + item.vid_id} referrerPolicy="no-referrer" className={classes.videoThumbnail} />
                                    <h3 className={classes.videoTitle}>{item.vid_title}</h3>
                                    <div className={classes.videoDescription}>{item.vid_description}</div>
                                </div>
                            )
                        })}
                    </div>
                }
            </div>
        </div>
    )
}
