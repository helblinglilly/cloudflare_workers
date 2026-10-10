<script lang="ts">
import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
  <title>toMP4</title>
</svelte:head>

<div class="text-center pt-2 pb-4">
    <h1 class="text-3xl font-semibold">mp4</h1>
</div>

<div class="px-4 md:px-8 grid gap-4">
    {@render children()}
</div>
