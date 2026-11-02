'use client';

import React, { useEffect, useState } from 'react';
import { auth, logout, fbfsdb } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import default_photo from '@/assets/def_prof_pic.jpeg';
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Modal,
    Checkbox,
    Stack,
    Avatar,
    Menu,
    Burger,
    Group,
    Drawer
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { doc, getDoc } from '@firebase/firestore';
import { updateUserPreferences } from '@/app/actions/story-actions';
import { showError } from '@/lib/notifications';

import classes from './Navigation.module.css';

interface NavBarProps {
    openLoginModal: () => void;
}

function NavBar({ openLoginModal }: NavBarProps) {
    const [user, loading] = useAuthState(auth);
    const [opened, { open, close }] = useDisclosure(false); // For settings modal
    const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false); // For mobile drawer

    const [optedIntoBlogPosts, setOptedIntoBlogPosts] = useState(false);
    const [optedIntoStories, setOptedIntoStories] = useState(false);
    // One save per preference at a time, so the checkbox can't drift from what was saved.
    const [saving, setSaving] = useState({ newStories: false, newBlogPosts: false });
    const pathname = usePathname();

    useEffect(() => {
        const obtainUD = async () => {
            if (!user?.uid) return;
            let userdoc = await getDoc(doc(fbfsdb, `users/${user.uid}`));
            if (userdoc.exists()) {
                let userdata = userdoc.data();
                if (userdata['newBlogPosts']) {
                    setOptedIntoBlogPosts(true);
                } else {
                    setOptedIntoBlogPosts(false);
                }
                if (userdata['newStories']) {
                    setOptedIntoStories(true);
                } else {
                    setOptedIntoStories(false);
                }
            }
        }

        if (user) {
            obtainUD().catch(() => {
                // User data fetch failed - will use defaults
            });
        }
    }, [user]);

    // The avatar menu is derived from the auth state; nothing renders until auth has resolved.
    const userMenu = loading ? null : user ? (
        <Menu shadow="md" width={200}>
            <Menu.Target>
                <Avatar src={user.photoURL ? user.photoURL : default_photo.src} alt="user" radius="xl" style={{ cursor: 'pointer' }} />
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Item onClick={open}>
                    Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" onClick={logout}>
                    Sign out
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    ) : (
        <Menu shadow="md" width={200}>
            <Menu.Target>
                <Avatar src={default_photo.src} alt="user" radius="xl" style={{ cursor: 'pointer' }} />
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Item onClick={openLoginModal}>
                    Sign in
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );

    const savePreference = async (
        key: 'newStories' | 'newBlogPosts',
        value: boolean,
        setOptedIn: (optedIn: boolean) => void
    ) => {
        if (saving[key]) return;
        setSaving((prev) => ({ ...prev, [key]: true }));
        const token = await user?.getIdToken().catch(() => null);
        const result = token
            ? await updateUserPreferences(token, { [key]: value }).catch(() => null)
            : null;
        if (result?.success) {
            setOptedIn(value);
        } else {
            showError({ message: 'Could not save your notification settings' });
        }
        setSaving((prev) => ({ ...prev, [key]: false }));
    }

    const toggleBlogs = () => savePreference('newBlogPosts', !optedIntoBlogPosts, setOptedIntoBlogPosts);

    const toggleStories = () => savePreference('newStories', !optedIntoStories, setOptedIntoStories);

    return (
        <div className={classes.navbar}>
            <div className={classes.navbarFull}>
                <Link href="/" className={`${classes.link} ${pathname === "/" ? classes.linkActive : ""}`}>Home</Link>
                <Link href="/learn" className={`${classes.link} ${pathname?.startsWith("/learn") ? classes.linkActive : ""}`}>Learn</Link>
                <Link href="/stories" className={`${classes.link} ${pathname?.startsWith("/stories") ? classes.linkActive : ""}`}>Stories</Link>
            </div>

            {/* User Menu Group */}
            <Group gap="xs" style={{ marginLeft: '20px' }}>
                {userMenu}
            </Group>


            {/* Mobile Menu Burger */}
            <div className={classes.navigationMenu}>
                <Burger opened={drawerOpened} onClick={toggleDrawer} aria-label="Toggle navigation" color='var(--mantine-color-text)' />
            </div>

            <Drawer opened={drawerOpened} onClose={closeDrawer} title="Navigation" padding="xl" size="xs">
                <Stack gap="md">
                    <Link href="/" className={`${classes.mobileLink} ${pathname === "/" ? classes.mobileLinkActive : ""}`} onClick={closeDrawer}>Home</Link>
                    <Link href="/learn" className={`${classes.mobileLink} ${pathname?.startsWith("/learn") ? classes.mobileLinkActive : ""}`} onClick={closeDrawer}>Learn</Link>
                    <Link href="/stories" className={`${classes.mobileLink} ${pathname?.startsWith("/stories") ? classes.mobileLinkActive : ""}`} onClick={closeDrawer}>Stories</Link>
                </Stack>
            </Drawer>

            <Modal opened={opened} onClose={close} title="Settings" centered>
                <Stack gap="lg">
                    <Checkbox
                        label="Get updated about new blog posts"
                        checked={optedIntoBlogPosts}
                        onChange={toggleBlogs}
                        disabled={saving.newBlogPosts}
                        color="dark"
                        size="md"
                    />
                    <Checkbox
                        label="Get updated about new interlinear stories"
                        checked={optedIntoStories}
                        onChange={toggleStories}
                        disabled={saving.newStories}
                        color="dark"
                        size="md"
                    />
                </Stack>
            </Modal>
        </div>
    )
}

export default NavBar;
