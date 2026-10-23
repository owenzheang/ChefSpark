// SQLite tables for the recipe assistant: one row per paid request (daily limits, token usage) and a
// shared cache of step explanations (they depend only on the step text, never on the user).
export function initAssistantTables(db) {
  return new Promise((resolve, reject) => db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS assistant_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        kind TEXT NOT NULL,
        result TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        prompt_tokens INTEGER,
        completion_tokens INTEGER
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS assistant_explanations (
        cache_key TEXT PRIMARY KEY,
        answer TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    // A restart interrupts in-flight requests; they still count toward the day's limits.
    db.run("UPDATE assistant_requests SET result = 'interrupted' WHERE result = 'pending'",
      error => error ? reject(error) : resolve());
  }));
}
