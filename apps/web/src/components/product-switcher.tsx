import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"

import { useBrand } from "@workspace/ui/components/brand-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@workspace/ui/components/sidebar"
import { BRANDS, type Brand } from "@workspace/ui/lib/brands"
import { BrandWordmark } from "@/components/brand-wordmark"

/**
 * Move between iimjobs and hirist.
 *
 * THIS IS A PRODUCT CONTROL, NOT THE PROTOTYPE'S BRAND TOGGLE. The switcher on
 * /settings was a design-review affordance — flip the token layer, see the
 * components in the other accent — and it was on a page a recruiter would
 * never open. This is the other thing: a recruiter who hires for both sides of
 * the business moving between the two products, which is a real job and needs
 * to be one click from anywhere.
 *
 * IT IS ALSO THE UNIFICATION QUESTION, MADE CONCRETE. iimjobs and hirist are
 * two products today, and whether they become one is what this prototype is
 * meant to inform. A switcher in the shell is the smallest possible statement
 * of "one platform, two products" — and it is reversible in the way CLAUDE.md
 * asks for: delete this component and they are two apps again, with no token,
 * route or component having taken a position either way.
 *
 * It takes the sidebar header's `lg` menu button, which is the slot shadcn's
 * dashboard block puts a team switcher in.
 */
export function ProductSwitcher() {
  const { brand, setBrand } = useBrand()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                aria-label={`Product: ${brand}. Switch product`}
                className="gap-2 px-1.5"
              />
            }
          >
            {/* The wordmark IS the identity, so it is what you press. There is
                no collapsed shape here: AppSidebar hides this whole control in
                the rail rather than shrinking it to an initial, which was a
                button that made you open a menu to find out where you are. */}
            {/* `h-7!` because `SidebarMenuButton` forces `[&_svg]:size-4` onto
                any svg inside it — right for a nav icon, fatal for a wordmark,
                which arrives 16px square and illegible. The descendant
                selector outranks a plain class on the svg, so this has to be
                important rather than merely later. */}
            <BrandWordmark className="h-7! w-auto!" />
            <ChevronsUpDownIcon className="ml-auto text-muted-foreground" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="min-w-56">
            {/* The label has to sit INSIDE a group — Base UI reads its
                labelling relationship from `MenuGroupContext` and throws
                without one, which a plain `<DropdownMenuLabel>` above the
                items does not give it. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel>Products</DropdownMenuLabel>

              {BRANDS.map((option) => (
                <DropdownMenuItem
                  key={option.id}
                  onClick={() => setBrand(option.id as Brand)}
                  className="gap-2"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">{option.label}</span>
                    {/* NOTE(design): one line each, and they are a guess at how
                      the two would be told apart in the product's own words.
                      Worth replacing with whatever marketing actually says. */}
                    <span className="text-xs text-muted-foreground">
                      {DESCRIPTIONS[option.id]}
                    </span>
                  </div>
                  {option.id === brand && (
                    <CheckIcon className="size-4 shrink-0 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

const DESCRIPTIONS: Record<Brand, string> = {
  iimjobs: "Management and senior roles",
  hirist: "Technology roles",
}
