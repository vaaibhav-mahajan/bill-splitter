// Zod validation schemas for request bodies
import zod from 'zod'

export const homeSchema = zod.object({
  name: zod.string(),
})

export const memberSchema = zod.object({
  name: zod.string(),
})

export const billSchema = zod.object({
  title: zod.string().min(1),
  totalCents: zod.number().int().positive(),
})
