import { z } from "zod";

/**
 * Contratto del beacon POST /api/t. Il client (components/analytics/Tracker)
 * importa solo i TIPI da qui; il server valida con lo schema.
 *
 * c = consenso. Con c=false il server scarta vid/sid e accetta solo
 * pageview / section_view / section_dwell: nessun identificativo, mai.
 */
const short = (max: number) => z.string().trim().max(max);
const sectionName = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,39}$/i);

export const trackEventSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("pageview") }),
  z.object({
    t: z.literal("section_view"),
    s: sectionName,
    i: z.number().int().min(0).max(99),
    d: z.number().int().min(0).max(3_600_000),
  }),
  z.object({
    t: z.literal("section_dwell"),
    s: sectionName,
    i: z.number().int().min(0).max(99),
    d: z.number().int().min(0).max(3_600_000),
  }),
  z.object({
    t: z.literal("click"),
    l: short(80),
    h: short(200).optional(),
    s: short(40).optional(),
  }),
  z.object({ t: z.literal("scroll_depth"), p: z.number().int().min(0).max(100) }),
  z.object({ t: z.literal("session_end"), d: z.number().int().min(0).max(24 * 3_600_000) }),
]);

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

export const trackPayloadSchema = z.object({
  v: z.literal(1),
  c: z.boolean(),
  vid: uuid.optional(),
  sid: uuid.optional(),
  path: z.string().max(200).regex(/^\//),
  locale: z.enum(["it", "en"]).optional(),
  ref: z
    .string()
    .max(120)
    .regex(/^[a-z0-9.-]+$/i)
    .optional(),
  vp: z.enum(["xs", "sm", "md", "lg", "xl"]).optional(),
  e: z.array(trackEventSchema).min(1).max(60),
});

export type TrackEvent = z.infer<typeof trackEventSchema>;
export type TrackPayload = z.infer<typeof trackPayloadSchema>;

export const ANONYMOUS_EVENT_TYPES = new Set<TrackEvent["t"]>(["pageview", "section_view", "section_dwell"]);
