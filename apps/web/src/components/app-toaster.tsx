import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@workspace/ui/components/avatar"
import { cn } from "@workspace/ui/lib/utils"
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  toast,
  useToastManager,
} from "@workspace/ui/components/toast"
import { useAthena } from "@/components/athena-provider"

/**
 * Every transient confirmation on the app — the response manager's undo, and
 * whatever else needs to say "done, and here is the way back" without taking
 * a decision away from the screen.
 *
 * COMPOSED HERE RATHER THAN USING THE SHIPPED `Toaster`, because where a toast
 * sits is this app's problem and not the design system's. It keeps the stock
 * corner — bottom right — and changes two things about it.
 *
 * IT MOVES ASIDE FOR ATHENA, by the width of her pane rather than a number of
 * its own, the way the message dock used to before it became a page. Below
 * `md` she covers the page instead of taking a column, so there is nothing to
 * move aside for.
 *
 * IT SITS IN THE CORNER, at the stock `bottom-4`. It spent a while at
 * `bottom-24` to keep clear of the selection bar, which owns the lane at the
 * very bottom and can be up at the same time — tick some people, then decide
 * on one card. That bought a rare collision at the cost of 96px of air under
 * every toast, which is the wrong trade: the bar is centred and this is on the
 * right, so the two only meet under about 1300px of window. If that turns out
 * to bite, lift it when something is ticked rather than lifting it always.
 *
 * The manager is module-level, so `toast.add()` works from any component
 * without a hook threaded through — see `candidate-list.tsx`.
 */
/** What a toast can carry besides its words — see `undoDecision`. */
type ToastData = { faces?: { name: string; photo?: string }[] }

/** Two letters, so a name that is one word or four still yields two. */
function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}

/**
 * WHO THE TOAST IS ABOUT, where the stock component puts its type icon. A
 * decision takes the card off the screen, so the face is the only thing left
 * that says which of a hundred near-identical rows this was — and it is
 * quicker to check than a name read back in a sentence.
 *
 * `AvatarGroup` overlaps them and cuts each out of the one behind with a ring,
 * so a batch reads as a batch without a second line of text.
 */
function Faces({ people }: { people: { name: string; photo?: string }[] }) {
  if (people.length === 0) return null

  return (
    <AvatarGroup className="shrink-0">
      {people.map((person) => (
        <Avatar key={person.name} size="sm">
          {person.photo && <AvatarImage src={person.photo} alt="" />}
          <AvatarFallback>{initials(person.name)}</AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  )
}

function ToastList() {
  const { toasts } = useToastManager()

  return toasts.map((item) => (
    <Toast key={item.id} toast={item}>
      <ToastContent>
        <Faces people={(item.data as ToastData | undefined)?.faces ?? []} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <ToastTitle />
          <ToastDescription />
        </div>
        <ToastAction />
        <ToastClose />
      </ToastContent>
    </Toast>
  ))
}

export function AppToaster() {
  const { open: athenaOpen } = useAthena()

  return (
    <ToastProvider toastManager={toast} timeout={6000}>
      {/* NOT PORTALLED. The shell's dimensions — `--athena-width` among them —
          are inline CSS variables on `SidebarProvider`, so a viewport in a
          portal on `document.body` cannot see them: the shift below resolved
          against nothing and put the toast in the far left of the window.
          Rendered in place it inherits them, and `fixed` still positions
          against the viewport because nothing above it is transformed. */}
      <ToastViewport
        // A little wider than the stock `max-w-sm`: the face takes width the
        // sentence was using, and "Rohit Verma moved to Shortlisted" wrapping
        // onto a second line makes a one-line message look like a paragraph.
        className={cn(
          "sm:max-w-md",
          athenaOpen && "md:right-[calc(var(--athena-width)+--spacing(6))]"
        )}
      >
        <ToastList />
      </ToastViewport>
    </ToastProvider>
  )
}
