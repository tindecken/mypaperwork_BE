import { Hono } from "hono";
import { auth } from "../better-auth/auth";

// Define the interface for the signup request body
interface SignupBody {
    name: string;
    email: string;
    password: string;
}

// Use the interface in the Hono app type
const app = new Hono();

app.post('/signupemail', async (c) => {
    console.log(c.body);
    // Cast the body to the correct type
    const body = await c.req.json() as SignupBody;
    const { name, email, password } = body;
    const result = await auth.api.signUpEmail({ headers: c.req.raw.headers, body: { name, email, password } });
    return c.json({ message: "User created failed" });
})

export default app