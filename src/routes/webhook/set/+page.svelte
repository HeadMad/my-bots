<script>
	import { enhance } from '$app/forms';

	/** @type {import('./$types').ActionData} */
	export let form;
</script>

<h1>Set Telegram Webhook</h1>

<p>
	Enter your Telegram Bot Token below to register the webhook URL with the Telegram API. The webhook
	will be set to <strong>{import.meta.env.VITE_SVELTEKIT_URL}/webhook/[your-token]</strong>.
</p>

<form method="POST" use:enhance>
	<label for="botToken">Bot Token:</label>
	<br />
	<input
		type="password"
		id="botToken"
		name="botToken"
		required
		size="50"
		style="margin-top: 0.5rem;"
	/>
	<br />
	<button type="submit" style="margin-top: 1rem;">Register Webhook</button>
</form>

{#if form}
	<section class="result">
		<h3>Result:</h3>
		{#if form.success}
			<p class="success">{form.message}</p>
		{:else}
			<p class="error">{form.message}</p>
		{/if}
	</section>
{/if}

<style>
	form {
		margin-top: 1.5rem;
	}
	label {
		font-weight: bold;
	}
	.result {
		margin-top: 1rem;
	}
	.result p {
		padding: 1rem;
		border-radius: 4px;
		word-break: break-all;
	}
	.success {
		background-color: #e5f7ed;
		color: #1f824c;
		border: 1px solid #c3e6cb;
	}
	.error {
		background-color: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}
</style>
