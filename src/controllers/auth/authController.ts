import { Hono } from 'hono'
import { auth } from '../../better-auth/auth'
import type { AuthType } from '../../better-auth/auth'

const authController = new Hono<{ Bindings: AuthType }>({
  strict: false,
})

authController.on(['POST', 'GET'], '/auth/*', (c) => {
  return auth.handler(c.req.raw)
})

export default authController