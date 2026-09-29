import * as React from "react"
import {
  BuildingIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  PlusIcon,
  ShareIcon,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { photoFor } from "@/lib/avatars"
import { describePosting, REMOTE, type PostingDraft } from "@/lib/job-intake"
import { RECRUITER } from "@/lib/recruiter"

/**
 * The posting as a candidate would open it: the iimjobs app's job page.
 *
 * READ OFF THE LIVE APP (iimjobs for iOS, 29 Sep 2026): the page chrome —
 * back, save, share — then the logo tile, the company, the title in a
 * display size, "3-10 yrs · Mumbai · Posted 6 days ago", a "Job
 * description" card that shows the opening and offers "Read full
 * description", a "Who you'll hear from" card with the recruiter, and
 * Apply. The app's "See how you compare" banner and "Similar roles" are the
 * candidate product's own furniture, not part of the posting, so they are
 * left out.
 *
 * THE RAIL'S THIRD VIEW, beside the record and the list card. Drawn at the
 * rail's phone width so it reads at the size a candidate sees it. NOTHING
 * INVENTED: the company line is absent because the chat never asks for
 * one, the description is the one the chat drafted, the recruiter is the
 * one signed in, and the date line says "Not posted yet" because it is not.
 * Apply does nothing but say so.
 */
export function PostingPage({
  draft,
  className,
}: {
  draft: PostingDraft
  className?: string
}) {
  const [full, setFull] = React.useState(false)
  const cities = draft.locations.filter((city) => city !== REMOTE)
  const where =
    draft.mode === "remote" && !cities.length ? "Remote" : cities.join(" / ")
  const years = draft.experience
    ? draft.experience.max === null
      ? `${draft.experience.min}+ yrs`
      : `${draft.experience.min}-${draft.experience.max} yrs`
    : null
  const meta = [years, where, "Not posted yet"].filter(Boolean).join(" · ")
  const description = draft.title ? describePosting(draft) : ""

  return (
    <div
      aria-label="How the posting will look to a candidate"
      className={cn(
        "flex flex-col gap-5 rounded-[20px] bg-card px-4 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      {/* The page's chrome, so it reads as the page and not a card. */}
      <div
        aria-hidden
        className="flex items-center justify-between text-foreground"
      >
        <ChevronLeftIcon className="size-5" />
        <div className="flex items-center gap-5">
          <HeartIcon className="size-5" />
          <ShareIcon className="size-5" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span
          aria-hidden
          className="grid size-15 place-items-center rounded-[16px] border bg-background p-2"
        >
          <span className="grid size-11 place-items-center rounded-[10px] bg-muted text-muted-foreground/60">
            <BuildingIcon className="size-5" />
          </span>
        </span>
        <h3 className="text-xl leading-snug font-semibold text-balance">
          {draft.title ?? (
            <span className="text-muted-foreground">Untitled role</span>
          )}
        </h3>
        <p className="text-sm font-medium text-muted-foreground">{meta}</p>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl bg-muted/50 p-4">
        <h4 className="text-base font-semibold">Job description</h4>
        {description ? (
          <>
            <p
              className={cn(
                "text-sm leading-relaxed whitespace-pre-line text-muted-foreground",
                !full && "line-clamp-6"
              )}
            >
              {description}
            </p>
            <button
              type="button"
              onClick={() => setFull((open) => !open)}
              className="inline-flex items-center gap-1.5 self-start border-b border-foreground pb-0.5 text-sm font-medium"
            >
              <PlusIcon className="size-4" />
              {full ? "Show less" : "Read full description"}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Written once the role has a title.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h4 className="text-base font-semibold">Who you'll hear from</h4>
        <div className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
          <Avatar className="size-11">
            <AvatarImage src={photoFor(RECRUITER.name)} alt="" />
            <AvatarFallback>
              {RECRUITER.name
                .split(" ")
                .map((part) => part[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{RECRUITER.name}</p>
            <p className="text-xs text-muted-foreground">Recruiter</p>
          </div>
          <ChevronRightIcon
            aria-hidden
            className="size-4 text-muted-foreground"
          />
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <Button
          className="w-full rounded-full"
          size="lg"
          aria-disabled
          title="A preview — nothing is posted yet"
        >
          Apply
        </Button>
        {draft.screening.length ? (
          <p className="text-center text-xs text-muted-foreground">
            {draft.screening.length} screening question
            {draft.screening.length === 1 ? "" : "s"} to answer when applying
          </p>
        ) : null}
      </div>
    </div>
  )
}
