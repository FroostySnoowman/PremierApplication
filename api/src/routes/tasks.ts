import { Hono } from 'hono'
import { z } from 'zod'
import type { Bindings } from '../lib/env'
import { nowIso, type DbTask } from '../lib/db'
import { badRequest, notFound } from '../lib/errors'
import { enforceRateLimit, rateLimitPolicy } from '../lib/rateLimit'
import { requireAuth, type AuthContext } from '../middleware/requireAuth'

type App = Hono<{ Bindings: Bindings; Variables: { auth: AuthContext } }>

const prioritySchema = z.enum(['low', 'medium', 'high'])
const statusSchema = z.enum(['active', 'completed'])
const filterSchema = z.enum(['all', 'active', 'completed']).default('all')
const idSchema = z.string().uuid()

const dueAtSchema = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid due date' })
  .nullable()

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().default(''),
  due_at: dueAtSchema.optional(),
  priority: prioritySchema.optional().default('medium'),
})

const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    due_at: dueAtSchema.optional(),
    priority: prioritySchema.optional(),
    status: statusSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' })

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1).max(500),
})

function serializeTask(task: DbTask) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    dueAt: task.due_at,
    priority: task.priority,
    status: task.status,
    sortOrder: task.sort_order,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  }
}

async function limitTaskWrites(db: D1Database, userId: string): Promise<void> {
  await enforceRateLimit(db, {
    key: `tasks:write:user:${userId}`,
    ...rateLimitPolicy.taskWritePerUser,
  })
}

export function registerTaskRoutes(app: App): void {
  app.get('/tasks', requireAuth, async (c) => {
    const auth = c.get('auth')
    const filter = filterSchema.parse(c.req.query('filter') ?? 'all')
    let query = 'SELECT * FROM tasks WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC'
    if (filter === 'active') {
      query =
        "SELECT * FROM tasks WHERE user_id = ? AND status = 'active' ORDER BY sort_order ASC, created_at ASC"
    } else if (filter === 'completed') {
      query =
        "SELECT * FROM tasks WHERE user_id = ? AND status = 'completed' ORDER BY sort_order ASC, created_at ASC"
    }
    const { results } = await c.env.DB.prepare(query).bind(auth.userId).all<DbTask>()
    return c.json({ tasks: (results ?? []).map(serializeTask) })
  })

  app.get('/tasks/:id', requireAuth, async (c) => {
    const auth = c.get('auth')
    const id = idSchema.parse(c.req.param('id'))
    const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .bind(id, auth.userId)
      .first<DbTask>()
    if (!task) notFound('Task not found')
    return c.json({ task: serializeTask(task) })
  })

  app.post('/tasks', requireAuth, async (c) => {
    const auth = c.get('auth')
    await limitTaskWrites(c.env.DB, auth.userId)
    const body = createSchema.parse(await c.req.json())
    const id = crypto.randomUUID()
    const now = nowIso()
    const maxRow = await c.env.DB.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM tasks WHERE user_id = ?',
    )
      .bind(auth.userId)
      .first<{ max_order: number }>()
    const sortOrder = (maxRow?.max_order ?? -1) + 1
    const dueAt = body.due_at === undefined ? null : body.due_at

    await c.env.DB.prepare(
      `INSERT INTO tasks (id, user_id, title, description, due_at, priority, status, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    )
      .bind(id, auth.userId, body.title, body.description, dueAt, body.priority, sortOrder, now, now)
      .run()

    const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .bind(id, auth.userId)
      .first<DbTask>()
    if (!task) badRequest('Failed to create task')
    return c.json({ task: serializeTask(task) }, 201)
  })

  app.put('/tasks/reorder', requireAuth, async (c) => {
    const auth = c.get('auth')
    await limitTaskWrites(c.env.DB, auth.userId)
    const body = reorderSchema.parse(await c.req.json())
    const unique = new Set(body.orderedIds)
    if (unique.size !== body.orderedIds.length) badRequest('Duplicate task ids')

    const placeholders = body.orderedIds.map(() => '?').join(',')
    const { results } = await c.env.DB.prepare(
      `SELECT id FROM tasks WHERE user_id = ? AND id IN (${placeholders})`,
    )
      .bind(auth.userId, ...body.orderedIds)
      .all<{ id: string }>()

    if ((results ?? []).length !== body.orderedIds.length) {
      badRequest('One or more tasks were not found')
    }

    const now = nowIso()
    const statements = body.orderedIds.map((taskId, index) =>
      c.env.DB.prepare('UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ? AND user_id = ?').bind(
        index,
        now,
        taskId,
        auth.userId,
      ),
    )
    await c.env.DB.batch(statements)
    return c.json({ ok: true })
  })

  app.patch('/tasks/:id', requireAuth, async (c) => {
    const auth = c.get('auth')
    await limitTaskWrites(c.env.DB, auth.userId)
    const id = idSchema.parse(c.req.param('id'))
    const body = updateSchema.parse(await c.req.json())
    const existing = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .bind(id, auth.userId)
      .first<DbTask>()
    if (!existing) notFound('Task not found')

    const title = body.title ?? existing.title
    const description = body.description ?? existing.description
    const dueAt = body.due_at !== undefined ? body.due_at : existing.due_at
    const priority = body.priority ?? existing.priority
    const status = body.status ?? existing.status
    const now = nowIso()

    await c.env.DB.prepare(
      `UPDATE tasks SET title = ?, description = ?, due_at = ?, priority = ?, status = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
      .bind(title, description, dueAt, priority, status, now, id, auth.userId)
      .run()

    const task = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
      .bind(id, auth.userId)
      .first<DbTask>()
    if (!task) notFound('Task not found')
    return c.json({ task: serializeTask(task) })
  })

  app.delete('/tasks/:id', requireAuth, async (c) => {
    const auth = c.get('auth')
    await limitTaskWrites(c.env.DB, auth.userId)
    const id = idSchema.parse(c.req.param('id'))
    const existing = await c.env.DB.prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?')
      .bind(id, auth.userId)
      .first<{ id: string }>()
    if (!existing) notFound('Task not found')
    await c.env.DB.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').bind(id, auth.userId).run()
    return c.json({ ok: true })
  })
}
