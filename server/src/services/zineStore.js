// SQLite persistence for user Zines. Style and version metadata live on the Zine record,
// never in Recipe JSON. Images are stored as PNG BLOBs (about 2 MB per Zine).
export const zineImageKinds = ["hero", "cooking", "ingredients", "decoration"];

export function promisify(db) {
  return {
    run: (sql, params = []) => new Promise((resolve, reject) =>
      db.run(sql, params, function (error) { error ? reject(error) : resolve({ lastID: this.lastID, changes: this.changes }); })),
    get: (sql, params = []) => new Promise((resolve, reject) =>
      db.get(sql, params, (error, row) => error ? reject(error) : resolve(row))),
    all: (sql, params = []) => new Promise((resolve, reject) =>
      db.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)))
  };
}

// Resolves once the schema and restart cleanup have run (statements are serialized).
export function initZineTables(db) {
  return new Promise((resolve, reject) => db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS zines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        saved_recipe_id INTEGER NOT NULL UNIQUE,
        style_id TEXT NOT NULL,
        prompt_version TEXT NOT NULL,
        recipe_sha256 TEXT NOT NULL,
        status TEXT NOT NULL,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (saved_recipe_id) REFERENCES saved_recipes(id)
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS zine_images (
        zine_id INTEGER NOT NULL,
        kind TEXT NOT NULL,
        png BLOB NOT NULL,
        PRIMARY KEY (zine_id, kind),
        FOREIGN KEY (zine_id) REFERENCES zines(id)
      )
    `);
    // One row per paid attempt, kept even when a Zine is deleted, so daily limits cannot be bypassed.
    db.run(`
      CREATE TABLE IF NOT EXISTS zine_generations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        zine_id INTEGER,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        result TEXT NOT NULL,
        usage_json TEXT,
        cost_estimate_usd REAL
      )
    `);
    // A restart interrupts in-flight generations; never leave them looking active.
    db.run("UPDATE zines SET status = 'failed', error = 'Generation was interrupted.' WHERE status = 'generating'");
    db.run("UPDATE zine_generations SET result = 'interrupted' WHERE result = 'pending'",
      error => error ? reject(error) : resolve());
  }));
}

export async function deleteZinesForSavedRecipe(db, savedRecipeId) {
  const q = promisify(db);
  await q.run("DELETE FROM zine_images WHERE zine_id IN (SELECT id FROM zines WHERE saved_recipe_id = ?)", [savedRecipeId]);
  await q.run("DELETE FROM zines WHERE saved_recipe_id = ?", [savedRecipeId]);
}
