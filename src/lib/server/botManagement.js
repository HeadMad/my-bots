// src/lib/server/botManagement.js

import { subtle, getRandomValues } from 'crypto';

// Helper to derive key from a passphrase, useful for consistent key generation
async function deriveKey(passphrase, salt, usage = ['encrypt', 'decrypt']) {
    const enc = new TextEncoder();
    const keyMaterial = await subtle.importKey(
        "raw",
        enc.encode(passphrase),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
    return subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000, // A good balance for security and performance
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        usage
    );
}

// Encrypt function
export async function encryptBotToken(token, encryptionKey) {
    const iv = getRandomValues(new Uint8Array(12)); // AES-GCM recommended IV length
    const salt = getRandomValues(new Uint8Array(16)); // Salt for key derivation
    const key = await deriveKey(encryptionKey, salt, ['encrypt']);

    const encoded = new TextEncoder().encode(token);
    const ciphertext = await subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoded
    );

    // Concat IV, salt, and ciphertext for storage
    const fullBuffer = new Uint8Array(iv.byteLength + salt.byteLength + ciphertext.byteLength);
    fullBuffer.set(new Uint8Array(iv), 0);
    fullBuffer.set(new Uint8Array(salt), iv.byteLength);
    fullBuffer.set(new Uint8Array(ciphertext), iv.byteLength + salt.byteLength);

    return Buffer.from(fullBuffer).toString('base64');
}

// Decrypt function
export async function decryptBotToken(encryptedToken, encryptionKey) {
    const fullBuffer = Buffer.from(encryptedToken, 'base64');
    const iv = fullBuffer.slice(0, 12);
    const salt = fullBuffer.slice(12, 28); // IV is 12 bytes, salt is 16 bytes
    const ciphertext = fullBuffer.slice(28);

    const key = await deriveKey(encryptionKey, salt, ['decrypt']);

    const decrypted = await subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
    );

    return new TextDecoder().decode(decrypted);
}

