import { drizzle } from "drizzle-orm/d1";

export const createDb = (db: D1Database) => {
  return drizzle(db);
};
