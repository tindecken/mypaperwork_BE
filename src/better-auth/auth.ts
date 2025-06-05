import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { db } from "../../drizzle/index"; // your drizzle instance
import { ulid } from "ulid";
 
export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "sqlite", // or "mysql", "sqlite",
    }),
    advanced: {
        database: {
            generateId() {
                return ulid()
            },
        },
        ipAddress: {
			ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "cf-connecting-ip", "true-client-ip"],
			disableIpTracking: false
		},
    },
    trustedOrigins: [
        "http://localhost:3000",
        "http://localhost:1000"],
    emailAndPassword: {
        enabled: true,
    },
    user: {
        modelName: "usersTable",
        fields: {
            emailVerified: "isEmailVerified",
        },
        additionalFields: {
            userType: {
                type: "string",
                required: true,
                defaultValue: "free",
                input: false
            },
            avatar: {
                type: "string",
                required: false,
                input: false
            },
            isDeleted: {
                type: "number",
                required: false,
                defaultValue: 0,
                input: false
            },
        }
    },
    session: {
        modelName: "sessionsTable",
        additionalFields: {
            selectedFileId: {
                type: "string",
                required: false,
                input: false
            }
        }
    },
    account: {
        modelName: "accountsTable",
    },
    verification: {
        modelName: "verificationsTable",
    },
    socialProviders: {
        google: {
            prompt: "select_account",
            clientId: process.env["GOOGLE_CLIENT_ID"]!,
            clientSecret: process.env["GOOGLE_CLIENT_SECRET"]!,
            // callbackURL: process.env["GOOGLE_CALLBACK_URL"]!
        }
    },
    hooks: {
        after: createAuthMiddleware(async (ctx) => {
            if(ctx.path.startsWith("/sign-up")){
                const newSession = ctx.context.newSession;
                if(newSession){
                    console.log('new session', newSession)
                }
            }
        }),
    },
});