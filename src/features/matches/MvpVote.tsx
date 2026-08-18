import { useMemo, useState } from 'react'
import type { Match, MvpVote as MvpVoteType, Player, Slot } from '../../types'
import { displayName } from '../../types'
import { errorMessage } from '../../lib/errors'

type Props = {
  match: Match
  slots: { A: Slot[]; B: Slot[] }
  byId: Map<string, Player>
  sessionPlayerId: string | null
  votes: MvpVoteType[]
  onVote: (votedPlayerId: string) => Promise<void>
}

/**
 * Only players who actually played in this match can vote, and only once — the vote is
 * final, matching the DB's insert-only policy on match_mvp_votes. Renders nothing for
 * anyone else (not logged in, or logged in as someone who didn't play that day).
 */
export function MvpVote({ match, slots, byId, sessionPlayerId, votes, onVote }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidates = useMemo(() => {
    const ids = new Set<string>()
    for (const slot of [...slots.A, ...slots.B]) if (slot.playerId) ids.add(slot.playerId)
    return [...ids].map((id) => byId.get(id)).filter((p): p is Player => !!p)
  }, [slots, byId])

  if (!sessionPlayerId || !candidates.some((p) => p.id === sessionPlayerId)) return null

  const myVote = votes.find((v) => v.voterPlayerId === sessionPlayerId)

  if (myVote) {
    const voted = byId.get(myVote.votedPlayerId)
    return (
      <p className="text-sm text-white/60">
        Votaste a <span className="font-semibold text-white">{voted ? displayName(voted) : '—'}</span> ⭐
      </p>
    )
  }

  async function vote(votedPlayerId: string) {
    setBusy(true)
    setError(null)
    try {
      await onVote(votedPlayerId)
    } catch (e) {
      setError(errorMessage(e, 'No se pudo registrar el voto'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
        Votá el MVP del partido {match.cancha}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {candidates.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={busy}
            onClick={() => vote(p.id)}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm
              transition hover:border-emerald-400/60 hover:bg-white/10 active:scale-95
              disabled:cursor-default disabled:opacity-50"
          >
            {displayName(p)}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  )
}
