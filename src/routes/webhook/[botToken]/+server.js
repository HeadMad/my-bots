import  Telegrambo  from 'telegrambo';

/**
 * Handles incoming Telegram webhooks.
 * This version uses direct processing instead of event listeners for serverless reliability.
 * @type {import('./$types').RequestHandler}
 */
export async function POST({ request, params }) {
  console.log('Webhook received a POST request.');

  const { botToken } = params;
  if (!botToken) {
    console.error('FATAL: Bot token not found in URL.');
    return new Response('Bot token not provided', { status: 400 });
  }

  try {
    const update = await request.json();
    console.log('Received update:', JSON.stringify(update, null, 2));

    // A message can be a normal message or a channel post
    const message = update.message || update.channel_post;

    if (message && message.text) {
      const chatId = message.chat.id;
      const receivedText = message.text;
      
      console.log(`Extracted - Chat ID: ${chatId}, Text: "${receivedText}"`);

      const bot = Telegrambo(botToken);
      bot.on('message', (event) => {
        event.sendMessage({
          text: event.text
        })
      });

      try {
        console.log(bot.setUpdate(update));
      } catch (error) {
        console.error('Error setting update:', error);
      }
      
      console.log('Attempting to send echo message...');
      
      // Directly call sendMessage with an object containing all required parameters
      const sendResult = await bot.sendMessage({
        chat_id: chatId,
        parse_mode: 'HTML',
        text: `<pre>${JSON.stringify(update, null, 2)}</pre>` // Added "Echo:" to make it clear it's a reply

      });
      console.log('Telegram API response:', sendResult);

      return new Response('Webhook processed successfully.', { status: 200 });
    } else {
      console.log('Update did not contain a message with text. Ignoring.');
      return new Response('Update ignored (no text message).', { status: 200 });
    }

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Error processing request', { status: 500 });
  }
}
