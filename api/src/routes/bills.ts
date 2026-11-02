// Route handlers for /api/homes/:homeId/bills and /api/bills/:billId/shares/:shareId/pay
import { randomUUID } from 'node:crypto'
import { sValidator } from '@hono/standard-validator'
import { and, eq, isNull } from 'drizzle-orm'
import { Hono } from 'hono'
import { bills, homes, members, shares } from '../db/schema'
import { billSchema } from '../schemas'
import { splitBill } from '../services/split-bill'
import type { AppEnv } from '../types'

export const billsRouter = new Hono<AppEnv>()

billsRouter.post(
  '/homes/:homeId/bills',
  sValidator('json', billSchema, (result, c) => {
    if (!result.success) return c.json({ error: 'total is not a positive whole number' }, 422)
  }),
  async (c) => {
    const data = c.req.valid('json')
    const { homeId } = c.req.param()
    const db = c.get('db')
    if (data.totalCents <= 0) return c.json({ error: 'total is not a positive whole number' }, 422)
    const home = await db.select().from(homes).where(eq(homes.id, homeId)).get()
    if (!home) return c.json({ error: 'home not found' }, 404)
    const memberList = await db.select().from(members).where(eq(members.homeId, homeId))
    if (memberList.length === 0) return c.json({ error: 'the home has no members' }, 422)
    const bill = await db
      .insert(bills)
      .values({ id: randomUUID(), homeId, title: data.title, totalCents: data.totalCents })
      .returning()
    const billId = bill[0]?.id
    if (!billId) return c.json({ error: 'Internal Server Error' }, 500)
    const calculatedShares = splitBill(data.totalCents, memberList)
    const shareRecords = calculatedShares.map((share) => ({
      id: crypto.randomUUID(),
      homeId,
      billId,
      memberId: share.memberId,
      amountCents: share.amountCents,
    }))
    const insertedShares = await db.insert(shares).values(shareRecords).returning()
    return c.json(
      {
        id: billId,
        homeId,
        title: data.title,
        totalCents: data.totalCents,
        shares: insertedShares.map((s) => ({
          id: s.id,
          memberId: s.memberId,
          amountCents: s.amountCents,
          paidAt: s.paidAt,
        })),
      },
      201,
    )
  },
)

billsRouter.post('/bills/:billId/shares/:shareId/pay', async (c) => {
  const idempotencyKey = c.req.header('Idempotency-Key')
  const { billId, shareId } = c.req.param()
  const db = c.get('db')
  if (!idempotencyKey) return c.json({ error: 'MISSING_IDEMPOTENCY_KEY' }, 400)
  const paidAt = new Date().toISOString()
  const [updatedShare] = await db
    .update(shares)
    .set({ idempotencyKey, paidAt })
    .where(and(eq(shares.id, shareId), eq(shares.billId, billId), isNull(shares.paidAt)))
    .returning()
  if (updatedShare)
    return c.json(
      {
        id: updatedShare.id,
        memberId: updatedShare.memberId,
        amountCents: updatedShare.amountCents,
        paidAt: updatedShare.paidAt,
      },
      200,
    )
  const existingShare = await db
    .select()
    .from(shares)
    .where(and(eq(shares.id, shareId), eq(shares.billId, billId)))
    .get()
  if (!existingShare) return c.json({ error: 'SHARE_NOT_FOUND' }, 404)
  if (existingShare.paidAt !== null && existingShare.idempotencyKey === idempotencyKey)
    return c.json(
      {
        id: existingShare.id,
        memberId: existingShare.memberId,
        amountCents: existingShare.amountCents,
        paidAt: existingShare.paidAt,
      },
      200,
    )
  if (existingShare.paidAt !== null) return c.json({ error: 'SHARE_ALREADY_PAID' }, 409)
  return c.json({ error: 'PAYMENT_FAILED' }, 500)
})
