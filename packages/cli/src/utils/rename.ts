import fs from "node:fs";

const RENAME_RETRY_CODES = new Set(["EPERM", "EACCES", "EBUSY"]);
const RENAME_MAX_RETRIES = 10;
const RENAME_RETRY_WAIT = new Int32Array(new SharedArrayBuffer(4));

/**
 * Rename atomically, allowing Windows antivirus/indexer handles to close.
 * Retry only transient Windows locks, for at most 550 ms total; otherwise
 * surface the original error. Callers retain ownership of temp-file cleanup.
 */
export function renameSyncWithRetry(from: string, to: string): void {
  for (let attempt = 0; ; attempt++) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | null)?.code;
      const transient =
        process.platform === "win32" &&
        code !== undefined &&
        RENAME_RETRY_CODES.has(code);
      if (!transient || attempt >= RENAME_MAX_RETRIES) throw error;
      Atomics.wait(RENAME_RETRY_WAIT, 0, 0, 10 * (attempt + 1));
    }
  }
}
