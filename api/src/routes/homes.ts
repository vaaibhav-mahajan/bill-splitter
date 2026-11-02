// Route handlers for /api/homes
import { randomUUID } from 'node:crypto'
import { sValidator } from '@hono/standard-validator'
import { and, asc, eq, isNull, like, max, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { bills, homes, members, shares } from '../db/schema'
import { homeSchema, memberSchema } from '../schemas'
import type { AppEnv } from '../types'

export const homesRouter = new Hono<AppEnv>()

homesRouter.get('/', async (c) => {
  const db = c.get('db')
  const nameQuery = c.req.query('name')
  if (nameQuery) {
    const results = await db
      .select()
      .from(homes)
      .where(like(homes.name, `%${nameQuery}%`))
    return c.json({ homes: results }, 200)
  }
  const allHomes = await db.select().from(homes)
  return c.json({ homes: allHomes }, 200)
})

homesRouter.get('/:homeId', async (c) => {
  const db = c.get('db')
  const { homeId } = c.req.param()
  const home = await db.select().from(homes).where(eq(homes.id, homeId)).get()
  if (!home) return c.json({ error: 'home not found' }, 404)
  return c.json(home, 200)
})

homesRouter.get('/:homeId/members', async (c) => {
  const db = c.get('db')
  const { homeId } = c.req.param()
  const home = await db.select().from(homes).where(eq(homes.id, homeId)).get()
  if (!home) return c.json({ error: 'home not found' }, 404)
  const memberList = await db
    .select()
    .from(members)
    .where(eq(members.homeId, homeId))
    .orderBy(asc(members.memberOrder))
  return c.json({ members: memberList }, 200)
})

homesRouter.post('/', sValidator('json', homeSchema), async (c) => {
  const db = c.get('db')
  const data = c.req.valid('json')
  const id = randomUUID()
  const result = await db.insert(homes).values({ id, name: data.name }).returning()
  return c.json(result[0], 201)
})

homesRouter.post('/:homeId/members', sValidator('json', memberSchema), async (c) => {
  const db = c.get('db')
  const data = c.req.valid('json')
  const id = randomUUID()
  const { homeId } = c.req.param()
  const home = await db.select().from(homes).where(eq(homes.id, homeId)).get()
  if (!home) return c.json({ error: 'home not found' }, 404)
  const memberList = await db
    .select({ maxOrder: max(members.memberOrder) })
    .from(members)
    .where(eq(members.homeId, homeId))
  const maxOrder = (memberList[0]?.maxOrder ?? 0) + 1
  const result = await db
    .insert(members)
    .values({ id, homeId, name: data.name, memberOrder: maxOrder })
    .returning()
  return c.json(result[0], 201)
})

homesRouter.get('/:homeId/balances', async (c) => {
  const db = c.get('db')
  const { homeId } = c.req.param()
  const home = await db.select().from(homes).where(eq(homes.id, homeId)).get()
  if (!home) return c.json({ error: 'home not found' }, 404)
  const balances = await db
    .select({
      memberId: members.id,
      name: members.name,
      outstandingCents: sql<number>`CAST(COALESCE(SUM(${shares.amountCents}), 0) AS INTEGER)`,
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
    .orderBy(asc(members.memberOrder))
  return c.json({ balances }, 200)
})

homesRouter.get('/:homeId/bills', async (c) => {
  const db = c.get('db')
  const { homeId } = c.req.param()
  const home = await db.select().from(homes).where(eq(homes.id, homeId)).get()
  if (!home) return c.json({ error: 'home not found' }, 404)
  const homeBills = await db.select().from(bills).where(eq(bills.homeId, homeId))
  const homeShares = await db.select().from(shares).where(eq(shares.homeId, homeId))
  const memberList = await db.select().from(members).where(eq(members.homeId, homeId))
  const memberMap = new Map(memberList.map((m) => [m.id, m.name]))
  const result = homeBills.map((bill) => ({
    id: bill.id,
    homeId: bill.homeId,
    title: bill.title,
    totalCents: bill.totalCents,
    shares: homeShares
      .filter((s) => s.billId === bill.id)
      .map((s) => ({
        id: s.id,
        memberId: s.memberId,
        memberName: memberMap.get(s.memberId) ?? s.memberId,
        amountCents: s.amountCents,
        paidAt: s.paidAt,
      })),
  }))
  return c.json({ bills: result }, 200)
})
