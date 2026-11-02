import {
  sqliteTable,
  index,
  foreignKey,
  primaryKey,
  unique,
  check,
  text,
  integer,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const homes = sqliteTable("homes", {
  id: text().primaryKey(),
  name: text().notNull(),
});

export const members = sqliteTable(
  "members",
  {
    id: text().primaryKey(),
    homeId: text("home_id").notNull(),
    name: text().notNull(),
    memberOrder: integer("member_order").notNull(),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    index("idx_members_home_order").on(table.homeId, table.memberOrder),

    foreignKey({
      columns: [table.homeId],
      foreignColumns: [homes.id],
      name: "fk_member_home",
    })
      .onUpdate("no action")
      .onDelete("cascade"),
    unique("uq_home_member_id").on(table.homeId, table.id),
    unique("uq_home_member_order").on(table.homeId, table.memberOrder),
  ],
);

export const bills = sqliteTable(
  "bills",
  {
    id: text().primaryKey(),
    homeId: text("home_id").notNull(),
    title: text().notNull(),
    totalCents: integer("total_cents").notNull(),
  },
  (table) => [
    index("idx_bills_home").on(table.homeId),

    foreignKey({
      columns: [table.homeId],
      foreignColumns: [homes.id],
      name: "fk_bill_home",
    })
      .onUpdate("no action")
      .onDelete("cascade"),
    unique("uq_home_bill_id").on(table.homeId, table.id),
    check(
      "chk_positive_total",
      sql`typeof(total_cents) = 'integer' AND total_cents > 0`,
    ),
  ],
);

export const shares = sqliteTable(
  "shares",
  {
    id: text().primaryKey(),
    homeId: text("home_id").notNull(),
    billId: text("bill_id").notNull(),
    memberId: text("member_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    paidAt: text("paid_at"),
    idempotencyKey: text("idempotency_key"),
  },
  (table) => [
    index("idx_shares_member_paid").on(table.memberId, table.paidAt),

    foreignKey({
      columns: [table.homeId, table.memberId],
      foreignColumns: [members.homeId, members.id],
      name: "fk_share_member",
    })
      .onUpdate("no action")
      .onDelete("cascade"),

    foreignKey({
      columns: [table.homeId, table.billId],
      foreignColumns: [bills.homeId, bills.id],
      name: "fk_share_bill",
    })
      .onUpdate("no action")
      .onDelete("cascade"),
    unique("uq_bill_member").on(table.billId, table.memberId),
    unique("uq_share_idempotency").on(table.idempotencyKey),
    check(
      "chk_share_amount",
      sql`typeof(amount_cents) = 'integer' AND amount_cents >= 0`,
    ),
    check(
      "chk_payment_state",
      sql`(paid_at IS NULL AND idempotency_key IS NULL) OR (paid_at IS NOT NULL AND idempotency_key IS NOT NULL)`,
    ),
  ],
);
