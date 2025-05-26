import { Hono } from "hono";
const app = new Hono();

app.post('/', (c) => {
  return c.text('Test Controller!')
})

export default app