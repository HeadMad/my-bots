// src/routes/api/auth/login/+server.js
import { v4 as uuidv4 } from 'uuid';
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ platform }) {
    const db = platform?.env?.DB;

    if (!db) {
        return json({ error: 'Database not available' }, { status: 500 });
    }

    try {
        const id = uuidv4();
        const hash = uuidv4(); // Use uuid for hash as well for uniqueness

        await db.prepare(
            'INSERT INTO auth_tokens (id, hash, status, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)'
        ).bind(id, hash, 'pending').run();

        return json({ hash });
    } catch (error) {
        console.error('Error generating auth token:', error);
        return json({ error: 'Failed to generate auth token' }, { status: 500 });
    }
}
