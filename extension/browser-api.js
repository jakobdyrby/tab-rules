// Firefox's browser namespace provides Promise-based APIs; Chrome uses chrome.
// Neither is present in the standalone editor preview.
export const api = globalThis.browser ?? globalThis.chrome;
