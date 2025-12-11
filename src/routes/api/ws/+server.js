// src/routes/api/ws/+server.js

/** @type {import('./$types').RequestHandler} */
export async function GET({ request, platform }) {
  const CHAT = platform?.env?.CHAT;
  if (!CHAT) return new Response("Error", { status: 500 });

  const id = CHAT.idFromName("global");
  const stub = CHAT.get(id);

  // request.url уже содержит ?username=..., поэтому просто прокидываем request
  return stub.fetch(request);
}