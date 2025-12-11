// src/lib/server/LoginSession.js

export class LoginSession {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.sessions = []; // Stores active SSE connections (writable streams)
    }

    async fetch(request) {
        const url = new URL(request.url);

        // Path to establish SSE connection
        if (url.pathname.endsWith('/events')) {
            return this.handleSse();
        }
        
        // Path for the webhook to notify this DO that login is complete
        if (url.pathname.endsWith('/notify') && request.method === 'POST') {
            return this.handleNotify(request);
        }

        return new Response('Not found', { status: 404 });
    }

    // Handles Server-Sent Events connections.
    handleSse() {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        this.sessions.push(writer);

        // When the client disconnects, remove them from the sessions list
        readable.closed.finally(() => {
            const index = this.sessions.indexOf(writer);
            if (index !== -1) {
                this.sessions.splice(index, 1);
            }
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    }

    // Handles the notification from the main webhook handler
    async handleNotify(request) {
        try {
            const data = await request.json();
            
            // The data (e.g., { status: 'completed', tokenId: '...' }) is broadcast
            // to all listening clients (usually just one per LoginSession DO).
            this.broadcast('message', data);

            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (error) {
            console.error('Error in LoginSession handleNotify:', error);
            return new Response('Invalid request body', { status: 400 });
        }
    }

    // Broadcasts a message to all connected SSE clients.
    broadcast(event, data) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        const encoder = new TextEncoder();
        
        this.sessions.forEach(writer => {
            try {
                writer.write(encoder.encode(payload));
            } catch (e) {
                // If writing fails, the connection is likely closed.
                // The cleanup in handleSse will eventually remove it.
                console.warn('Failed to write to a session, it might be closed.');
            }
        });
    }
}
