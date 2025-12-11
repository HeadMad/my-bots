// entry.js

// 1. Экспортируем класс DO (берем из исходников)
export { ChatRoom } from './src/lib/server/ChatRoom.js';
export { LoginSession } from './src/lib/server/LoginSession.js';

// 2. Импортируем готовый сервер SvelteKit (из скрытой папки)
import worker from './.svelte-kit/cloudflare/_worker.js';

// 3. Экспорт по умолчанию
export default worker;