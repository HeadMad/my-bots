// src/routes/api/chat/+server.js

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, platform }) {
  const CHAT = platform?.env?.CHAT;
  const id = CHAT.idFromName("global");
  const stub = CHAT.get(id);

  // Прокидываем запрос в Durable Object
  // Важно добавить заголовок, чтобы DO понял, что мы хотим SSE
  const newRequest = new Request(request);
  newRequest.headers.set("Accept", "text/event-stream");
  
  return stub.fetch(newRequest);
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, platform }) {
  const CHAT = platform?.env?.CHAT;
  const id = CHAT.idFromName("global");
  const stub = CHAT.get(id);

  // Читаем тело сообщения и передаем в DO
  // Можно передать request напрямую, но для надежности пересоздадим
  return stub.fetch(request);
}