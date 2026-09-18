import { z } from 'zod'

const scale = z.number().int().min(1).max(5)

export const voteInputSchema = z.object({
  matchId: z.string().regex(/^\d+$/),
  spectacle: scale,
  intrigue: scale,
  technique: scale,
  refereeing: scale,
  // Honeypot: у людей всегда пусто. Схемой НЕ отклоняем — заполненное поле обрабатывает service
  // тихим 200 (STRUCTURE.md § 2: бот-проверки не выдают себя), иначе бот увидит 400 и подстроится
  website: z.string().optional(),
  openedAt: z.number(), // unix ms, когда открылось окно
})

export type VoteInput = z.infer<typeof voteInputSchema>
