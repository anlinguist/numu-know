'use client';

import React, { useEffect, useState } from 'react';
import { Button, Divider, Modal, PasswordInput, Stack, Text, TextInput } from '@mantine/core';
import {
    getRedirectResult,
    signInWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    type User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { emailPasswordSignInEnabled } from '@/lib/auth-options';
import { ensureUserDoc } from '@/app/actions/story-actions';
import { showError } from '@/lib/notifications';

// Set just before a redirect sign-in, so only the page load that returns from it asks for the result.
const REDIRECT_PENDING_KEY = 'numu-know:google-redirect-pending';

// Popup failures that a full-page redirect can get around (common on mobile and in in-app browsers).
const REDIRECT_FALLBACK_CODES = new Set([
    'auth/popup-blocked',
    'auth/operation-not-supported-in-this-environment',
]);

// The user closed the popup or started another one: not an error worth reporting.
const SILENT_CODES = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request']);

const showEmailPassword = emailPasswordSignInEnabled(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

function errorCode(error: unknown): string {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === 'string' ? code : '';
}

function signInErrorMessage(code: string): string {
    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
        case 'auth/invalid-email':
            return 'Wrong email or password';
        case 'auth/too-many-requests':
            return 'Too many attempts. Try again later.';
        case 'auth/network-request-failed':
            return 'Could not reach the sign-in service. Check your connection.';
        case 'auth/unauthorized-domain':
            return 'Sign-in is not enabled for this site';
        default:
            return 'Could not sign in. Please try again.';
    }
}

// First sign-in: the server creates users/{uid} from the verified token (client writes are denied by the rules).
async function setUpUser(user: User): Promise<void> {
    const token = await user.getIdToken().catch(() => null);
    const result = token ? await ensureUserDoc(token).catch(() => null) : null;
    if (!result?.success) {
        showError({ message: 'Signed in, but your account settings could not be set up' });
    }
}

interface LoginModalProps {
    opened: boolean;
    onClose: () => void;
}

function LoginModal({ opened, onClose }: LoginModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);

    // Finish a Google sign-in that fell back to a redirect.
    useEffect(() => {
        let pending = false;
        try {
            pending = sessionStorage.getItem(REDIRECT_PENDING_KEY) === '1';
            sessionStorage.removeItem(REDIRECT_PENDING_KEY);
        } catch {
            // Storage unavailable: there is no redirect to finish.
        }
        if (!pending) return;
        getRedirectResult(auth)
            .then((result) => (result?.user ? setUpUser(result.user) : undefined))
            .catch((error) => showError({ message: signInErrorMessage(errorCode(error)) }));
    }, []);

    const finish = async (user: User) => {
        await setUpUser(user);
        setPassword('');
        onClose();
    };

    const signInWithGoogle = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await finish(result.user);
        } catch (error) {
            const code = errorCode(error);
            if (REDIRECT_FALLBACK_CODES.has(code)) {
                try {
                    sessionStorage.setItem(REDIRECT_PENDING_KEY, '1');
                } catch {
                    // Without storage the result is still applied by Firebase; only the user doc setup waits.
                }
                // Navigates away; the effect above finishes the sign-in when the page loads again.
                await signInWithRedirect(auth, googleProvider).catch((redirectError) =>
                    showError({ message: signInErrorMessage(errorCode(redirectError)) })
                );
            } else if (!SILENT_CODES.has(code)) {
                showError({ message: signInErrorMessage(code) });
            }
        } finally {
            setBusy(false);
        }
    };

    const signInWithEmail = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
            const result = await signInWithEmailAndPassword(auth, email.trim(), password);
            await finish(result.user);
        } catch (error) {
            showError({ message: signInErrorMessage(errorCode(error)) });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Sign in" centered>
            <Stack gap="md">
                <Button onClick={signInWithGoogle} loading={busy} color="dark" fullWidth>
                    Continue with Google
                </Button>

                {showEmailPassword && (
                    <>
                        <Divider label="or, on the dev project" labelPosition="center" />
                        <form onSubmit={signInWithEmail}>
                            <Stack gap="sm">
                                <TextInput
                                    label="Email"
                                    type="email"
                                    autoComplete="username"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.currentTarget.value)}
                                />
                                <PasswordInput
                                    label="Password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.currentTarget.value)}
                                />
                                <Button type="submit" variant="outline" color="dark" loading={busy} fullWidth>
                                    Sign in with email
                                </Button>
                                <Text size="xs" c="dimmed">
                                    For the dev test users only. Production offers Google sign-in.
                                </Text>
                            </Stack>
                        </form>
                    </>
                )}
            </Stack>
        </Modal>
    );
}

export default LoginModal;
