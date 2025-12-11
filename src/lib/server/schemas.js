// src/lib/server/schemas.js

export async function initAuthSchema(db) {
    console.log("Initializing auth schema...");
    try {
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS auth_tokens (
                id TEXT PRIMARY KEY,
                hash TEXT NOT NULL UNIQUE,
                status TEXT NOT NULL,
                user_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
        `).run();

        await db.prepare(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                first_name TEXT,
                last_name TEXT,
                username TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
            );
        `).run();

        await db.prepare(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
        `).run();

        await db.prepare(`
            CREATE TABLE IF NOT EXISTS user_identities (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                provider_name TEXT NOT NULL, -- 'telegram', 'discord', 'google'
                provider_user_id TEXT NOT NULL,
                profile_data TEXT, -- JSON for extra info like access tokens, refresh tokens, etc.
                created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
        `).run();
        
        await db.prepare(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_user ON user_identities (provider_name, provider_user_id);
        `).run();

        console.log("Auth tables ensured (auth_tokens, users, sessions, user_identities).");
    } catch (error) {
        console.error("Error initializing auth schema:", error);
        throw error;
    }
}

export async function initBotSchema(db) {
    console.log("Initializing bots schema...");
    try {
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS bots (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                username TEXT,
                token_encrypted TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );
        `).run();
        console.log("Bots table ensured.");
    } catch (error) {
        console.error("Error initializing bots schema:", error);
        throw error;
    }
}

export async function initChatSchema(db) {
    console.log("Initializing chats schema...");
    try {
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS chats (
                id TEXT PRIMARY KEY,
                bot_id TEXT NOT NULL,
                telegram_chat_id TEXT NOT NULL,
                type TEXT NOT NULL,
                title TEXT,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (bot_id) REFERENCES bots (id),
                UNIQUE(bot_id, telegram_chat_id)
            );
        `).run();
        console.log("Chats table ensured.");
    } catch (error) {
        console.error("Error initializing chats schema:", error);
        throw error;
    }
}

export async function initMessageSchema(db) {
    console.log("Initializing messages schema...");
    try {
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                bot_id TEXT NOT NULL,
                chat_id TEXT NOT NULL,
                telegram_message_id TEXT NOT NULL,
                telegram_from_id TEXT NOT NULL,
                text TEXT,
                content_type TEXT NOT NULL DEFAULT 'text',
                content_data TEXT, -- JSON blob for photos, documents, etc.
                telegram_date TEXT NOT NULL,
                is_bot_message INTEGER NOT NULL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY (bot_id) REFERENCES bots (id),
                FOREIGN KEY (chat_id) REFERENCES chats (id),
                UNIQUE(chat_id, telegram_message_id)
            );
        `).run();
        console.log("Messages table ensured.");
    } catch (error) {
        console.error("Error initializing messages schema:", error);
        throw error;
    }
}

export async function initAllSchemas(db) {
    await initAuthSchema(db);
    await initBotSchema(db);
    await initChatSchema(db);
    await initMessageSchema(db);
}
