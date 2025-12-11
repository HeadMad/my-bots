// src/routes/api/auth/session/+server.js

import { json } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform, cookies }) {
    const { env } = platform;
    const { tokenId } = await request.json(); // Get tokenId from the SSE notification

    if (!env.DB) {
        return json({ error: 'Database not available' }, { status: 500 });
    }

    try {
        // 1. Verify the tokenId by checking its status in auth_tokens
        const tokenInfo = await env.DB.prepare(
            'SELECT user_id, status FROM auth_tokens WHERE id = ?'
        ).bind(tokenId).first();

        if (!tokenInfo || tokenInfo.status !== 'completed') {
            return json({ error: 'Invalid or incomplete login token' }, { status: 400 });
        }

        const userId = tokenInfo.user_id;

        // 2. Create a new session
        const sessionId = uuidv4();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days expiration

        await env.DB.prepare(
            'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
        ).bind(sessionId, userId, expiresAt.toISOString()).run();

        // 3. Set the session cookie
        cookies.set('sessionId', sessionId, {
            path: '/',
            httpOnly: true,
            secure: env.ENVIRONMENT !== 'development', // Use secure cookies in production
            sameSite: 'lax',
            expires: expiresAt
        });

        // 4. Optionally, clean up the auth_token to prevent reuse (mark as used or delete)
        // For now, let's mark it as used to keep a record, but could be deleted
        await env.DB.prepare('UPDATE auth_tokens SET status = ? WHERE id = ?').bind('used', tokenId).run();


        return json({ success: true, userId });

    } catch (error) {
        console.error('Error creating session:', error);
        return json({ error: 'Failed to create user session' }, { status: 500 });
    }
}
