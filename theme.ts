'use client';

import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
    primaryColor: 'gray',
    colors: {
        // Override default 'dark' colors with neutral grays to remove blue tint
        // These are standard grays. You can adjust the hex codes for "very dark gray" preference.
        dark: [
            '#C1C2C5',
            '#A6A7AB',
            '#909296',
            '#5C5F66',
            '#373A40',
            '#2C2E33',
            '#25262B',
            '#1C1C1C', // 7 - Darker background
            '#141414', // 8 - Even darker
            '#0d0d0d', // 9 - Almost black
        ],
    },
    // Ensure the body background uses the very dark gray (index 7 or 8)
    other: {
        // Custom properties if needed
    },
});
