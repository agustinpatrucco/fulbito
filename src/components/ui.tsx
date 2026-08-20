import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger'
}

export function Button({ variant = 'ghost', className = '', ...rest }: ButtonProps) {
  const styles = {
    primary: 'bg-emerald-500 text-black hover:bg-emerald-400 font-bold',
    ghost: 'bg-white/8 text-white hover:bg-white/15 border border-white/10',
    danger: 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30',
  }[variant]

  return (
    <button
      className={`rounded-lg px-3 py-2 text-sm transition disabled:cursor-not-allowed
        disabled:opacity-40 ${styles} ${className}`}
      {...rest}
    />
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-white/50">
        {label}
      </span>
      {children}
    </label>
  )
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm
        outline-none placeholder:text-white/25 focus:border-emerald-400/60 ${className}`}
      {...rest}
    />
  )
}

export function Select({ className = '', ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm
        outline-none focus:border-emerald-400/60 ${className}`}
      {...rest}
    />
  )
}

/** Multi-select rendered as toggle chips — faster than a <select> on a phone. */
export function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  multiple = false,
  renderLabel,
}: {
  options: readonly T[]
  value: T[]
  onChange: (next: T[]) => void
  multiple?: boolean
  renderLabel?: (option: T) => ReactNode
}) {
  function toggle(option: T) {
    if (!multiple) return onChange([option])
    // Order matters: positions are stored preference-first, so appending keeps the
    // order the user tapped them in.
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option)
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              active
                ? 'border-emerald-400 bg-emerald-400/20 font-semibold text-emerald-200'
                : 'border-white/12 bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {renderLabel ? renderLabel(option) : option}
          </button>
        )
      })}
    </div>
  )
}
