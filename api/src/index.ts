import { Hono, type Env } from "hono";
import zod from "zod";
import { createDb } from "./db";
import { homes } from "./db/schema";

const userObject = zod.object({
  name: zod.string(),
});

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.get("/api/home", async function (c) {
    const db = createDb(c.env.DB);

    const result = await db.select().from(homes);
    console.log(result);
  return c.json({ statuss: "jdlskjl" });
});

export default app;
