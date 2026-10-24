import sqlite3 from "sqlite3";
import { initZineTables } from "./services/zineStore.js";
import { initAssistantTables } from "./services/assistantStore.js";
import { initFoodImageTables } from "./services/foodImageStore.js";

const database = new sqlite3.Database("smartkitchen.db");

database.serialize(() => {
  database.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity REAL,
      unit TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS saved_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      recipe_json TEXT NOT NULL,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
});

initZineTables(database).catch(error => console.error("Zine tables could not be initialised:", error.message));
initAssistantTables(database).catch(error => console.error("Assistant tables could not be initialised:", error.message));
initFoodImageTables(database).catch(error => console.error("Food image tables could not be initialised:", error.message));

export default database;
