// src/lib/server/Chat.js

// This class defines the Durable Object that will manage a single chat session.
export class Chat {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.sessions = [];
        this.lastTimestamp = Date.now();

        // Load messages from storage when the object is first created or woken up.
        this.state.storage.get('messages').then(messages => {
            this.messages = messages || [];
        });
    }

    // The fetch handler is called for every request made to the Durable Object.
    async fetch(request) {
        const url = new URL(request.url);
        const path = url.pathname;

        if (path.endsWith('/events')) {
            // This is a request to establish an SSE connection.
            return this.handleSse(request);
        } else if (path.endsWith('/messages') && request.method === 'POST') {
            // This is a request to post a new message.
            return this.handlePostMessage(request);
        }

        return new Response('Not found', { status: 404 });
    }

    // Handles Server-Sent Events connections.
    handleSse(request) {
        // SSE requires a specific response header.
        const headers = {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        };

        // Create a transform stream to pipe data to the client.
        const {readable, writable} = new TransformStream();
        const writer = writable.getWriter();
        
        const session = {
            writer,
            close: () => {
                try {
                    writer.close();
                } catch (e) {
                    // Ignore errors on close, the connection might already be gone
                }
            }
        };

        this.sessions.push(session);

        // Send existing messages to the new client
        this.messages.forEach(msg => this.sendEvent(writer, 'message', msg));

        // Handle the client disconnecting
        request.signal.addEventListener('abort', () => {
            const index = this.sessions.indexOf(session);
            if (index !== -1) {
                this.sessions.splice(index, 1);
            }
        });
        
        // Return the readable stream as the response body.
        return new Response(readable, { headers });
    }

    // Handles POST requests to add a new message.
    async handlePostMessage(request) {
        const message = await request.json();
        
        // Add a timestamp and store the message
        message.timestamp = Date.now();
        this.messages.push(message);

        // Persist the message to Durable Object storage
        await this.state.storage.put('messages', this.messages);
        
        // Broadcast the new message to all connected clients
        this.broadcast(message);

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Broadcasts a message to all connected SSE clients.
    broadcast(message) {
        this.sessions.forEach(session => {
            this.sendEvent(session.writer, 'message', message)
                .catch(() => {
                    // Remove session if sending fails
                    const index = this.sessions.indexOf(session);
                    if (index !== -1) {
                        this.sessions.splice(index, 1);
                    }
                });
        });
    }

    // Helper to format and send an SSE event.
    async sendEvent(writer, event, data) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        await writer.write(new TextEncoder().encode(payload));
    }
}
