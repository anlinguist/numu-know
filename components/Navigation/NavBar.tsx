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
import { doc, getDoc, deleteField, updateDoc } from '@firebase/firestore';

import classes from './Navigation.module.css';

interface NavBarProps {
    openLoginModal: () => void;
}

function NavBar({ openLoginModal }: NavBarProps) {
    const [userSignedIn, setUserSignedIn] = useState<React.ReactNode>(null);
    const [user, loading] = useAuthState(auth);
    const [opened, { open, close }] = useDisclosure(false); // For settings modal
    const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false); // For mobile drawer

    const [optedIntoBlogPosts, setOptedIntoBlogPosts] = useState(false);
    const [optedIntoStories, setOptedIntoStories] = useState(false);
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

    useEffect(() => {
        if (loading) return;

        if (user) {
            const photo_url = user.photoURL ? user.photoURL : default_photo.src;

            // eslint-disable-next-line react-hooks/set-state-in-effect -- existing auth-driven menu render; follow-up: derive the menu from `user` during render instead of storing JSX in state
            setUserSignedIn(
                <Menu shadow="md" width={200}>
                    <Menu.Target>
                        <Avatar src={photo_url} alt="user" radius="xl" style={{ cursor: 'pointer' }} />
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
            )
        } else {
            const photo_url = default_photo.src;
            setUserSignedIn(
                <Menu shadow="md" width={200}>
                    <Menu.Target>
                        <Avatar src={photo_url} alt="user" radius="xl" style={{ cursor: 'pointer' }} />
                    </Menu.Target>

                    <Menu.Dropdown>
                        <Menu.Item onClick={openLoginModal}>
                            Sign in
                        </Menu.Item>
                    </Menu.Dropdown>
                </Menu>
            )
        }
    }, [user, loading, openLoginModal, open]);

    const toggleBlogs = async () => {
        if (!user?.uid) return;
        if (optedIntoBlogPosts) {
            await updateDoc(doc(fbfsdb, `users/${user.uid}`), {
                newBlogPosts: deleteField()
            })
            setOptedIntoBlogPosts(false);
        } else {
            await updateDoc(doc(fbfsdb, `users/${user.uid}`), {
                newBlogPosts: true
            })
            setOptedIntoBlogPosts(true);
        }
    }

    const toggleStories = async () => {
        if (!user?.uid) return;
        if (optedIntoStories) {
            setOptedIntoStories(false);
            await updateDoc(doc(fbfsdb, `users/${user.uid}`), {
                newStories: deleteField()
            })
        } else {
            setOptedIntoStories(true);
            await updateDoc(doc(fbfsdb, `users/${user.uid}`), {
                newStories: true
            })
        }
    }

    return (
        <div className={classes.navbar}>
            <div className={classes.navbarFull}>
                <Link href="/" className={`${classes.link} ${pathname === "/" ? classes.linkActive : ""}`}>Home</Link>
                <Link href="/learn" className={`${classes.link} ${pathname?.startsWith("/learn") ? classes.linkActive : ""}`}>Learn</Link>
                <Link href="/stories" className={`${classes.link} ${pathname?.startsWith("/stories") ? classes.linkActive : ""}`}>Stories</Link>
            </div>

            {/* User Menu Group */}
            <Group gap="xs" style={{ marginLeft: '20px' }}>
                {userSignedIn}
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
                        color="dark"
                        size="md"
                    />
                    <Checkbox
                        label="Get updated about new interlinear stories"
                        checked={optedIntoStories}
                        onChange={toggleStories}
                        color="dark"
                        size="md"
                    />
                </Stack>
            </Modal>
        </div>
    )
}

export default NavBar;
