import { Hono } from 'hono'
import { auth } from './better-auth/auth'
import test from './routes/test'
import authen from './routes/authen'
import { compress } from '@hono/bun-compress'
import { cors } from "hono/cors";
import user from './routes/user'

const app = new Hono<{
	Variables: {
		user: typeof auth.$Infer.Session.user | null;
		session: typeof auth.$Infer.Session.session | null
	}
}>().basePath('/api');
app.use("*", async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	console.log('session', session)
  	if (!session) {
    	c.set("user", null);
    	c.set("session", null);
    	return next();
  	}
  	c.set("user", session.user);
  	c.set("session", session.session);
  	return next();
});
app.use('*', cors({
	origin: ['http://tindecken.xyz', 'https://tindecken.xyz', 'http://localhost', 'http://localhost:1000', 'http://localhost:3001', 'https://mypaperwork.tindecken.xyz'],
	allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
	credentials: true,
	exposeHeaders: ['Content-Length', 'X-Kuma-Revision']
}))
app.use(compress())
app.on(["POST", "GET"], "/auth/*", (c) => {
	return auth.handler(c.req.raw);
});
app.notFound((c) => {
  return c.text('404 Route not found !', 404)
})
app.route('/test', test)
app.route('/authen', authen)
app.route('/user', user)


export default { 
  port: 3001, 
  fetch: app.fetch, 
} 