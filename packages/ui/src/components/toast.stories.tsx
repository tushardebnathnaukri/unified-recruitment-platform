import * as React from "react"
import type { Meta as StoryMeta, StoryObj } from "@storybook/react-vite"

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { design } from "@workspace/ui/lib/figma"
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  Toaster,
  createToastManager,
  useToastManager,
} from "@workspace/ui/components/toast"

/**
 * NO `component` BINDING. `Toast` takes the toast object itself as a required
 * prop, so binding it here would demand `args` on every story — and each of
 * these is a `render`, which makes an args table useless anyway. Same call as
 * the Chart story.
 */
const meta = {
  title: "Components/Toast",
  parameters: {
    design: design("toast"),
    // The global default is `centered`, which shrinks the canvas to its
    // contents — and a bench sized `w-full` against that is a bench 2px wide.
    layout: "padded",
    docs: {
      description: {
        component: `
A transient confirmation in the bottom-right corner: what just happened, and
the way back out of it.

**The app composes this rather than using the shipped \`Toaster\`**, because
where a toast sits is the app's problem and not the design system's —
\`apps/web/src/components/app-toaster.tsx\`. It keeps the stock corner and
changes one thing: it moves aside by \`--athena-width\` when the copilot is
open.

**Its viewport is deliberately not portalled.** The shell's dimensions are
inline CSS variables on \`SidebarProvider\`, so a viewport mounted on
\`document.body\` cannot see \`--athena-width\` — the shift resolved against
nothing and threw the toast into the far left of the window. Rendered in
place it inherits them, and \`fixed\` still positions against the viewport
because nothing above it is transformed. Anything else that wants a shell
dimension from inside a portal has the same problem.

**A toast here carries a face where the stock component puts a type icon.**
The response manager's undo is the only one so far, and a decision takes the
card off the screen — so by the time the toast arrives, the only trace of the
person is their name in a sentence, and a hundred rows all move to
Shortlisted alike. Past three faces the count in the sentence does the work.
The viewport is \`sm:max-w-md\` rather than the stock \`max-w-sm\`, because the
face takes the width the sentence was using and a one-line message wrapping
to two reads as a paragraph.

The manager is module-level (\`createToastManager\`), so \`toast.add()\` works
from any component without a hook threaded through. \`toast.close(id)\` inside
an action handler reads as using \`id\` before it exists, but cannot fire until
\`add\` has returned.
        `,
      },
    },
  },
} satisfies StoryMeta

export default meta

type Story = StoryObj<typeof meta>

const UNDO_FACES = ["Rohit Verma"]
const BATCH_FACES = ["Rohit Verma", "Ananya Iyer", "Karthik Nair"]

/** Two letters, so a name that is one word or four still yields two. */
function initials(name: string) {
  const parts = name.split(" ").filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase()
}

/**
 * Who the toast is about, where the stock component puts its type icon.
 * `AvatarGroup` overlaps them and cuts each out of the one behind with a ring,
 * so a batch reads as a batch without a second line of text.
 */
function Faces({ people }: { people: string[] }) {
  if (people.length === 0) return null

  return (
    <AvatarGroup className="shrink-0">
      {people.map((name) => (
        <Avatar key={name} size="sm">
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  )
}

/** The app's list: faces in the icon's place, then the sentence, Undo, close. */
function FacesToastList() {
  const { toasts } = useToastManager()

  return toasts.map((item) => (
    <Toast key={item.id} toast={item}>
      <ToastContent>
        <Faces people={(item.data as { faces?: string[] })?.faces ?? []} />
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

/**
 * A bench, so a Docs page can show the toast without it floating over the
 * documentation. The viewport is `absolute` instead of `fixed`, which is the
 * only change — everything inside still lays itself out against the corner.
 *
 * The manager is made per mount rather than at module level: Storybook remounts
 * a story on navigation and on every hot reload, and a shared manager would
 * pile up a fresh copy each time (these are seeded with `timeout: 0`, so
 * nothing clears them).
 */
function FacesBench({ title, faces }: { title: string; faces: string[] }) {
  const manager = React.useMemo(() => createToastManager(), [])

  React.useEffect(() => {
    manager.add({
      title,
      timeout: 0,
      data: { faces },
      actionProps: { children: "Undo" },
    })
  }, [manager, title, faces])

  return (
    <ToastProvider toastManager={manager} timeout={6000}>
      <div className="relative h-44 w-full max-w-2xl overflow-hidden rounded-2xl border bg-canvas">
        <ToastViewport className="absolute sm:max-w-md">
          <FacesToastList />
        </ToastViewport>
      </div>
    </ToastProvider>
  )
}

/**
 * **The response manager's undo.** One person, one decision, and the way back.
 * Six seconds — long enough to notice a mis-click, short enough not to become
 * furniture.
 */
export const Undo: Story = {
  name: "Undo a decision (as the app uses it)",
  render: () => (
    <FacesBench title="Rohit Verma moved to Shortlisted" faces={UNDO_FACES} />
  ),
}

/**
 * **A batch.** Up to three faces, and past that the count in the sentence does
 * the work — twelve overlapping circles is a texture, not twelve people.
 */
export const Batch: Story = {
  name: "A batch decision",
  render: () => (
    <FacesBench title="12 people moved to Shortlisted" faces={BATCH_FACES} />
  ),
}

const liveManager = createToastManager()

/**
 * The real thing, in the real corner. Fire a few: they stack, the frontmost
 * one showing and the rest peeking behind it until you hover, and each is
 * swipeable in any direction.
 */
export const InTheCorner: Story = {
  name: "In the corner (live)",
  render: () => (
    <ToastProvider toastManager={liveManager} timeout={6000}>
      <div className="flex flex-wrap gap-2 p-6">
        <Button
          variant="outline"
          onClick={() =>
            liveManager.add({
              title: "Rohit Verma moved to Shortlisted",
              data: { faces: ["Rohit Verma"] },
              actionProps: { children: "Undo" },
            })
          }
        >
          Shortlist one
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            liveManager.add({
              title: "12 people moved to Shortlisted",
              data: { faces: ["Rohit Verma", "Ananya Iyer", "Karthik Nair"] },
              actionProps: { children: "Undo" },
            })
          }
        >
          Shortlist twelve
        </Button>
      </div>

      <ToastViewport className="sm:max-w-md">
        <FacesToastList />
      </ToastViewport>
    </ToastProvider>
  ),
}

/**
 * The stock shape, for comparison: `Toaster` portals its own viewport and
 * `ToastIcon` draws a glyph per `type`. Nothing in the app uses these yet —
 * every toast here is about a person, and a person has a face.
 */
export const Types: Story = {
  name: "The stock types",
  render: function Render() {
    const local = React.useMemo(() => createToastManager(), [])

    return (
      <Toaster toastManager={local}>
        <div className="flex flex-wrap gap-2 p-6">
          {(["success", "info", "warning", "error", "loading"] as const).map(
            (type) => (
              <Button
                key={type}
                variant="outline"
                className="capitalize"
                onClick={() =>
                  local.add({
                    type,
                    title: `${type[0]?.toUpperCase()}${type.slice(1)}`,
                    description: "The stock description line.",
                  })
                }
              >
                {type}
              </Button>
            )
          )}
        </div>
      </Toaster>
    )
  },
}
