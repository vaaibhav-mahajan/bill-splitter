import { Hono, type Env } from "hono";
import zod from "zod";
import { createDb } from "./db";
import { bills, homes, members, shares } from "./db/schema";
import { sValidator } from "@hono/standard-validator";
import { databaseMiddleware } from "./middleware/database";
import type { AppEnv } from "./types";
import { randomUUID } from "node:crypto";
import { SQLiteText } from "drizzle-orm/sqlite-core";
import { and, asc, eq, isNull, max, sql } from "drizzle-orm";
import { splitBill } from "./services/split-bill";

type Bindings = {
  DB: D1Database;
};

const homeSchema = zod.object({
  name: zod.string(),
});

const memberSchema = zod.object({
  name: zod.string(),
});

const billSchema = zod.object({
  title: zod.string().min(1),
  totalCents: zod.number().int().positive(),
});

const app = new Hono<AppEnv>();

app.use("*", databaseMiddleware);

app.get("/api/health", (c) => c.json({ status: "ok" }));

app.post("/api/homes", sValidator("json", homeSchema), async function (c) {
  const db = c.get("db");
  const data = c.req.valid("json");
  const id = randomUUID();

  const result = await db
    .insert(homes)
    .values({
      id: id,
      name: data.name,
    })
    .returning();
  c.status(201);
  return c.json(result[0]);
});

app.post(
  "/api/homes/:homeId/members",
  sValidator("json", memberSchema),
  async function (c) {
    const db = c.get("db");
    const data = c.req.valid("json");
    const id = randomUUID();
    const { homeId } = c.req.param();

    const home = await db
      .select()
      .from(homes)
      .where(eq(homes.id, homeId))
      .get();
    if (!home) {
      c.status(404);
      return c.json({ error: "home not found" });
    }
    const memberList = await db
      .select({
        maxOrder: max(members.memberOrder),
      })
      .from(members)
      .where(eq(members.homeId, homeId));

    const maxOrder = (memberList[0]?.maxOrder ?? 0) + 1;

    const result = await db
      .insert(members)
      .values({
        id: id,
        homeId: homeId,
        name: data.name,
        memberOrder: maxOrder,
      })
      .returning();

    c.status(201);
    return c.json(result[0]);
  },
);

app.post(
  "/api/homes/:homeId/bills",
  sValidator("json", billSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: "total is not a positive whole number",
        },
        422,
      );
    }
  }),
  async function (c) {
    const data = c.req.valid("json");
    const { homeId } = c.req.param();
    const db = c.get("db");
    if (data.totalCents <= 0) {
      c.status(422);
      return c.json({ error: "total is not a positive whole number" });
    }
    const home = await db
      .select()
      .from(homes)
      .where(eq(homes.id, homeId))
      .get();
    if (!home) {
      c.status(404);
      return c.json({ error: "home not found" });
    }

    const memberList = await db
      .select()
      .from(members)
      .where(eq(members.homeId, homeId));
    if (memberList.length === 0) {
      c.status(422);
      return c.json({ error: "the home has no members" });
    }

    const bill = await db
      .insert(bills)
      .values({
        id: randomUUID(),
        homeId: homeId,
        title: data.title,
        totalCents: data.totalCents,
      })
      .returning();
    const billId = bill[0]?.id;
    if (!billId) {
      return c.json({ error: "Internal Server Error" }, 500);
    }

    const calculatedShares = splitBill(data.totalCents, memberList);

    const shareRecords = calculatedShares.map((share) => ({
      id: crypto.randomUUID(),
      homeId,
      billId,
      memberId: share.memberId,
      amountCents: share.amountCents,
    }));

    // Insert all shares
    const insertedShares = await db
      .insert(shares)
      .values(shareRecords)
      .returning();

    return c.json(
  {
    id: billId,
    homeId,
    title: data.title,
    totalCents: data.totalCents,
    shares: insertedShares.map((share) => ({
      id: share.id,
      memberId: share.memberId,
      amountCents: share.amountCents,
      paidAt: share.paidAt,
    })),
  },
  201,
);
  },
);


app.post("/api/bills/:billId/shares/:shareId/pay", async (c) => {
  const idempotencyKey = c.req.header("Idempotency-Key");
  const { billId, shareId } = c.req.param();
  const db = c.get("db");

  if (!idempotencyKey) {
    return c.json(
      { error: "MISSING_IDEMPOTENCY_KEY" },
      400,
    );
  }

  // Attempt to mark the share as paid.
  const paidAt = new Date().toISOString();
  console.log("PAYMENT REQUEST:", {
  billId,
  shareId,
  idempotencyKey,
});

  const [updatedShare] = await db
    .update(shares)
    .set({
      idempotencyKey,
      paidAt,
    })
    .where(
      and(
        eq(shares.id, shareId),
        eq(shares.billId, billId),
        isNull(shares.paidAt),
      ),
    )
    .returning();

    
  // Successfully paid.
  
  if (updatedShare) {
    return c.json(
      {
        id: updatedShare.id,
        memberId: updatedShare.memberId,
        amountCents: updatedShare.amountCents,
        paidAt: updatedShare.paidAt,
      },
      200,
    );
  }

  // Update didn't happen. Check why.
  const existingShare = await db
    .select()
    .from(shares)
    .where(
      and(
        eq(shares.id, shareId),
        eq(shares.billId, billId),
      ),
    )
    .get();

  if (!existingShare) {
    return c.json(
      { error: "SHARE_NOT_FOUND" },
      404,
    );
  }

  // Same request was already processed.
  if (
    existingShare.paidAt !== null &&
    existingShare.idempotencyKey === idempotencyKey
  ) {
    return c.json(
      {
        id: existingShare.id,
        memberId: existingShare.memberId,
        amountCents: existingShare.amountCents,
        paidAt: existingShare.paidAt,
      },
      200,
    );
  }

  // Already paid using a different key.
  if (existingShare.paidAt !== null) {
    return c.json(
      { error: "SHARE_ALREADY_PAID" },
      409,
    );
  }

  return c.json(
    { error: "PAYMENT_FAILED" },
    500,
  );
});

app.get("/api/homes/:homeId/balances", async function (c) {
  const db = c.get("db");
  const { homeId } = c.req.param();
  const home = await db.select().from(homes).where(eq(homes.id, homeId)).get();
  if (!home) {
    c.status(404);
    return c.json({ error: "home not found" });
  }

  const balances = await db
    .select({
      memberId: members.id,
      name: members.name,
      outstandingCents: sql<number>`
        CAST(COALESCE(SUM(${shares.amountCents}), 0) AS INTEGER)
      `,
    })
    .from(members)
    .leftJoin(
      shares,
      and(
        eq(shares.homeId, members.homeId),
        eq(shares.memberId, members.id),
        isNull(shares.paidAt),
      ),
    )
    .where(eq(members.homeId, homeId))
    .groupBy(members.id, members.name, members.memberOrder)
    .orderBy(asc(members.memberOrder));

  return c.json({ balances }, 200);
});

export default app;
