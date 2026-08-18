import { useRef, useState } from 'react'
import { POSITIONS, TIERS, TIER_LABELS, POSITION_LABELS } from '../../types'
import type { Player, PlayerDraft, Position, Tier } from '../../types'
import { Button, ChipGroup, Field, Input } from '../../components/ui'
import { errorMessage } from '../../lib/errors'
import { PlayerCard } from './PlayerCard'
import { uploadPhoto, deletePhoto } from './photo'

type Props = {
  /** Undefined when creating. */
  player?: Player
  /** Pre-fills the name when the importer found someone who isn't in the roster yet. */
  initialName?: string
  onSave: (draft: PlayerDraft) => Promise<Player>
  onDelete?: () => Promise<void>
  onDone: () => void
}

export function PlayerForm({ player, initialName, onSave, onDelete, onDone }: Props) {
  const [name, setName] = useState(player?.name ?? initialName ?? '')
  const [nickname, setNickname] = useState(player?.nickname ?? '')
  const [aliasText, setAliasText] = useState((player?.aliases ?? []).join(', '))
  const [positions, setPositions] = useState<Position[]>(player?.positions ?? ['MC'])
  const [tier, setTier] = useState<Tier>(player?.tier ?? 'silver')
  const [active, setActive] = useState(player?.active ?? true)
  const [photoUrl, setPhotoUrl] = useState(player?.photoUrl ?? null)
  const [photoPath, setPhotoPath] = useState(player?.photoPath ?? null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const aliases = aliasText
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)

  // Lets the live preview render before the player exists in the database.
  const preview: Player = {
    id: player?.id ?? 'preview',
    name: name || 'Nombre',
    nickname: nickname || null,
    aliases,
    positions: positions.length ? positions : ['MC'],
    tier,
    photoUrl,
    photoPath,
    active,
    createdAt: player?.createdAt ?? new Date().toISOString(),
    isAdmin: player?.isAdmin ?? false,
    passwordHash: player?.passwordHash ?? null,
    passwordSalt: player?.passwordSalt ?? null,
  }

  async function handlePhoto(file: File) {
    setBusy(true)
    setError(null)
    try {
      const previousPath = photoPath
      const stored = await uploadPhoto(file, player?.id ?? crypto.randomUUID())
      setPhotoUrl(stored.url)
      setPhotoPath(stored.path)
      await deletePhoto(previousPath)
    } catch (e) {
      setError(errorMessage(e, 'No se pudo subir la foto'))
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    if (!name.trim()) return setError('El nombre es obligatorio')
    if (positions.length === 0) return setError('Elegí al menos una posición')

    setBusy(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        nickname: nickname.trim() || null,
        aliases,
        positions,
        tier,
        photoUrl,
        photoPath,
        active,
      })
      onDone()
    } catch (e) {
      setError(errorMessage(e, 'No se pudo guardar'))
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="w-28 shrink-0">
          <PlayerCard player={preview} />
          <Button
            className="mt-2 w-full"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            {photoUrl ? 'Cambiar foto' : 'Subir foto'}
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handlePhoto(file)
              e.target.value = ''
            }}
          />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <Field label="Nombre completo">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez" />
          </Field>
          <Field label="Apodo (se muestra en la carta)">
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Juanchi"
            />
          </Field>
        </div>
      </div>

      <Field label="Posiciones (tocá en orden de preferencia)">
        <ChipGroup
          options={POSITIONS}
          value={positions}
          onChange={setPositions}
          multiple
          renderLabel={(p) => (
            <span title={POSITION_LABELS[p]}>
              {p}
              {positions[0] === p && positions.length > 1 && (
                <span className="ml-1 text-[10px] opacity-70">1ª</span>
              )}
            </span>
          )}
        />
      </Field>

      <Field label="Categoría de carta">
        <ChipGroup
          options={TIERS}
          value={[tier]}
          onChange={([t]) => t && setTier(t)}
          renderLabel={(t) => TIER_LABELS[t]}
        />
      </Field>

      <Field label="Otros nombres para reconocerlo al pegar la lista (separados por coma)">
        <Input
          value={aliasText}
          onChange={(e) => setAliasText(e.target.value)}
          placeholder="Juanchi, Perez, El Flaco"
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-white/70">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-emerald-500"
        />
        Disponible para jugar
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button variant="primary" className="flex-1" onClick={handleSave} disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar'}
        </Button>
        {onDelete && (
          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              if (!confirm(`¿Eliminar a ${name}?`)) return
              setBusy(true)
              await deletePhoto(photoPath)
              await onDelete()
              onDone()
            }}
          >
            Eliminar
          </Button>
        )}
      </div>
    </div>
  )
}
