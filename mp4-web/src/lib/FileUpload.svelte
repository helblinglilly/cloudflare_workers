<script lang="ts">
  import { onMount } from "svelte";

  let files: File[] = $state([]);
  let isDragOver = $state(false);
  let isMobile = $state(false);
  const { fileselect, supportedMIMETypes }:
    { fileselect: (file: File) => unknown,
      supportedMIMETypes: string[]
    } =
    $props();

  onMount(() => {
    if (navigator.maxTouchPoints > 0){
      isMobile = true;
    }
  })

  let rejectedMessages: string[] = $state([]);

  let fileInput: HTMLInputElement;

  function handleFiles(selectedFiles: FileList) {
    rejectedMessages = [];

    const allFiles = Array.from(selectedFiles);
    const acceptedFiles = allFiles.filter((file) => supportedMIMETypes.includes(file.type));
    const rejectedFiles = allFiles.filter((file) => !supportedMIMETypes.includes(file.type))

    if (rejectedFiles.length > 0){
      rejectedMessages.push('Sorry, the following file is not supported:')
      rejectedFiles.forEach((file) => rejectedMessages.push(file.name));
      rejectedFiles.forEach((file) => console.log(file))
    }

    files = acceptedFiles;

    if (files.length > 0){
      fileselect(files[0]);
    }
  }
</script>
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="upload-area rounded-md border-dashed border-2 border-violet-600 {isDragOver ? `bg-violet-300/20 cursor-grabbing` : 'bg-violet-500/20'} cursor-pointer"
  onclick={() => fileInput.click() }
  ondragover={(e) => {
    e.preventDefault();
    isDragOver = true;
  }}
  ondragleave={(e) => {
    e.preventDefault();
    isDragOver = false;
  }}
  ondrop={(e) => {
    e.preventDefault();
    isDragOver = false;
    handleFiles(e.dataTransfer!.files);
  }}
>
    {#if isDragOver}
        <i class="text-violet-100 text-xl">Let's go...</i>
    {:else}
        <div class="grid justify-center items-center h-full p-2">
            {#if rejectedMessages.length > 0}
                <div>
                    {#each rejectedMessages as message, i (i)}
                        <p>{message}</p>
                    {/each}
                </div>
            {:else}
                <p class="text-violet-100 text-xl text-center">
                    {#if isMobile}
                        Click to select a file
                    {:else}
                        Drop a video file in here
                    {/if}
                </p>
            {/if}
        </div>
    {/if}

    <input type="file"
        accept={supportedMIMETypes.join(', ')}
        style="display: none;"
        onchange={(e) => {
        const target = e.target as HTMLInputElement;
          if (target.files){
              handleFiles(target.files)
          }
        }}
        bind:this={fileInput}
    />
</div>



<style>
  .upload-area {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      align-content: center;
      overflow: hidden;
  }
</style>
