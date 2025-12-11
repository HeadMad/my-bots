// src/hooks.server.js
import { initAllSchemas } from '$lib/server/schemas';

let schemasInitialized = false;

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
    if (!schemasInitialized) {
        if (event.platform && event.platform.env && event.platform.env.DB) {
            console.log('Initializing D1 schemas...');
            try {
                await initAllSchemas(event.platform.env.DB);
                schemasInitialized = true;
                console.log('D1 schemas initialized successfully.');
            } catch (error) {
                console.error('Failed to initialize D1 schemas:', error);
                // Depending on error handling strategy, might throw or just log.
                // For now, let's log and proceed, but this might lead to further errors.
            }
        } else {
            console.warn('D1 binding (platform.env.DB) not found. Schemas will not be initialized.');
            // In development, if not running via `wrangler pages dev`, DB might not be available.
            // schemasInitialized = true; // Optionally set to true to avoid repeated warnings
        }
    }

    const response = await resolve(event);
    return response;
}
