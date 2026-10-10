<script lang="ts">
  import FileUpload from "#lib/FileUpload.svelte";
  import { fetchFile, ffmpegStore, loadFFmpeg } from "#lib/ffmpeg.ts";
  import Icon from "#lib/Icon.svelte";
  import { getFilesize } from "#lib/filesize.ts";
  import { FFmpeg } from "@ffmpeg/ffmpeg";

  let inputFile: File | undefined = $state(undefined);
  let output: { url?: string; size?: number } = $state({});
  let percentage: number | undefined = $state(undefined);
  let downloadButton: HTMLAnchorElement;
  let isTranscoding = $state(false);

  let options: { mute: boolean } = $state({ mute: false });

  let isButtonEnabled = $state(false);
  let buttonText = $state("Select file to get started");

  export async function convert(input: File, ffmpeg: FFmpeg) {
    isButtonEnabled = false;
    buttonText = "Transcoding...";

    await ffmpeg.writeFile(input.name, await fetchFile(input));
    ffmpeg.on("progress", ({ progress }) => {
      percentage = progress * 100;
    });

    try {
      const ffmpegArgs = ["-i", input.name];
      ffmpegArgs.concat(["-vcodec", "h264"]);

      if (options.mute) {
        ffmpegArgs.push("-an");
      } else {
        ffmpegArgs.concat(["-acodec", "aac"]);
      }

      ffmpegArgs.push(`${input.name}.mp4`);

      await ffmpeg.exec(ffmpegArgs);
      const data = await ffmpeg.readFile(`${input.name}.mp4`);

      // @ts-expect-error buffer does exist
      const file = new File([data.buffer], `${input.name}.mp4`, { type: "video/mp4" });
      output = {
        url: URL.createObjectURL(file),
        size: file.size,
      };

      isTranscoding = false;
      isButtonEnabled = true;
      buttonText = `Download`;
    } catch {
      isButtonEnabled = false;
      buttonText = "Something went wrong";
    }
  }
</script>

<div class="h-[30vh]">
  <FileUpload
    supportedMIMETypes={[
      "video/mp4",
      "video/mpeg",
      "video/mov",
      "video/x-matroska",
      "video/quicktime",
      "video/webm",
      "video/x-m4v",
    ]}
    fileselect={(file) => {
      isButtonEnabled = false;
      buttonText = "Loading";

      inputFile = file;
      loadFFmpeg();

      isButtonEnabled = true;
      buttonText = "Convert";
      output = {};
    }}
  />
</div>

<div class="h-[20vh] mt-4 grid justify-center gap-4">
  {#if inputFile}
    <Icon name="video" stroke="rgb(139 92 246 / 0.8)" />
    <div class="grid justify-center">
      <p class="text-center">{inputFile.name}</p>
      <i class="text-center">({getFilesize(inputFile.size)})</i>
    </div>
  {/if}
</div>

<div class="h-[20vh]">
  <div class="inline-flex mb-4 w-full justify-center">
    <input type="checkbox" bind:checked={options.mute} id="mute" />
    <label for="mute" class="text-lg">Remove audio</label>
  </div>

  <div class="w-full flex">
    <button
      class={`rounded-lg py-4 w-full md:w-[28rem] mx-auto ${isButtonEnabled ? "bg-violet-800" : "bg-violet-800/40"}`}
      disabled={!isButtonEnabled}
      onclick={() => {
        if (!isButtonEnabled || !inputFile || !$ffmpegStore) {
          return;
        }

        if (output.url) {
          downloadButton.click();
        } else {
          convert(inputFile, $ffmpegStore);
          isTranscoding = true;
        }
      }}
    >
      {buttonText}
      {#if output.size}
        <i>({getFilesize(output.size)})</i>
      {/if}
    </button>
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- blob URL download, not app navigation -->
    <a href={output.url} download class="hidden" bind:this={downloadButton}>a</a>
  </div>

  <div class="pt-4 w-full flex justify-center">
    {#if isTranscoding}
      <progress max={100} value={percentage ?? 0} class="w-full md:w-[28rem]">
        {(percentage ?? 0).toString().slice(0, 5)}%
      </progress>
    {/if}
  </div>
</div>
