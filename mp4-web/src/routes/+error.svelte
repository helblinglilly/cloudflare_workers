<script>
  import { page } from "$app/state";
</script>

<div class="w-full pt-8 grid justify-center">
  {#if page.status === 404}
    <h2 class="text-2xl">No</h2>
  {:else}
    <h2 class="text-2xl">Sorry - something broke</h2>
  {/if}
</div>
