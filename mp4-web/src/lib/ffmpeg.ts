import { FFmpeg} from "@ffmpeg/ffmpeg";
import { get, writable } from "svelte/store";


export const ffmpegStore = writable<FFmpeg | undefined>(undefined);

const ffmpegLoadingState = writable<'uninitialised' | 'loading' | 'ready'>('uninitialised');


export function loadFFmpeg(){
  if (get(ffmpegLoadingState) !== 'uninitialised'){
    return;
  }

  ffmpegLoadingState.set('loading');

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  const a = new FFmpeg();

  a.load({
    coreURL: baseURL + '/ffmpeg-core.js',
    wasmURL: baseURL + '/ffmpeg-core.wasm',
    workerURL: baseURL + '/ffmpeg-core.worker.js'
  }).then(() => {
    ffmpegStore.set(a);
    ffmpegLoadingState.set('ready');
    return a;
  }).catch((err) => {
    console.log(err);
    ffmpegLoadingState.set('uninitialised');
  })
}

const readFromBlobOrFile = (blob: Blob | File): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const { result } = fileReader;
      if (result instanceof ArrayBuffer) {
        resolve(new Uint8Array(result));
      } else {
        resolve(new Uint8Array());
      }
    };
    fileReader.onerror = (event) => {
      reject(
        Error(
          `File could not be read! Code=${event?.target?.error?.code || -1}`
        )
      );
    };
    fileReader.readAsArrayBuffer(blob);
});

export const fetchFile = async (
  file?: string | File | Blob
): Promise<Uint8Array> => {
  let data: ArrayBuffer | number[] | Uint8Array;

  if (typeof file === "string") {
    /* From base64 format */
    if (/data:_data\/([a-zA-Z]*);base64,([^"]*)/.test(file)) {
      data = atob(file.split(",")[1])
        .split("")
        .map((c) => c.charCodeAt(0));
      /* From remote server/URL */
    } else {
      data = await (await fetch(file)).arrayBuffer();
    }
  } else if (file instanceof URL) {
    data = await (await fetch(file)).arrayBuffer();
  } else if (file instanceof File || file instanceof Blob) {
    data = await readFromBlobOrFile(file);
  } else {
    return new Uint8Array();
  }

  return data instanceof Uint8Array ? data : new Uint8Array(data);
};
