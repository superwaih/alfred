import "server-only";
import { z } from "zod";

const email = z.email({ message: "Enter a valid email address." }).max(254).transform((value) => value.toLowerCase().trim());

export const registerBody = z.object({
  email,
  password: z.string().min(8, { message: "Use at least 8 characters for your password." }).max(200),
  name: z.string().trim().max(120).default(""),
});

export const loginBody = z.object({
  email,
  password: z.string().min(1).max(200),
});

export const checkoutBody = z.object({
  packId: z.string().min(1).max(64),
});

const job = {
  jobDescription: z.string().max(20000, { message: "That job description is too long (20,000 characters at most)." }).default(""),
  jobTitle: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
};
const profileText = z.string().min(20, { message: "Add your experience to your profile first." }).max(30000);

export const taskBodies = {
  "tailor-cv": z.object({ input: z.object({ ...job, jobDescription: job.jobDescription.pipe(z.string().min(40, { message: "Add the job description first." })), profileText }) }),
  "cover-letter": z.object({ input: z.object({ ...job, profileText }) }),
  answer: z.object({
    input: z.object({
      ...job,
      profileText,
      question: z.string().trim().min(3).max(2000),
      maxWords: z.number().int().min(10).max(2000).optional(),
    }),
  }),
  "parse-cv": z.object({
    input: z.object({
      cvText: z.string().trim().min(40, { message: "Add your CV first." }).max(40000, { message: "That CV is too long (40,000 characters at most)." }),
    }),
  }),
} as const;

export const emailBody = z.object({ email });
export const verifyEmailBody = z.object({ challengeId: z.string().regex(/^[a-f0-9]{64}$/), code: z.string().regex(/^\d{6}$/, "Enter the six-digit code.") });
export const resetPasswordBody = verifyEmailBody.extend({ password: registerBody.shape.password });
