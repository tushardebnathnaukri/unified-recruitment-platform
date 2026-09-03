import { UsersIcon } from "lucide-react"

import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"
import type { ChannelId } from "@/lib/mandate"
import { CHANNELS } from "@/lib/mandate"

/**
 * The two channels a mandate reaches people through, and the promise that they
 * land in one place.
 *
 * EACH CHANNEL SAYS WHAT IT COSTS. Posting a job is public and spends a credit;
 * a database search is neither. One sentence of natural-language input quietly
 * publishing a job advert is the failure mode that would kill trust in this
 * whole idea, so the consequence is stated on the card and the post still goes
 * through the form for approval. "Fills the form" rather than "posts the job"
 * is the difference between the AI doing your typing and the AI acting for you.
 */
export function MandateChannels({
  enabled,
  onToggle,
  standing,
  onStandingChange,
}: {
  enabled: ChannelId[]
  onToggle: (id: ChannelId) => void
  standing: boolean
  onStandingChange: (standing: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {CHANNELS.map((channel) => {
          const on = enabled.includes(channel.id)
          const Icon = channel.icon

          return (
            <div
              key={channel.id}
              className={cn(
                "flex flex-col gap-2 rounded-lg border border-border p-3 transition-colors",
                on && "border-primary bg-primary/5"
              )}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    on ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <Label htmlFor={`channel-${channel.id}`} className="flex-1">
                  {channel.label}
                </Label>
                <Switch
                  id={`channel-${channel.id}`}
                  checked={on}
                  onCheckedChange={() => onToggle(channel.id)}
                />
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                {channel.description}
              </p>
              <p className="text-xs leading-relaxed font-medium">
                {channel.consequence}
              </p>
            </div>
          )
        })}
      </div>

      {/* The payoff line. Two channels that produce two lists is what the
          recruiter already has; saying so here is the promise being made. */}
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <UsersIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {enabled.length === 2
          ? "Applicants and sourced profiles arrive in one list, marked by where they came from."
          : "Everything this mandate finds arrives in one list, marked by where it came from."}
      </p>

      <Label className="items-start gap-3 rounded-lg border border-border p-3 font-normal">
        <Switch
          checked={standing}
          onCheckedChange={onStandingChange}
          className="mt-0.5"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Keep this mandate running</span>
          <span className="text-xs leading-relaxed text-muted-foreground">
            Re-runs as new profiles appear and adds them to the same list,
            instead of being a one-off search you have to remember to repeat.
          </span>
        </span>
      </Label>
    </div>
  )
}
