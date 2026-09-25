import { useNavigate, useSearchParams } from "react-router"

import { AuroraBand } from "@/components/aurora-band"
import { SmartHireBar } from "@/components/smart-hire-bar"
import { smartHireHref } from "@/lib/smart-hire"

/**
 * Smart Hire — one description, and a search or a job post out of it.
 *
 * THE ARROW GOES TO THE BRIEF. One sentence is a start and not a requirement,
 * so what follows the bar is the requirement chat — it asks for whatever the
 * sentence left out, and hands the finished brief to the candidates. Where the
 * POSTING half of "a search and a job post in one go" comes in is still open;
 * the brief is where it would be written from.
 *
 * `?q=` is how the Dashboard's compact bar hands its draft over, and `?intent=`
 * carries which way its switcher was set, so a choice made down there is not
 * silently made again up here. The box takes both as OPENING values rather than
 * controlled ones — from the first keystroke the content belongs to the editor.
 */
export function SmartHirePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  return (
    // Same hero shape as the Dashboard: `-mt-4 md:-mt-6` cancels the shell's
    // top padding so the band runs edge to edge under the header.
    <div className="-mt-4 flex flex-col md:-mt-6">
      <AuroraBand className="pt-10 pb-28">
        <div className="mx-auto w-full max-w-4xl px-4 lg:px-6">
          {/* The page title is in SiteHeader, so this says what the thing
              does rather than repeating its name. */}
          <div className="flex flex-col gap-1 text-primary-foreground">
            <p className="text-xl font-semibold">
              Say who you're hiring for, once.
            </p>
            <p className="text-sm">
              Smart Hire reads it as a search and as a posting — so finding
              people and putting the job up stop being two jobs.
            </p>
          </div>
        </div>
      </AuroraBand>

      {/* `relative` keeps the band, which is positioned, from painting over
          the bar that is meant to overlap it. */}
      <div className="relative mx-auto -mt-16 flex w-full max-w-4xl flex-col gap-3 px-4 lg:px-6">
        <SmartHireBar
          size="hero"
          defaultValue={params.get("q") ?? undefined}
          defaultIntent={
            params.get("intent") === "search" ? "search" : undefined
          }
          onSubmit={(draft) =>
            navigate(smartHireHref(draft.intent!, draft.text))
          }
        />

        <p className="px-1 text-xs text-muted-foreground">
          Type a title, a city or an industry and press{" "}
          <kbd className="rounded border bg-background px-1 font-sans">Tab</kbd>{" "}
          to take the suggestion. The switcher decides what the arrow does with
          it.
        </p>
      </div>
    </div>
  )
}
