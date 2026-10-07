import * as React from "react"
import { LockIcon, LockOpenIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

import { SOURCE_TAG, TAG_BASE } from "@/components/ai-agent/shared"
import type { SourceKey } from "@/lib/ai-agent/types"

/** Where a value came from — "From your brief", "Suggested", "Edited by you". */
export function SourceChip({ tag }: { tag: SourceKey | "filling" }) {
  const meta = SOURCE_TAG[tag]
  return <span className={cn(TAG_BASE, meta.tone)}>{meta.label}</span>
}

/**
 * A field's lock: locked fields are left alone by the agent. An open lock on
 * every field was a row of identical icons down the page, so it shows only
 * on the field being pointed at or worked in (the field's wrapper carries
 * `group/field`) — always when locked, and always on a touch screen, where
 * there is no pointing at.
 */
export function LockButton({
  locked,
  label,
  onToggle,
}: {
  locked: boolean
  label: string
  onToggle: () => void
}) {
  const aria = (locked ? "Unlock " : "Lock ") + label
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={aria}
      title={aria}
      className={cn(
        "ml-auto grid size-7 place-items-center rounded-lg transition-[color,background-color,opacity]",
        locked
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : "text-muted-foreground opacity-0 group-focus-within/field:opacity-100 group-hover/field:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 pointer-coarse:opacity-100"
      )}
    >
      {locked ? (
        <LockIcon className="size-3.5" />
      ) : (
        <LockOpenIcon className="size-3.5" />
      )}
    </button>
  )
}

/** A field's heading row: label (with a required mark), its source, its lock. */
export function FieldHead({
  htmlFor,
  label,
  required,
  extra,
  tag,
  locked,
  lockLabel,
  onToggleLock,
}: {
  htmlFor?: string
  label: string
  required?: boolean
  extra?: React.ReactNode
  tag: SourceKey | "filling"
  locked: boolean
  lockLabel: string
  onToggleLock: () => void
}) {
  const Label = htmlFor ? "label" : "span"
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        ) : null}
        {extra ? (
          <span className="ml-1 font-medium text-muted-foreground">
            {extra}
          </span>
        ) : null}
      </Label>
      <SourceChip tag={tag} />
      <LockButton locked={locked} label={lockLabel} onToggle={onToggleLock} />
    </div>
  )
}

export function FieldError({
  show,
  children,
}: {
  show: boolean
  children: React.ReactNode
}) {
  if (!show) return null
  return (
    <span className="text-xs font-semibold text-destructive">{children}</span>
  )
}

/**
 * The insight source mark: three rising bars and "calculus" — the
 * prototype's credit to Calculus, its salary and talent intelligence. It
 * followed every insight as "powered via calculus"; the "powered via" is in
 * the tooltip now, so a page of insights reads as insights, still credited.
 */
export function CalcMark() {
  return (
    <span
      title="Insight from Calculus, salary & talent intelligence"
      className="order-last ml-auto inline-flex shrink-0 items-center gap-1 pl-2.5 text-[11px] font-medium whitespace-nowrap text-muted-foreground/80 select-none"
    >
      <svg
        aria-hidden="true"
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
      >
        <path d="M5 20V13" className="stroke-border" />
        <path d="M12 20V6" className="stroke-primary" />
        <path d="M19 20v-9" className="stroke-muted-foreground" />
      </svg>
      calculus
    </span>
  )
}

/**
 * One insight under a field. With `onApply` the whole row is the button —
 * "Use it", "Apply", "Raise to 38–46L" — and the label is drawn as its link.
 */
export function Hint({
  children,
  action,
  onApply,
  title,
  oneLine,
}: {
  children: React.ReactNode
  action?: string
  onApply?: () => void
  title?: string
  oneLine?: boolean
}) {
  const body = (
    <>
      <span className={cn(oneLine && "min-w-0 truncate")}>{children}</span>
      {action ? (
        <span className="shrink-0 font-semibold whitespace-nowrap text-primary underline underline-offset-2 group-hover/hint:decoration-2">
          {action}
        </span>
      ) : null}
      <CalcMark />
    </>
  )
  const cls = cn(
    "flex min-h-6 w-full items-center gap-x-2 gap-y-1.5 text-left text-[12.5px] leading-snug text-muted-foreground",
    oneLine ? "flex-nowrap" : "flex-wrap"
  )
  if (onApply)
    return (
      <button
        type="button"
        title={title}
        onClick={onApply}
        className={cn(
          cls,
          "group/hint animate-in rounded-md transition-[background-color,box-shadow] fade-in hover:bg-muted/50 hover:shadow-[0_0_0_5px_var(--color-muted)]/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        )}
      >
        {body}
      </button>
    )
  return (
    <div title={title} className={cn(cls, "animate-in fade-in")}>
      {body}
    </div>
  )
}

/** A one-tap suggestion inside a hint: "+ Pune · 2K+ candidates". */
export function HintChip({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="min-h-6.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary/30 hover:bg-muted hover:text-primary"
    >
      {children}
    </button>
  )
}

/** On free posting, the insight is a teaser for Pro. */
export function Tease({
  children,
  onUnlock,
}: {
  children: React.ReactNode
  onUnlock: () => void
}) {
  return (
    <div className="flex min-h-6 flex-wrap items-center gap-2 text-[12.5px] text-warning">
      <LockIcon className="size-3" />
      <span>{children}</span>
      <button
        type="button"
        onClick={onUnlock}
        className="rounded px-1 font-semibold underline underline-offset-2 hover:bg-warning/10"
      >
        Unlock
      </button>
    </div>
  )
}

/** A choice of a fixed list, as the job form draws one. */
export function PickSelect({
  id,
  label,
  value,
  options,
  onChange,
  className,
  placeholder,
}: {
  id?: string
  label: string
  value: string
  options: { v: string; l: string }[]
  onChange: (value: string) => void
  className?: string
  placeholder?: string
}) {
  const items = options.map((option) => ({ value: option.v, label: option.l }))
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => onChange(next === null ? "" : String(next))}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        className={cn("w-full min-w-0", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
