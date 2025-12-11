# Telegrambo

<br>Telegrambo is a simple library for interacting with the [Telegram Bot API](https://core.telegram.org/bots/api)

This library is based on the telegram API, so all methods of the bot instance will be [available methods](https://core.telegram.org/bots/api#available-methods) from the telegram list.

The context in the event handler also uses the available methods, while having ready-made fields in the arguments of these methods, such as *chat_id* or *message_id* and others. If necessary, you can overwrite these fields.

<br>

## Installation and Usage

### Installation

Install the package using your favorite package manager:

```bash
# npm
npm install telegrambo

# pnpm
pnpm add telegrambo

# yarn
yarn add telegrambo
```

### Node.js Usage

You can use either ES Modules or CommonJS.

**ES Modules (`import`)**
```javascript
import telegrambo from 'telegrambo';

const bot = telegrambo('YOUR_BOT_TOKEN');
```

**CommonJS (`require`)**
```javascript
const telegrambo = require('telegrambo');

const bot = telegrambo('YOUR_BOT_TOKEN');
```

### Browser Usage

**1. Using a Bundler (like Vite, Webpack)**

For modern bundlers, you can import the browser-optimized ES module for better tree-shaking:

```javascript
import telegrambo from 'telegrambo/browser';

const bot = telegrambo('YOUR_BOT_TOKEN');
```

**2. Using a `<script>` Tag**

You can include the library directly in your HTML page using the UMD bundle from a CDN like jsDelivr or unpkg. This will expose a global `telegrambo` variable.

```html



<script src="https://unpkg.com/telegrambo@1.2.0/dist/telegrambo.browser.umd.js"></script>
<!-- Or https://cdn.jsdelivr.net/npm/telegrambo@latest/dist/telegrambo.browser.umd.js -->

<script>
  const bot = telegrambo('YOUR_BOT_TOKEN');
  console.log('Bot initialized!', bot);
</script>
```

## Examples

### Basic Echo Bot

This is the simplest way to get started.

```js
// bot.js
import telegrambo from 'telegrambo';
const bot = telegrambo(process.env.YOU_BOT_TOKEN);

// Create echo-bot
bot.on('message', (event) => {
  return event.sendMessage({
    text: event.text
  });
});

export default bot;
```

### Using with a Webhook

```js
import bot from './bot.js';

export default async function handler(request, response) {
  // Listening webhook on POST-request
  if (request.method === 'POST') {

    // request.body must be a object.
    const handlerResults = await bot.setUpdate(request.body);
    console.log('Handler results:', handlerResults);

  // Set webhook if query-string of url have 'webhook':
  // https://my-syte.com?webhook
  } else if ('webhook' in request.query) {
    
    await bot.setWebhook({
      url: 'https://my-syte.com'
    });

  }

  return response.send('Ok');
}
```

### Using with Long Polling

```js
import bot from './bot.js';

(async () => {
  let offset = 0;
  const timeout = 60;

  while (true) {
    const {ok, result} = await bot.getUpdates({
      offset,
      timeout,
      limit: 100,
      allowed_updates: []
    });

    if (!ok) {
      console.error('Failed to get updates:', result);
      break;
    }
    
    if (!result.length)
      continue;
    
    for (let update of result) {
      await bot.setUpdate(update);
    }

    offset = result.at(-1).update_id + 1;
  }
})();
```

### Handling Different Event Types

List of events you can get from type [_Update_](https://core.telegram.org/bots/api#update) in official documentation.

```js
import telegrambo from 'telegrambo';
const bot = telegrambo(process.env.YOU_BOT_TOKEN);

// Handle a command to show a button
bot.on('message', (event) => {
  if (event.text === '/somedata') {
    event.sendMessage({
      text: 'Press the button and bot send some data',
      reply_markup: {
        inline_keyboard: [[{
          text: 'Send some data',
          callback_data: 'SOME DATA'
        }]]
      }
    });
  }
});

// Handle the button's callback query
bot.on('callback_query', (event) => {
  if (event.data === 'SOME DATA') {
    event.sendMessage({
      text: 'You press the button, and bot send <b>some data</b>',
      parse_mode: 'HTML'
    });
  }
});
```

### Catch-All Handler

If you pass only a function to `bot.on`, it will be applied to any event.

```js
import telegrambo from 'telegrambo';
const bot = telegrambo(process.env.YOU_BOT_TOKEN);

bot.on((event, eventName) => {
  const name = event.from.first_name;
  event.sendMessage({
    text:  `Hi, ${name}! The event <i>${eventName}</i> just happened`,
    parse_mode: 'HTML'
  });
});
```
<br>

## Error Handling

By default, any error inside a handler is caught and printed to the console via `console.error`. This ensures that one failed handler does not stop others from running.

For more granular control, the `bot.on` method returns an object with a `.catch()` method, allowing you to attach a specific error handler.

```js
bot.on('message', (event) => {
  // This handler will throw an error
  if (event.text === '/error') {
    throw new Error('This is a deliberate error!');
  }
  event.sendMessage({ text: 'No errors here!' });
})
.catch((error, event, eventName) => {
  // This function will be called only if the handler above throws
  console.log(`Caught an error in '${eventName}' handler: ${error.message}`);
  
  // You can then use event to respond, for example:
  event.sendMessage({ text: 'Sorry, something went wrong processing your request.' });
});
```
If the custom error handler (the function passed to `.catch()`) itself throws an error, that error will be caught internally, logged to `console.error`, and the processing of other handlers will continue. The original event handler's error will still be included in the `setUpdate` results.

<br>

## Own methods

<br>You can create own methods for bot. For example:

```js
import bot from './bot.js';

// Write function for creating new method
function createOnTextMethod(bot) {
  return (matchText, handler) => {
    return bot.on('message', (event) => {
      if (event.text === matchText)
        return handler(event);
      });
  };
};

// Initialize new method onText
bot.onText = createOnTextMethod;

// Run new method and attach a specific error handler
bot.onText('Hello', (event) => {
  return event.sendMessage({
    text: 'Hi there!'
  });
}).catch(console.error);
```
<br>

## Sending files

You can send files in three ways:
1.  Using the `file_id` of a file already on Telegram's servers.
2.  Using a file URL.
3.  Uploading a file from your computer.

<br>

**Sending a photo by URL**

```js
import bot from './bot.js';

bot.onText('/photo', (event) => {
  event.sendPhoto({
    photo: 'https://picsum.photos/200/300',
    caption: 'Random image'
  });
});
```
<br>

**Sending a document from a local file**

To send a local file, you need to pass a `Buffer` or a stream. It is recommended to use streams for large files.

```js
import bot from './bot.js';
import fs from 'fs';
import path from 'path';

bot.on('message', (event) => {
  if (event.text === '/doc') {
    const filePath = path.resolve('./document.pdf');
    
    // Check if the file exists
    if (fs.existsSync(filePath)) {
      event.sendDocument({
        document: fs.createReadStream(filePath),
        caption: 'This is my document'
      });
    } else {
    event.sendMessage({ text: 'File not found!' });
  }
});

// Sending a document from a Buffer
bot.on('message', (event) => {
  if (event.text === '/bufferdoc') {
    const buffer = Buffer.from('This is a test document from a buffer.', 'utf8');
    event.sendDocument({
      document: {
        source: buffer,
        filename: 'buffer_doc.txt',
        contentType: 'text/plain'
      },
      caption: 'This is my document from a buffer'
    });
  }
});
```
<br>

**Sending a media group**

You can send multiple photos and videos in one message.

```js
import bot from './bot.js';
import fs from 'fs';
import path from 'path';

bot.on('message', (event) => {
  if (event.text === '/media') {
    const photoPath1 = path.resolve('./photo1.jpg');
    const photoPath2 = path.resolve('./photo2.jpg');

    event.sendMediaGroup({
      media: [
        {
          type: 'photo',
          media: fs.createReadStream(photoPath1)
        },
        {
          type: 'photo',
          media: fs.createReadStream(photoPath2),
          caption: 'Two images'
        }
      ]
    });
  }
});
```
<br>

## API

### bot
 Instance of _BotContext_. Has fixed and dynamic methods.
 You can pass an optional `params` object to the `telegrambo` factory function to configure the bot's behavior:
 - `params.parallel` (boolean, default: `false`): If `true`, event handlers for `bot.on()` will be executed in parallel when `bot.setUpdate()` is called. If `false` (default), handlers will be executed sequentially.

Fixed methods:
- `bot.setUpdate(update)` — A method that triggers the processing of incoming events. It executes all matching handlers (sequentially by default, or in parallel if `params.parallel` is true during bot creation).
  - `update` - Object with data from telegram.
  - **Returns**: A `Promise` that resolves to an `Array` containing the return values of all executed handlers. The order of results corresponds to the execution order.

- `bot.on(eventName, eventHandler)` — Method that sets the handler for an incoming named event.
  - `eventName` - Name of event.
  - `eventHandler` - Function handler of an incoming event that passes `eventContext` and `eventName` as arguments.
  - **Returns**: An object with a `.catch(reject)` method to set a specific error handler. The `reject` callback function receives `(error, eventContext, eventName)` as arguments.
- `bot.on(eventHandler)` — A method that processes all incoming events, regardless of the event name. Returns an object with a `.catch()` method.

>Dynamic methods execute requests to Telegram servers with the name of the corresponding method and the data passed in the argument of this method as an object. You can take the fields for passing data and the names of methods from the [Bot API Telegram documentation](https://core.telegram.org/bots/api#available-methods)

Example of dinamic method:

```js
import bot from './bot.js';

// Forwarding message from chat with id = 123456789
// to chat with id = 987654321
bot.forwardMessage({
  chat_id: 123456789,
  from_chat_id: 987654321,
  message_id: 12
})
```
<br>

### event 
  Instance of _EventContext_. Has dinamic params - info from update object. And has fixed helper params:

- `event.update` Return object with data of update from incoming event.
- `event.payload` Return object with prepare data for sending to bot in this event context

> EventContext dynamic methods work in the same way as BotContext dynamic methods. The difference is that these methods receive prepared data from the update object of the event.

Example of event dinamic method:
```js
import createBot from 'telegrambo';

const bot = createBot(process.env.YOUR_BOT_TOKEN);

// Create simple echo bot
bot.on('message', (event) => {

  // A dynamic method that takes one parameter
  // text of the message to be sent, 
  // it taken from the update of incoming message.
  // chat_id is automatically taken from the incoming event update. 
  // But if necessary, it can be overridden
  event.sendMessage({
    text: event.text
  });
})
```

<br>

## Also Client Version
You can start telegram bot on client side, in browser

```js
import telegrambo from 'telegrambo/browser';
import polling from 'telegrambo-polling';

const bot = telegrambo(YOU_BOT_TOKEN);
bot.polling = polling;

// Create echo-bot
bot.on('message', (event) => {
  event.sendMessage({
    text: event.text
  });
});

bot.polling({
  timeout: 60,
  limit: 100,
  offset: 0,
  allowedUpdates: []
});
```

<br>
<br>

## License
Telegrambo is MIT licensed.