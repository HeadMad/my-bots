// src/lib/server/events.js
import { EventEmitter } from 'events';

// A simple, shared event emitter for the entire server instance.
// This is suitable for single-server deployments. For multi-server/serverless,
// a more robust solution like Redis Pub/Sub would be needed.
export const serverEvents = new EventEmitter();
