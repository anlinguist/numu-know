import React from 'react'

import classes from './Learn.module.css';

function TikTok() {
    React.useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://www.tiktok.com/embed.js";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        }
    }, []);

    return (
        <div className={classes.tiktokContainer}>
            <blockquote
                className={`tiktok-embed ${classes.tiktokEmbed}`}
                cite="https://www.tiktok.com/@tiktalkpaiute"
                data-unique-id="tiktalkpaiute"
                data-embed-type="creator"
            >
                <section>
                    <a target="_blank" href="https://www.tiktok.com/@tiktalkpaiute?refer=creator_embed" rel="noreferrer">@tiktalkpaiute</a>
                </section>
            </blockquote>
        </div>
    )
}

export default TikTok
