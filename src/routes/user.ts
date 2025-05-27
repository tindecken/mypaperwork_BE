import { Hono } from "hono";
import { isAuthenticated } from "../libs/isAuthenticated";
const app = new Hono();

app.get('/getrole', (c) => {
    if(!isAuthenticated(c)) return c.json({
        role: "guest"
    })
    return c.json({
        role: "user"
    })
})

export default app