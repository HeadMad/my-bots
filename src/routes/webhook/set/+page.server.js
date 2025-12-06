import Telegrambo  from 'telegrambo';
import { fail } from '@sveltejs/kit';

/** @type {import('./$types').Actions} */
export const actions = {
	default: async ({ request, url }) => {
		const data = await request.formData();
		const botToken = data.get('botToken');

		if (!botToken || typeof botToken !== 'string') {
			return fail(400, {
				success: false,
				message: 'You must provide a valid Bot Token.'
			});
		}

		// The URL that Telegram will send updates to
		const webhookUrl = `${url.origin}/webhook/${botToken}`;

		try {
			const bot = Telegrambo(botToken);
			const result = await bot.setWebhook({ url: webhookUrl });

			if (result.ok) {
				return {
					success: true,
					message: `✅ Webhook successfully set to: ${webhookUrl}. Telegram says: "${result.description}"`
				};
			} else {
				return fail(500, {
					success: false,
					message: `❌ Failed to set webhook. Telegram says: "${result.description}"`
				});
			}
		} catch (error) {
			console.error('Error setting webhook:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return fail(500, {
				success: false,
				message: `An internal server error occurred: ${errorMessage}`
			});
		}
	}
};
