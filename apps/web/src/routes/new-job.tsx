import * as React from "react"
import { Link, useSearchParams } from "react-router"
import { ArrowLeftIcon, SparklesIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { JobForm } from "@/components/job-form"
import { formFrom } from "@/lib/job-form"
import { chatFrom, draftFrom } from "@/lib/job-intake"

/**
 * Post a job — the form on its own page.
 *
 * THE FORM IS `components/job-form.tsx`; this is the page around it. The chat's
 * "Fill in a form instead" carries the draft in the query string
 * (`postingHref`), and the form takes it once, on arrival — from the first
 * keystroke the form owns its values, because a form that rewrote its URL on
 * every character would put a hundred entries in the back button.
 */
export function NewJobPage() {
  const [params] = useSearchParams()

  const [value, setValue] = React.useState(() =>
    formFrom(draftFrom(params), params.getAll("ind"))
  )
  const chat = chatFrom(params)
  // Anything besides the way back is a value the chat had gathered.
  const fromAgent = Array.from(params.keys()).some((key) => key !== "chat")

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* No heading: "Post a job" is already in the top bar, so this says
            where the values came from rather than repeating the name. */}
        <p className="text-sm text-muted-foreground">
          {fromAgent
            ? "Filled in from your conversation on the Dashboard. Change anything."
            : "Fields marked * are needed to post."}
        </p>
        {/* The door back. Opened from a chat, it is THAT chat — its URL is the
            conversation, so every turn comes back as it was. Opened cold, it
            starts a fresh one rather than carrying the form's values in,
            because a chat that opened already answered would have nothing
            left to ask. */}
        {chat ? (
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link to={chat} />}
          >
            <ArrowLeftIcon data-icon="inline-start" />
            Back to the chat
          </Button>
        ) : (
          <Button
            nativeButton={false}
            variant="outline"
            size="sm"
            render={<Link to="/dashboard?ask=Help+me+post+a+job" />}
          >
            <SparklesIcon data-icon="inline-start" />
            Talk it through instead
          </Button>
        )}
      </div>

      <JobForm
        value={value}
        onChange={setValue}
        cancelTo={<Link to="/jobs" />}
      />
    </div>
  )
}
