<script lang="ts">
  // ── State ─────────────────────────────────────────────────────────────────

  type Phase =
    | { kind: "idle" }
    | { kind: "dragging" }
    | { kind: "processing" }
    | { kind: "done"; originalSize: number; strippedSize: number; filename: string }
    | { kind: "error"; message: string };

  let phase = $state<Phase>({ kind: "idle" });
  let fileInput = $state<HTMLInputElement | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatSaving(original: number, stripped: number): string {
    if (original === 0) return "0%";
    const pct = ((original - stripped) / original) * 100;
    return `${pct.toFixed(1)}%`;
  }

  const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

  function validateFile(file: File): string | null {
    if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp)$/i)) {
      return "Unsupported format. Please upload a JPEG, PNG, or WebP file.";
    }
    if (file.size > 50 * 1024 * 1024) {
      return "File too large. Maximum size is 50 MB.";
    }
    return null;
  }

  async function processFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      phase = { kind: "error", message: validationError };
      return;
    }

    phase = { kind: "processing" };

    const formData = new FormData();
    formData.append("image", file);

    let response: Response;
    try {
      response = await fetch("/api/strip", { method: "POST", body: formData });
    } catch {
      phase = { kind: "error", message: "Network error – could not reach the server." };
      return;
    }

    if (!response.ok) {
      let message = `Server error (${response.status})`;
      try {
        const body = await response.json();
        if (body?.message) message = body.message;
      } catch {
        try {
          const text = await response.text();
          if (text) message = text;
        } catch {
          /* ignore */
        }
      }
      phase = { kind: "error", message };
      return;
    }

    const originalSize = Number(response.headers.get("X-Original-Size") ?? file.size);
    const strippedSize = Number(response.headers.get("X-Stripped-Size") ?? 0);

    // Derive filename from Content-Disposition if present
    let filename =
      file.name.replace(/\.[^.]+$/, "") + "-stripped" + file.name.match(/\.[^.]+$/)?.[0] ?? ".jpg";
    const cd = response.headers.get("Content-Disposition");
    if (cd) {
      const m = cd.match(/filename="([^"]+)"/);
      if (m) filename = m[1];
    }

    // Trigger browser download from the response blob
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    phase = { kind: "done", originalSize, strippedSize, filename };
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  function onFileInputChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) processFile(file);
    // Reset so the same file can be uploaded again
    input.value = "";
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    if (phase.kind !== "processing") phase = { kind: "dragging" };
  }

  function onDragLeave(e: DragEvent) {
    // Only reset if leaving the drop zone entirely (not a child element)
    const target = e.currentTarget as HTMLElement;
    if (!target.contains(e.relatedTarget as Node)) {
      if (phase.kind === "dragging") phase = { kind: "idle" };
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    if (phase.kind === "processing") return;
    phase = { kind: "idle" };
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput?.click();
    }
  }

  function reset() {
    phase = { kind: "idle" };
  }
</script>

<svelte:head>
  <title>imgstripper – remove metadata from images</title>
  <meta
    name="description"
    content="Remove EXIF, XMP, IPTC and other metadata from JPEG, PNG and WebP images instantly. Your files never leave your request – processed in-memory."
  />
</svelte:head>

<main>
  <header>
    <h1>imgstripper</h1>
    <p class="tagline">Remove metadata from images — instantly, privately, in-memory.</p>
  </header>

  <!-- Drop zone / upload area -->
  <div
    class="drop-zone"
    class:dragging={phase.kind === "dragging"}
    class:processing={phase.kind === "processing"}
    role="button"
    tabindex={phase.kind === "processing" ? -1 : 0}
    aria-label="Upload an image to strip its metadata"
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
    onclick={() => {
      if (phase.kind !== "processing") fileInput?.click();
    }}
    onkeydown={onKeyDown}
  >
    <input
      bind:this={fileInput}
      type="file"
      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
      hidden
      onchange={onFileInputChange}
    />

    {#if phase.kind === "idle" || phase.kind === "dragging"}
      <div class="drop-content">
        <div class="icon" aria-hidden="true">
          {#if phase.kind === "dragging"}
            <!-- Arrow down when dragging -->
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          {:else}
            <!-- Upload icon when idle -->
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
          {/if}
        </div>
        <p class="drop-label">
          {#if phase.kind === "dragging"}
            Drop to strip metadata
          {:else}
            <strong>Choose a file</strong> or drag it here
          {/if}
        </p>
        <p class="drop-sub">JPEG, PNG, WebP &nbsp;·&nbsp; up to 50 MB</p>
      </div>
    {:else if phase.kind === "processing"}
      <div class="drop-content">
        <div class="spinner" aria-hidden="true"></div>
        <p class="drop-label">Stripping metadata…</p>
      </div>
    {:else if phase.kind === "done"}
      <div class="drop-content result" role="presentation" onclick={(e) => e.stopPropagation()}>
        <div class="icon success" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p class="drop-label">Download started</p>
        <p class="filename">{phase.filename}</p>
        <dl class="stats">
          <div>
            <dt>Before</dt>
            <dd>{formatBytes(phase.originalSize)}</dd>
          </div>
          <div class="arrow" aria-hidden="true">→</div>
          <div>
            <dt>After</dt>
            <dd>{formatBytes(phase.strippedSize)}</dd>
          </div>
          <div class="saving">
            <dt>Saved</dt>
            <dd>{formatSaving(phase.originalSize, phase.strippedSize)}</dd>
          </div>
        </dl>
        <button class="btn-secondary" onclick={reset}>Strip another</button>
      </div>
    {:else if phase.kind === "error"}
      <div class="drop-content result" role="presentation" onclick={(e) => e.stopPropagation()}>
        <div class="icon error" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
        <p class="drop-label">Something went wrong</p>
        <p class="error-message">{phase.message}</p>
        <button class="btn-secondary" onclick={reset}>Try again</button>
      </div>
    {/if}
  </div>

  <!-- How it works / info -->
  <section class="info">
    <h2>What gets removed?</h2>
    <ul class="info-list">
      <li>
        <span class="format-badge jpeg">JPEG</span>
        EXIF (camera model, GPS location, date taken), XMP, IPTC, comments — ICC colour profile and JFIF
        header are preserved.
      </li>
      <li>
        <span class="format-badge png">PNG</span>
        Text chunks (tEXt, iTXt, zTXt), EXIF chunk (eXIf), timestamps (tIME), resolution (pHYs), and other
        ancillary metadata — colour profile chunks are preserved.
      </li>
      <li>
        <span class="format-badge webp">WebP</span>
        EXIF and XMP chunks from extended (VP8X) files — ICC colour profile is preserved.
      </li>
    </ul>
  </section>

  <section class="info">
    <h2>Privacy</h2>
    <p>
      Your image is uploaded to a Cloudflare Worker, stripped entirely in memory, and returned
      directly to your browser. Nothing is stored — not even temporarily.
    </p>
  </section>

  <section class="info">
    <h2>API</h2>
    <p>POST an image to this URL to get the stripped version back:</p>
    <pre class="code-block"><code
        >curl -F image=@photo.jpg https://img.helbling.uk/api/strip \
  -H "Origin: https://img.helbling.uk" \
  -O -J</code
      ></pre>
    <p>The response is the raw image with these extra headers:</p>
    <pre class="code-block"><code
        >X-Original-Size: 4219843
X-Stripped-Size: 4190112
Content-Disposition: attachment; filename="photo-stripped.jpg"</code
      ></pre>
  </section>

  <footer>
    <p>
      <a href="https://github.com/helblinglilly/cloudflare_workers/tree/main/imgstripper"
        >Open source</a
      >
      ·
      <a href="https://img.helbling.uk" aria-current="page">img.helbling.uk</a>
    </p>
  </footer>
</main>

<style>
  /* ── Reset / base ──────────────────────────────────────────────────────── */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: #0a0a0f;
    color: #e4e4ef;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Layout ────────────────────────────────────────────────────────────── */
  main {
    max-width: 680px;
    margin: 0 auto;
    padding: 3rem 1.5rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  /* ── Header ────────────────────────────────────────────────────────────── */
  header {
    text-align: center;
  }

  h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 800;
    letter-spacing: -0.04em;
    background: linear-gradient(135deg, #a78bfa, #60a5fa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1.1;
  }

  .tagline {
    margin-top: 0.6rem;
    color: #9090aa;
    font-size: 1rem;
  }

  /* ── Drop zone ─────────────────────────────────────────────────────────── */
  .drop-zone {
    border: 2px dashed #2e2e40;
    border-radius: 1rem;
    padding: 3rem 2rem;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      background 0.2s ease,
      box-shadow 0.2s ease;
    outline: none;
    user-select: none;
    text-align: center;
  }

  .drop-zone:hover,
  .drop-zone:focus-visible {
    border-color: #7c6ff7;
    background: rgba(124, 111, 247, 0.05);
    box-shadow: 0 0 0 4px rgba(124, 111, 247, 0.12);
  }

  .drop-zone.dragging {
    border-color: #a78bfa;
    background: rgba(167, 139, 250, 0.08);
    box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.18);
  }

  .drop-zone.processing {
    cursor: default;
    border-color: #3b3b55;
    background: rgba(59, 59, 85, 0.15);
  }

  /* ── Drop zone contents ────────────────────────────────────────────────── */
  .drop-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .icon {
    width: 3rem;
    height: 3rem;
    color: #7c6ff7;
    transition: color 0.2s;
  }

  .drop-zone:hover .icon,
  .drop-zone.dragging .icon {
    color: #a78bfa;
  }

  .icon.success {
    color: #34d399;
  }
  .icon.error {
    color: #f87171;
  }

  .icon svg {
    width: 100%;
    height: 100%;
  }

  .drop-label {
    font-size: 1.05rem;
    color: #c4c4d8;
  }

  .drop-label strong {
    color: #e4e4ef;
  }

  .drop-sub {
    font-size: 0.8rem;
    color: #5a5a72;
  }

  /* ── Spinner ───────────────────────────────────────────────────────────── */
  .spinner {
    width: 2.5rem;
    height: 2.5rem;
    border: 3px solid #2e2e40;
    border-top-color: #7c6ff7;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Result state ──────────────────────────────────────────────────────── */
  .result {
    gap: 1rem;
  }

  .filename {
    font-size: 0.85rem;
    color: #7070a0;
    font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace;
    word-break: break-all;
  }

  .stats {
    display: flex;
    align-items: flex-end;
    gap: 1.25rem;
    list-style: none;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid #2a2a3a;
    border-radius: 0.6rem;
    padding: 0.9rem 1.4rem;
    font-variant-numeric: tabular-nums;
  }

  .stats dt {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #6060808;
    color: #606080;
    margin-bottom: 0.2rem;
  }

  .stats dd {
    font-size: 1rem;
    font-weight: 600;
    color: #ddd;
  }

  .stats .saving dt {
    color: #6ee7b7;
  }
  .stats .saving dd {
    color: #34d399;
    font-size: 1.2rem;
  }

  .arrow {
    font-size: 1.1rem;
    color: #4040608;
    color: #404060;
    padding-bottom: 0.1rem;
    flex-shrink: 0;
  }

  .error-message {
    font-size: 0.875rem;
    color: #f87171;
    max-width: 36ch;
    text-align: center;
    line-height: 1.5;
  }

  /* ── Buttons ───────────────────────────────────────────────────────────── */
  .btn-secondary {
    margin-top: 0.5rem;
    padding: 0.5rem 1.25rem;
    border: 1px solid #3a3a52;
    border-radius: 0.5rem;
    background: transparent;
    color: #b0b0cc;
    font-size: 0.875rem;
    cursor: pointer;
    transition:
      border-color 0.15s,
      color 0.15s,
      background 0.15s;
  }

  .btn-secondary:hover {
    border-color: #7c6ff7;
    color: #e4e4ef;
    background: rgba(124, 111, 247, 0.1);
  }

  /* ── Info sections ─────────────────────────────────────────────────────── */
  .info {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  h2 {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #5a5a72;
  }

  .info p {
    font-size: 0.9rem;
    color: #9090a8;
    line-height: 1.6;
  }

  .info-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .info-list li {
    font-size: 0.875rem;
    color: #8888a8;
    line-height: 1.6;
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
  }

  .format-badge {
    flex-shrink: 0;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 0.15em 0.45em;
    border-radius: 0.3rem;
    font-family: ui-monospace, monospace;
  }

  .format-badge.jpeg {
    background: #3b2020;
    color: #f87171;
  }
  .format-badge.png {
    background: #1e2e3b;
    color: #60a5fa;
  }
  .format-badge.webp {
    background: #1e3028;
    color: #34d399;
  }

  /* ── Code block ────────────────────────────────────────────────────────── */
  .code-block {
    background: #0f0f1a;
    border: 1px solid #2a2a3a;
    border-radius: 0.5rem;
    padding: 0.9rem 1.1rem;
    overflow-x: auto;
    font-size: 0.8rem;
  }

  .code-block code {
    font-family: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, monospace;
    color: #a0d0ff;
    white-space: pre;
  }

  /* ── Footer ────────────────────────────────────────────────────────────── */
  footer {
    text-align: center;
    font-size: 0.8rem;
    color: #404060;
  }

  footer a {
    color: #5050808;
    color: #606080;
    text-decoration: none;
  }

  footer a:hover {
    color: #9090c0;
  }

  /* ── Responsive ────────────────────────────────────────────────────────── */
  @media (max-width: 480px) {
    main {
      padding: 2rem 1rem 3rem;
    }

    .drop-zone {
      padding: 2rem 1.25rem;
    }

    .stats {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
</style>
