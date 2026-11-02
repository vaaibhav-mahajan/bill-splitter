// Hono app setup — registers middleware and mounts all route handlers
import { Hono } from 'hono'
import { databaseMiddleware } from './middleware/database'
import { billsRouter } from './routes/bills'
import { homesRouter } from './routes/homes'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

app.use('*', databaseMiddleware)
app.get('/api/health', (c) => c.json({ status: 'ok' }))
app.route('/api/homes', homesRouter)
app.route('/api', billsRouter)

export default app
