import { Link } from "react-router"
import { CheckIcon, SearchIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { DOCKED_CARD } from "@/lib/docked"

/**
 * The chat's last card when the form is beside it: the posting's status.
 *
 * THE CHAT'S END IS THE FORM'S SUBMIT. Once the conversation has gathered
 * what it can, the thing left to do is on the form — the fields the chat
 * never asked for — and this card says so, in the form's own words, with the
 * one button that finishes the job. Disabled until the form is whole, and
 * saying why, rather than a Post button that fails on press. Hiremate's
 * "Your draft brief is ready · Fill all required fields to continue" is the
 * shape; "still needed" as chips is the honest part it left out.
 */
export function PostingStatusCard({
  missing,
  search,
  onPost,
}: {
  /** The required fields the form still needs, in the form's words. */
  missing: string[]
  /** Search Resume on the brief, if there is a role to search for. */
  search?: string
  onPost: () => void
}) {
  const ready = missing.length === 0
  return (
    <div className={cn(DOCKED_CARD, "flex flex-col gap-3 px-5 pt-4 pb-4")}>
      <div>
        <p className="text-base font-semibold text-balance">
          {ready ? "Your posting is ready" : "Almost there"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {ready
            ? "Edit any field on the left, then post."
            : "Edit any field on the left. Still needed:"}
        </p>
        {missing.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {missing.map((field) => (
              <span
                key={field}
                className="rounded-4xl bg-muted px-2.5 py-1 text-xs font-medium"
              >
                {field}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button className="min-w-0 flex-1" disabled={!ready} onClick={onPost}>
          <CheckIcon data-icon="inline-start" />
          <span className="truncate">
            {ready ? "Post job" : "Fill all required fields to post"}
          </span>
        </Button>
        {search ? (
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to={search} />}
          >
            <SearchIcon data-icon="inline-start" />
            Find people
          </Button>
        ) : null}
      </div>
    </div>
  )
}
