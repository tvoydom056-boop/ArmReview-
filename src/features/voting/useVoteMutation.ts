'use client'

import { useMutation } from '@tanstack/react-query'

import type { ScaleValues } from '@/lib/rating'
import { VOTE_ERROR_MESSAGES, VOTE_FALLBACK_MESSAGE, isVoteErrorCode } from '@/types/api'

type VoteRequest = ScaleValues & { matchId: string; website: string; openedAt: number }

async function sendVote(request: VoteRequest): Promise<void> {
  // сетевая ошибка (офлайн, обрыв) — тот же понятный текст, а не «Failed to fetch»
  const response = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  }).catch(() => null)
  if (!response) throw new Error(VOTE_FALLBACK_MESSAGE)
  if (response.ok) return

  const body: unknown = await response.json().catch(() => null)
  const code = typeof body === 'object' && body !== null && 'error' in body ? body.error : null
  throw new Error(isVoteErrorCode(code) ? VOTE_ERROR_MESSAGES[code] : VOTE_FALLBACK_MESSAGE)
}

export function useVoteMutation() {
  return useMutation({ mutationFn: sendVote })
}
