// src/routes/api/webhook/master/telegram/[hash]/+server.js

import telegrambo from 'telegrambo';
import { v4 as uuidv4 } from 'uuid';
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform, params }) {
    const { env } = platform;
    
    // 1. Validate the webhook secret hash
    const tokenParts = env.AUTH_BOT_TOKEN?.split(':');
    const expectedHash = tokenParts?.[1];

    if (!expectedHash || params.hash !== expectedHash) {
        return new Response('Unauthorized', { status: 401 });
    }

    const update = await request.json();

    if (!env.AUTH_BOT_TOKEN || !env.DB || !env.LOGIN_SESSION) {
        console.error('CRITICAL: Environment variables (AUTH_BOT_TOKEN, DB, LOGIN_SESSION) not set!');
        return json({ ok: false, error: 'Service not configured' }, { status: 500 });
    }

    const bot = telegrambo(env.AUTH_BOT_TOKEN);

    // Define Bot Logic
    bot.on('message', async (event) => {
        try {
            const text = event.text;
            if (!text || !text.startsWith('/start')) return;

            const loginHash = text.split(' ')[1];
            if (!loginHash) {
                return event.sendMessage({ text: "Welcome! Please use the login button on our website to sign in." });
            }

            // Find the token
            const tokenInfo = await env.DB.prepare('SELECT * FROM auth_tokens WHERE hash = ?').bind(loginHash).first();

            if (!tokenInfo || tokenInfo.status !== 'pending') {
                return event.sendMessage({ text: "This login link is invalid or has already been used. Please try again." });
            }

            // Check expiration
            const TOKEN_EXPIRATION_MINUTES = 5;
            const tokenDate = new Date(tokenInfo.created_at);
            const now = new Date();
            const minutesDiff = (now.getTime() - tokenDate.getTime()) / (1000 * 60);

            if (minutesDiff > TOKEN_EXPIRATION_MINUTES) {
                await env.DB.prepare('UPDATE auth_tokens SET status = ? WHERE id = ?').bind('expired', tokenInfo.id).run();
                return event.sendMessage({ text: "This login link has expired. Please try again." });
            }
            
            // Find or Create User
            const telegramUser = event.from;
            const providerUserId = telegramUser.id.toString();
            const providerName = 'telegram';
            let userId;

            const identity = await env.DB.prepare(
                'SELECT * FROM user_identities WHERE provider_name = ? AND provider_user_id = ?'
            ).bind(providerName, providerUserId).first();

            if (identity) {
                userId = identity.user_id;
                await env.DB.prepare(
                    `UPDATE users SET first_name = ?, last_name = ?, username = ? WHERE id = ?`
                ).bind(telegramUser.first_name, telegramUser.last_name || null, telegramUser.username || null, userId).run();
            } else {
                userId = uuidv4();
                await env.DB.batch([
                    env.DB.prepare(
                        `INSERT INTO users (id, first_name, last_name, username) VALUES (?, ?, ?, ?)`
                    ).bind(userId, telegramUser.first_name, telegramUser.last_name || null, telegramUser.username || null),
                    env.DB.prepare(
                        `INSERT INTO user_identities (id, user_id, provider_name, provider_user_id) VALUES (?, ?, ?, ?)`
                    ).bind(uuidv4(), userId, providerName, providerUserId)
                ]);
            }

            // Update the auth_token to 'completed'
            await env.DB.prepare('UPDATE auth_tokens SET status = ?, user_id = ? WHERE id = ?').bind('completed', userId, tokenInfo.id).run();

            // Notify the Durable Object
            const doId = env.LOGIN_SESSION.idFromName(loginHash);
            const stub = env.LOGIN_SESSION.get(doId);
            const notifyPayload = { status: 'completed', tokenId: tokenInfo.id };
            const notifyRequest = new Request(new URL(request.url).origin + '/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notifyPayload)
            });
            await stub.fetch(notifyRequest);
            
            // Send success message to user in Telegram
            await event.sendMessage({ text: `✅ Success! You are now logged in as ${telegramUser.first_name}. You can return to the website.` });

        } catch (e) {
            console.error("Error in bot message handler:", e);
            try {
                await event.sendMessage({ text: "Sorry, an internal error occurred. Please try again later." });
            } catch (sendError) {
                console.error("Failed to send error message to user:", sendError);
            }
        }
    });

    // Process the incoming update from Telegram
    await bot.setUpdate(update);

    // Return a 200 OK response to Telegram
    return json({ ok: true });
}
