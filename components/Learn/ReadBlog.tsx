'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader } from '@mantine/core';
import parse from 'html-react-parser';
import { sanitizeHTML } from '@/lib/sanitize';
import type { BlogPost } from '@/types/story';

import classes from './Learn.module.css';

interface ReadBlogProps {
    slug: string;
}

function ReadBlog({ slug }: ReadBlogProps) {
    const [post, setPost] = useState<BlogPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async (): Promise<void> => {
            const response = await fetch(`https://public-api.wordpress.com/wp/v2/sites/sereneanlinguist.wordpress.com/posts?slug=${slug}`);
            const data = await response.json();
            setPost(data[0]);
            setIsLoading(false);
        };
        fetchPost();
    }, [slug]);

    const sanitizedContent = useMemo(() => {
        if (!post?.content?.rendered) return '';
        return sanitizeHTML(post.content.rendered);
    }, [post]);

    return (
        <>
            {isLoading ? (
                <div className={classes.loadingContainer}>
                    <Loader size='xl' />
                </div>
            ) : (
                <div className={classes.blogContainer}>
                    <h1>{post?.title?.rendered}</h1>
                    <div>{parse(sanitizedContent)}</div>
                </div>
            )}
        </>
    );
}

export default ReadBlog;
