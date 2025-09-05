import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";
import { db } from "../../drizzle/index"; // your drizzle instance
import { ulid } from "ulid";
import { createTransport } from "nodemailer";
import { eq, sql } from "drizzle-orm";
import { themesTable, usersThemesTable } from "../db/schema";
 
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
        "https://paperwork.tindecken.xyz",
        "http://localhost:1000", "https://10.10.0.27:1000", "https://localhost:1000"],
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 6,
        maxPasswordLength: 100,
        // Reset passwrord via email: (doc) https://www.better-auth.com/docs/authentication/email-password#request-password-reset
        sendResetPassword: async ({user, url, token}, request) => { 
            url = process.env.RESET_PASSWORD_URL + "/#/reset-password?token=" +token;
            const transporter = createTransport({
                host: "smtp.useplunk.com",
                secure: true,
			    port: 465,
                auth: {
                    user: "plunk",
                    pass: process.env.PLUNK_SMTP_PASSWORD
                }
            });
            const mailOptions = {
                from: process.env.PLUNK_SEND_FROM,
                to: user.email,
                subject: "Paperwork - Reset Password",
                text: `Click the link below to reset your password: ${url}`
            };
            await transporter.sendMail(mailOptions);
        }
    },
    user: {
        deleteUser: {
            enabled: true,
        },
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
        }
    },
    hooks: {
        after: createAuthMiddleware(async (ctx) => {
            if(ctx.path.startsWith("/sign-up")){
                const newSession = ctx.context.newSession;
                if(newSession){
                    const userId = newSession.user.id   
                    const defaultTheme = await db.select().from(themesTable).where(eq(themesTable.isDefault, 1));
                    let defaultThemeId = "";
                    if(defaultTheme.length === 0){
                        console.log('Default theme not found')
                    } else {
                        defaultThemeId = defaultTheme[0].id;
                    }
                    const userTheme = await db.select().from(usersThemesTable).where(eq(usersThemesTable.userId, userId));
                    if(userTheme.length === 0){
                        await db.insert(usersThemesTable).values({
                            id: ulid(),
                            userId: userId,
                            themeId: defaultThemeId,
                            createdAt: sql`(CURRENT_TIMESTAMP)`,
                            createdBy: "system",
                        });
                    }
                }
            }
        }),

    },
});

export type AuthType = {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
}