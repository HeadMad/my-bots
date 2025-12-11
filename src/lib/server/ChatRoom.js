// src/lib/server/ChatRoom.js

export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    // Нам больше не нужны this.sessions = new Map()!
    // Сокеты теперь живут внутри this.state
    
    this.history = [];
    
    // Восстанавливаем историю
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get("history");
      this.history = stored || [];
    });
  }

  async fetch(request) {
    const url = new URL(request.url);
    let username = url.searchParams.get("username") || "Аноним";

    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // --- МАГИЯ ГИБЕРНАЦИИ ---
    // 1. Принимаем сокет под управление State
    this.state.acceptWebSocket(server);

    // 2. Прикрепляем данные пользователя к сокету.
    // Это сохраняется даже если объект "уснет".
    server.serializeAttachment({ username });

    // 3. Отправляем историю лично этому пользователю
    server.send(JSON.stringify({ 
      action: "history", 
      data: this.history 
    }));

    // 4. Оповещаем остальных
    this.broadcast("notification", { text: `${username} вошел в чат` });

    return new Response(null, { status: 101, webSocket: client });
  }

  // --- ОБРАБОТЧИКИ СОБЫТИЙ (Строго определенные имена методов) ---

  // Вызывается Cloudflare, когда приходит сообщение
  async webSocketMessage(ws, message) {
    try {
      // Достаем сохраненные данные пользователя
      const attachment = ws.deserializeAttachment();
      const username = attachment.username;
      
      // message - это сразу строка или ArrayBuffer
      const text = message; 

      const messageData = {
        id: crypto.randomUUID(),
        username: username,
        text: text,
        timestamp: Date.now()
      };

      this.addToHistory(messageData);
      this.broadcast("message", messageData);
    } catch (err) {
      console.error(err);
    }
  }

  // Вызывается при закрытии соединения
  async webSocketClose(ws, code, reason, wasClean) {
    const attachment = ws.deserializeAttachment();
    const username = attachment.username;
    
    // Сокет уже удален из списка getWebSockets() автоматически
    this.broadcast("notification", { text: `${username} вышел` });
  }

  async webSocketError(ws, error) {
    console.error("Socket error:", error);
  }

  // --- ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ---

  broadcast(action, data) {
    const payload = JSON.stringify({ action, data });
    
    // Получаем все активные сокеты через API Гибернации
    // Тэг 'tag' нам не нужен, берем все
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(payload);
      } catch (err) {
        // Если ошибка отправки, сокет, скорее всего, мертв,
        // Cloudflare сам почистит его позже, но можно закрыть явно
        ws.close();
      }
    }
  }

  addToHistory(message) {
    this.history.push(message);
    if (this.history.length > 50) this.history.shift();
    // Сохраняем в фоне, не ждем await
    this.state.storage.put("history", this.history);
  }
}