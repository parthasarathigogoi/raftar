import { z } from "zod";
export const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.email(), phone: z.string().trim().min(7).max(25).optional(), password: z.string().min(12).max(128) });
export const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(128) });
