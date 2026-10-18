/* ==========================================================================
   store.js
   ----------------------------------------------------------------------
   Small persistence wrapper so a change on one page (e.g. completing a
   POS sale) is still there when you navigate to another page (e.g.
   Inventory). Uses localStorage; falls back to an in-memory object if
   storage is blocked (private browsing, sandboxed preview, etc.) so the
   prototype never hard-crashes — it just won't remember between full
   page reloads in that case.

   BACKEND NOTE: Store.get/set are the ONLY place the rest of the app
   talks to "the database". Replacing the body of get/set with real
   fetch() calls to a backend API is meant to be the entire migration —
   no other file should need to change.
   ========================================================================== */
const Store = (function () {
  const PREFIX = 'motoshop:';
  const memory = {};
  let useMemory = false;

  try {
    const testKey = PREFIX + '__test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
  } catch (err) {
    useMemory = true;
  }

  function get(key, fallback) {
    const fullKey = PREFIX + key;
    try {
      const raw = useMemory ? memory[fullKey] : window.localStorage.getItem(fullKey);
      return raw === undefined || raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function set(key, value) {
    const fullKey = PREFIX + key;
    const raw = JSON.stringify(value);
    try {
      if (useMemory) {
        memory[fullKey] = raw;
      } else {
        window.localStorage.setItem(fullKey, raw);
      }
    } catch (err) {
      memory[fullKey] = raw;
      useMemory = true;
    }
    return value;
  }

  // Only writes if the key is empty, so navigating between pages never
  // stomps on data the user already changed earlier in the session.
  function seed(key, value) {
    const existing = get(key, undefined);
    if (existing === undefined) {
      set(key, value);
      return value;
    }
    return existing;
  }

  function seedAll(defaults) {
    Object.keys(defaults).forEach(key => seed(key, defaults[key]));
  }

  // Wipes everything back to DEFAULT_DB — used by the "Reset demo data" link.
  function resetAll(defaults) {
    Object.keys(defaults).forEach(key => set(key, defaults[key]));
  }

  return { get, set, seed, seedAll, resetAll, usingMemoryFallback: () => useMemory };
})();
