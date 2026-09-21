import { proxy, ProxyUnavailableError } from "@benjypng/logseq-request";

/**
 * CORS-free HTTP request helper for interactions with the Zotero local API.
 *
 * Logseq plugins run at the `lsp://logseq.com` sandbox origin. Since the
 * stricter CORS policy, plain `fetch` from there is blocked at the preflight
 * stage: Zotero's local server returns no `Access-Control-Allow-Origin`, so a
 * sandbox-origin fetch can never read a response (measured 2026-09-21, Zotero
 * 10.0.2 at http://127.0.0.1:23119). Do NOT "fix" this by patching CORS
 * headers — the origin is the problem, not the headers, and `zotero-allowed-
 * request` (which Zotero's own extension uses) does not help from this origin.
 *
 * The correct route is Logseq's main-process request bridge (`exper_request`
 * / `logseq.Net.request`), proxied through the host's main process which is
 * NOT subject to browser CORS. We require the bridge (per
 * `@benjypng/logseq-request`, proven in the DB build by zoterolocal): if it is
 * unavailable we surface a clear error rather than silently falling back to
 * the CORS-broken `fetch` path.
 */
export async function requestJson(url: string, opts: { method?: string; headers?: Record<string, string>; body?: any; timeoutMs?: number } = {}): Promise<any> {
  const method = opts.method || "GET";
  const headers = opts.headers || {};

  const bridgeAvailable =
    (typeof (logseq as any)?.Net?.request === "function") ||
    ((logseq as any)?._execCallableAPIAsync && (logseq as any)?.Request?.once);

  if (!bridgeAvailable) {
    throw new ProxyUnavailableError("no Logseq host request proxy detected");
  }

  let handle = proxy(url).headers(headers);
  if (opts.timeoutMs) handle = handle.timeout(opts.timeoutMs);

  if (method === "GET") return await handle.get().json();
  if (method === "POST") return await handle.post(opts.body).json();
  if (method === "PUT") return await handle.put(opts.body).json();
  if (method === "PATCH") return await handle.patch(opts.body).json();
  if (method === "DELETE") return await handle.delete().json();
  throw new Error(`requestJson: unsupported method ${method}`);
}