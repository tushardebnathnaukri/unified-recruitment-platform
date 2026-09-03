import * as React from "react"

import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { cn } from "@workspace/ui/lib/utils"

/**
 * The two helpers every long form in this prototype needs. They started inside
 * the post-a-job form and moved here once the database search wanted the same
 * label/required/hint arrangement — two copies would have drifted the moment
 * one form changed its required marker.
 */

/** Label, required marker, optional marker and helper text in one place. */
export function Field({
  label,
  htmlFor,
  required,
  optional,
  hint,
  action,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  optional?: boolean
  hint?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <Label htmlFor={htmlFor} className="gap-1.5">
          {label}
          {required && (
            <span className="text-destructive" aria-hidden="true">
              *
            </span>
          )}
          {optional && (
            <span className="text-xs font-normal text-muted-foreground">
              Optional
            </span>
          )}
        </Label>
        {action}
      </div>

      {children}

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** A single-line select whose option values double as their labels. */
export function OptionSelect({
  id,
  value,
  onValueChange,
  placeholder,
  options,
  className,
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  options: string[]
  className?: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onValueChange(next as string)}
    >
      <SelectTrigger id={id} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
