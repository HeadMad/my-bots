// src/routes/api/auth/events/[hash]/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, platform, params }) {
    const hash = params.hash;
    const LOGIN_SESSION = platform?.env?.LOGIN_SESSION;

    if (!LOGIN_SESSION) {
        return json({ error: 'Service not configured' }, { status: 500 });
    }
    if (!hash) {
        return json({ error: 'Hash parameter is required' }, { status: 400 });
    }

    try {
        // Get the specific DO instance based on the login hash
        const id = LOGIN_SESSION.idFromName(hash);
        const stub = LOGIN_SESSION.get(id);

        // Forward the request to the DO's '/events' handler to establish the SSE connection
        // The DO itself will handle the SSE protocol
        const sseRequest = new Request(new URL(request.url).origin + '/events', request);
        return stub.fetch(sseRequest);

    } catch (error) {
        console.error('Error connecting to LoginSession DO:', error);
        return json({ error: 'Failed to establish event stream' }, { status: 500 });
    }
}
