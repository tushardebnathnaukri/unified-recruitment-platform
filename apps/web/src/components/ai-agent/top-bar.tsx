import { Link } from "react-router"
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"

import { useAgent } from "@/components/ai-agent/shared"

const JOURNEY = [
  "Describe the role",
  "Discover candidates",
  "Review",
  "Choose how to source",
]

/**
 * The variant's white top bar — the Dashboard draws none of its own from `md`
 * up — carrying the prototype's own header, rebuilt: the agent's badge, the
 * four-step journey, the prototype menu (paid or free posting, auto-advance)
 * and "Classic form".
 *
 * The journey needs about 1,150px beside the controls, so it shows from
 * `@6xl/main`; narrower, the step bar inside the page says where you are.
 *
 * The prototype's VERSION list is not here: it linked to sibling files
 * (V2, V2.2, V3…) that are not part of this port. The wordmark is not either,
 * because the sidebar already carries it.
 */
export function AgentTopBar() {
  const { agent, state, brandName } = useAgent()
  const paid = agent.paid
  const autoAdv = state.autoAdv !== false
  const stepIdx =
    state.stage === "preview"
      ? state.pvStep === "decide"
        ? 3
        : 2
      : { start: 0, review: 1, done: 4 }[state.stage]

  const setPlan = (plan: "paid" | "free") => {
    agent.setState({ planOverride: plan, planMenu: false })
    agent.toast(
      plan === "paid"
        ? "Showing the paid-posting experience"
        : "Showing the free-posting experience"
    )
  }
  const toggleAutoAdv = () => {
    agent.setState({ autoAdv: !autoAdv, transit: autoAdv ? 0 : state.transit })
    agent.toast(
      autoAdv ? "Auto-advance transition off" : "Auto-advance transition on"
    )
  }

  return (
    <div className="flex h-(--header-height) shrink-0 items-center gap-3 border-b bg-background px-3 lg:px-4">
      <Button
        nativeButton={false}
        variant="ghost"
        size="icon-sm"
        aria-label="Back to the Dashboard"
        title="Back to the Dashboard"
        render={<Link to="/dashboard" />}
      >
        <ArrowLeftIcon />
      </Button>

      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted py-1 pr-2.5 pl-1 text-xs font-semibold text-primary">
        <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
          <SparklesIcon className="size-3" />
        </span>
        <span className="hidden sm:inline">{brandName} AI Agent</span>
        <span className="rounded bg-primary px-1.5 py-px text-[10px] font-extrabold tracking-wide text-primary-foreground">
          NEW
        </span>
      </span>

      <nav
        aria-label="Journey"
        className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden text-[13px] @6xl/main:flex"
      >
        {JOURNEY.map((label, i) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              aria-current={i === stepIdx ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap",
                i === stepIdx
                  ? "border-b-2 border-primary pb-0.5 font-bold text-foreground"
                  : i < stepIdx
                    ? "font-medium text-primary"
                    : "font-medium text-muted-foreground"
              )}
            >
              {i < stepIdx ? <CheckIcon className="size-3" /> : null}
              {label}
            </span>
            {i < JOURNEY.length - 1 ? (
              <span aria-hidden="true" className="text-muted-foreground/60">
                ›
              </span>
            ) : null}
          </span>
        ))}
      </nav>
      <span className="flex-1 @6xl/main:hidden" />

      <div className="flex shrink-0 items-center gap-2">
        {/* The prototype's own controls, drawn as a prototype control: a
            dashed outline, so nobody reads it as product. */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Prototype: switch posting type"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 px-2 text-xs transition-colors hover:bg-muted aria-expanded:bg-muted"
          >
            <span className="rounded bg-primary px-1.5 py-px text-[10px] font-bold tracking-wide text-primary-foreground">
              V2.3.1 · AI AGENT
            </span>
            <span className="font-bold">{paid ? "Paid" : "Free"}</span>
            <ChevronDownIcon className="size-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Posting type</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={paid ? "paid" : "free"}
                onValueChange={(value) => setPlan(value as "paid" | "free")}
              >
                <DropdownMenuRadioItem value="paid">
                  Paid posting
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="free">
                  Free posting
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={autoAdv}
              onCheckedChange={toggleAutoAdv}
              closeOnClick={false}
            >
              <span className="flex flex-col">
                <span className="font-semibold">Auto-advance transition</span>
                <span className="text-xs text-muted-foreground">
                  Move on when key details are complete
                </span>
              </span>
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <span
          tabIndex={0}
          title={
            paid
              ? "Pro / Pro + Boost credits available"
              : "You’re on free posting. Free Basic posting offers limited features only"
          }
          className={cn(
            "hidden items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-xs font-bold lg:inline-flex",
            paid
              ? "bg-primary/10 text-primary"
              : "cursor-help border border-destructive/30 bg-destructive/5 text-destructive"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "grid size-4 place-items-center rounded-full",
              paid
                ? "bg-primary text-primary-foreground"
                : "bg-destructive text-background"
            )}
          >
            {paid ? (
              <CheckIcon className="size-2.5" strokeWidth={4} />
            ) : (
              <XIcon className="size-2.5" strokeWidth={4} />
            )}
          </span>
          {paid ? "Paid posting" : "Paid posting exhausted"}
        </span>

        {/* "In production this opens the current form, with everything AI
            filled carried over" — this app has that form, so it opens it. */}
        <Button
          nativeButton={false}
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          render={<Link to="/jobs/new" />}
        >
          Classic form
        </Button>
      </div>
    </div>
  )
}
