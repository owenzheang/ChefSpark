// SQLite tables for food images: the shared picture library (WebP BLOBs, about 100 KB each) and one row
// per paid request, kept even when a picture is removed, so daily limits cannot be bypassed.
export function initFoodImageTables(db) {
  return new Promise((resolve, reject) => db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS food_images (
        id TEXT PRIMARY KEY,
        image_key TEXT NOT NULL UNIQUE,
        prompt_version TEXT NOT NULL,
        model TEXT NOT NULL,
        quality TEXT NOT NULL,
        webp BLOB NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS food_image_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        purpose TEXT NOT NULL,
        image_key TEXT NOT NULL,
        result TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        usage_json TEXT,
        cost_estimate_usd REAL
      )
    `);
    // A restart interrupts in-flight requests; they still count toward the day's limits.
    db.run("UPDATE food_image_requests SET result = 'interrupted' WHERE result = 'pending'",
      error => error ? reject(error) : resolve());
  }));
}
