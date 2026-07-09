import { z } from "zod";

export const createNetworkSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  accessMode: z.enum(["private", "public"]),
  updateMode: z.enum(["centralized", "collaborative"]),
});

export const decideAccessSchema = z.object({
  userId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
});

export const publishVersionSchema = z.object({
  infoHash: z.string().min(1),
  filename: z.string().min(1),
  magnet: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
  parentVersionId: z.string().optional(),
});

export const announceFileSchema = z.object({
  infoHash: z.string().min(1),
  filename: z.string().min(1),
  magnet: z.string().optional(),
  size: z.number().int().nonnegative().optional(),
});
