<script>
  import { tick } from 'svelte';

  // --- Svelte 5 Runes ---
  let messages = $state([]); 
  let input = $state("");
  let username = $state("");
  let isJoined = $state(false);
  let chatBox = $state(); // Ссылка на элемент (bind:this)
  
  let ws;

  async function joinChat() {
    if (!username.trim()) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/api/ws?username=${encodeURIComponent(username)}`);

    ws.addEventListener('open', () => {
      isJoined = true;
    });

    ws.addEventListener('message', async (event) => {
      try {
        const response = JSON.parse(event.data);
        const { action, data } = response;

        if (action === 'history') {
          // В Svelte 5 присваивание массиву сразу вызывает обновление
          messages = data;
        } else if (action === 'message') {
          // Можно использовать push, но spread надежнее для реактивности массивов объектов
          messages = [...messages, data];
        } else if (action === 'notification') {
          messages = [...messages, { ...data, type: 'system' }];
        }
        
        // Ждем обновления DOM и скроллим
        await tick();
        scrollToBottom();
      } catch (e) {
        console.error("Ошибка JSON:", e);
      }
    });
  }

  function sendMessage(e) {
    // В Svelte 5 мы обрабатываем preventDefault вручную
    e.preventDefault();
    
    if (ws && input.trim()) {
      ws.send(input);
      input = "";
    }
  }
  
  function scrollToBottom() {
    if (chatBox) {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  }
</script>

<!-- Сниппеты (новая фишка Svelte 5) для переиспользования верстки -->
{#snippet messageItem(msg)}
  {#if msg.type === 'system'}
    <div class="system-msg">{msg.text}</div>
  {:else}
    <div class="message {msg.username === username ? 'my-message' : ''}">
      <div class="meta">
        <span class="author">{msg.username}</span>
        <span class="time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="text">{msg.text}</div>
    </div>
  {/if}
{/snippet}

<main>
  <h1>Chat</h1>

  {#if !isJoined}
    <!-- Экран входа -->
    <div class="login-screen">
      <input bind:value={username} placeholder="Введите ваше имя" />
      <button onclick={joinChat}>Войти в чат</button>
    </div>
  {:else}
    <!-- Экран чата -->
    <div class="chat-container">
      <div class="chat-header">
        Вы вошли как: <strong>{username}</strong>
      </div>

      <!-- bind:this теперь работает с $state переменной -->
      <div class="chat-box" bind:this={chatBox}>
        {#each messages as msg}
          <!-- Рендерим сниппет -->
          {@render messageItem(msg)}
        {/each}
      </div>

      <form onsubmit={sendMessage} class="input-area">
        <input bind:value={input} placeholder="Напишите сообщение..." />
        <button type="submit">Send</button>
      </form>
    </div>
  {/if}
</main>

<style>
  main { max-width: 600px; margin: 0 auto; font-family: sans-serif; }
  
  .login-screen { display: flex; gap: 10px; margin-top: 50px; justify-content: center; }
  
  .chat-box {
    border: 1px solid #ddd;
    height: 400px;
    overflow-y: auto;
    padding: 1rem;
    background: #f9f9f9;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Стили для сниппета наследуются глобально или должны быть здесь */
  .message {
    padding: 8px 12px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    max-width: 80%;
    align-self: flex-start;
  }

  .my-message {
    background: #e1ffc7;
    align-self: flex-end;
  }

  .system-msg {
    text-align: center;
    color: #888;
    font-size: 0.8rem;
    margin: 5px 0;
  }

  .meta { font-size: 0.75rem; color: #666; margin-bottom: 2px; display: flex; justify-content: space-between; gap: 10px;}
  .author { font-weight: bold; }
  
  .input-area { display: flex; gap: 10px; margin-top: 10px; }
  input { flex: 1; padding: 10px; border-radius: 4px; border: 1px solid #ccc;}
  button { padding: 10px 20px; cursor: pointer; }
</style>