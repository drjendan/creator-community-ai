import { z } from "zod";

export const demoRequestSchema = z.object({
  name: z.string().trim().min(2, "Enter your name."),
  email: z.string().trim().email("Enter a valid email address."),
  organization: z.string().trim().min(2, "Enter your organization."),
  audienceSize: z.coerce.number().int().nonnegative("Audience size cannot be negative.")
});

export type DemoRequest = z.infer<typeof demoRequestSchema>;
