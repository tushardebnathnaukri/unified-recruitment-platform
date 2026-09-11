import * as React from "react"
import type { ReactNode } from "react"
import {
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MailIcon,
  PhoneIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Meta, MetaItem } from "@workspace/ui/components/meta"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { CandidateCv } from "@/components/candidate-cv"
import {
  ApplicantAvatar,
  ApplicantStatusBadge,
  DecisionGroup,
} from "@/components/applicant-controls"
import { CandidateDetail } from "@/components/candidate-detail"
import { isNew, type Applicant, type ApplicantStatus } from "@/lib/applicants"

/**
 * A candidate read in a panel, without leaving the list.
 *
 * THE POINT IS NOT LOSING YOUR PLACE. Opening the full page from a card meant
 * a navigation, a scroll position lost, and a trip back through the tab and
 * filters to reach the row after the one you just read — a lot to pay for
 * "what else does this person have". A panel keeps the list underneath and
 * costs an Escape to close.
 *
 * IT DOES NOT REPLACE THE PAGE. `/jobs/:jobId/applicants/:id` still exists and
 * is still what the message dock links to, because a candidate has to be
 * reachable from a pasted URL — a panel is a way of reading somebody, not a
 * place they live. There is no longer a link to it from in here, though: the
 * panel carries `?profile=<id>`, so the address bar already holds a link that
 * reopens exactly this, and a second route to the same person was a button
 * spending footer room on a case the URL had already covered.
 *
 * The actions are the page's, not the card's. Reading is how you decide, so a
 * panel that made you close it to act would be refusing to finish its own
 * sentence — the same argument the profile page's own comment makes.
 */
export function CandidatePanel({
  applicant,
  requiredSkills,
  onDecide,
  onClose,
  onPrev,
  onNext,
  position,
}: {
  /** `null` closes the panel; the caller owns which candidate is open. */
  applicant: Applicant | null
  requiredSkills: string[]
  onDecide: (id: string, status: ApplicantStatus) => void
  onClose: () => void
  /** Absent at the ends of the list, which is what disables the control. */
  onPrev?: () => void
  onNext?: () => void
  /** 1-based, for the "4 of 27" between the arrows. */
  position: { index: number; total: number } | null
}) {
  /**
   * WHICH candidate's tab was chosen, not just which tab — the same shape
   * `CandidateDetail` uses for its contact disclosure, and for the same reason.
   * Opening somebody new should land on the CV again rather than inheriting
   * where you happened to be on the last person, and comparing the id makes
   * that fall out of a render instead of needing an effect to reset it.
   */
  const [tabState, setTabState] = React.useState<{
    id: string
    tab: string
  } | null>(null)
  // CV first: the panel is opened to read what the card could not hold, and
  // that is the document. The profile is a click away rather than the landing.
  const tab = tabState && tabState.id === applicant?.id ? tabState.tab : "cv"

  return (
    <Sheet
      open={applicant !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      {/* Half the viewport, and every override carries the `data-[side=right]`
          prefix on purpose: the stock width and max-width are themselves set
          through that attribute selector, so a bare `w-1/2` loses to them on
          specificity and silently does nothing. Full width below `sm` — half a
          phone is not a reading column. */}
      <SheetContent
        side="right"
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:w-1/2 data-[side=right]:sm:max-w-none"
      >
        {applicant && (
          <Tabs
            value={tab}
            onValueChange={(value) =>
              setTabState({ id: applicant.id, tab: String(value) })
            }
            className="flex min-h-0 flex-1 flex-col gap-0"
          >
            <SheetHeader className="p-5 pb-4">
              <div className="flex min-w-0 items-start gap-3">
                {/* Initials, not a photograph — the same call the card and the
                    page both make, for the same reason. The sheet is
                    `popover`, so the dot's cut-out is too. */}
                <ApplicantAvatar
                  name={applicant.name}
                  fresh={isNew(applicant)}
                  className="size-11"
                  badgeClassName="ring-popover"
                />

                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SheetTitle className="font-heading text-lg font-medium">
                      {applicant.name}
                    </SheetTitle>
                    {isNew(applicant) ? (
                      <span className="sr-only">New</span>
                    ) : (
                      <ApplicantStatusBadge status={applicant.status} />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {applicant.title} at {applicant.company}
                  </p>
                  <Meta>
                    <MetaItem>{applicant.location}</MetaItem>
                    <MetaItem>Applied {applicant.appliedAgo}</MetaItem>
                  </Meta>

                  {/* WITH THE PERSON, NOT WITH THE PAGER. Reaching somebody is
                      a fact about them, the way their location and their
                      application date are, so the three controls sit in the
                      same column as their name rather than at the far end of a
                      footer that now only moves between people. */}
                  <div className="flex items-center gap-2 pt-2">
                    <CircleAction label="Call">
                      <PhoneIcon />
                    </CircleAction>

                    <CircleAction label="Set up interview">
                      <CalendarPlusIcon />
                    </CircleAction>

                    {/* Filled, because it is the one of the three a recruiter
                        actually came here to do — and the only one that moves
                        the candidate to Contacted. */}
                    <CircleAction
                      label="Message"
                      primary
                      onClick={() => onDecide(applicant.id, "contacted")}
                    >
                      <MailIcon />
                    </CircleAction>
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* The tab row sits with the header and the body scrolls under it:
                the decision buttons and the document switch are both reasons to
                read, and neither should scroll away from the thing being read. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 pb-3">
              <TabsList>
                <TabsTrigger value="cv">CV</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
              </TabsList>

              {/* The decision shares the tab row rather than the footer below.
                  It is the one control that acts on the person rather than on
                  the document, so it sits at the far end of the row that picks
                  the document — the same split-the-row shape the response
                  manager uses for its buckets and its view switcher. */}
              <DecisionGroup applicant={applicant} onDecide={onDecide} />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <TabsContent value="cv">
                <CandidateCv applicant={applicant} />
              </TabsContent>

              <TabsContent value="profile">
                <CandidateDetail
                  applicant={applicant}
                  required={requiredSkills}
                  layout="pane"
                />
              </TabsContent>
            </div>

            {/* PINNED BY LAYOUT, NOT BY `position: sticky`. The panel is a
                full-height flex column whose body is the only thing that
                scrolls, so a last child simply stays at the bottom — no
                stacking context, no overlap with the final row of content,
                and nothing to unstick if the body's overflow ever changes.

                They moved out of the header because they are what you do
                AFTER reading. A CV runs past a screen, and an action row above
                the fold is one you have scrolled away from at the moment you
                have finally made up your mind. */}
            {/* Only the pager now. Back and Next take the two ends and the
                count sits between them — the shape says "you are somewhere in
                a sequence", which is the one thing this bar is still for. */}
            <SheetFooter className="mt-0 flex-row items-center justify-between gap-3 border-t border-border bg-popover p-4">
              <Button
                variant="outline"
                size="sm"
                disabled={!onPrev}
                onClick={onPrev}
              >
                <ChevronLeftIcon data-icon="inline-start" />
                Back
              </Button>

              {position && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {position.index} of {position.total}
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                disabled={!onNext}
                onClick={onNext}
              >
                Next
                <ChevronRightIcon data-icon="inline-end" />
              </Button>
            </SheetFooter>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  )
}

/**
 * A round icon button that says what it is on hover and to a screen reader.
 *
 * Round rather than the squircle the cards use, because these three are the
 * only controls in the panel that reach a human being — the shape is what
 * separates them from the document buttons at a glance.
 */
function CircleAction({
  label,
  primary,
  onClick,
  children,
}: {
  label: string
  primary?: boolean
  onClick?: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={primary ? "default" : "outline"}
            size="icon-sm"
            aria-label={label}
            className="rounded-full"
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
