import { Link } from "react-router"

import { Badge } from "@workspace/ui/components/badge"
import { Item } from "@workspace/ui/components/item"
import { Meta } from "@workspace/ui/components/meta"
import { cn } from "@workspace/ui/lib/utils"

import { modeFor, searchHref, type RecentSearch } from "@/lib/database"

/**
 * One past search — on the dashboard and on the database page, which is why it
 * is here rather than in either route.
 *
 * The query is the row's identity, so it gets the weight; the filters sit under
 * it as chips because two searches with the same keywords and different
 * locations are different searches and nothing else would tell them apart.
 *
 * THE ICON IS THE MODE. A magnifier for keywords, sparkles for natural
 * language, a page for a JD — so a row says how its text was read without a
 * fourth line saying so. Keywords keeps the magnifier this row always had,
 * which is what leaves the dashboard's three rows looking as they did.
 *
 * Stacked, not media/content/actions: the query, its filters and its numbers
 * are three lines of one thing, so the Item is turned into a column.
 */
export function SearchRow({ search }: { search: RecentSearch }) {
  const mode = modeFor(search.mode)

  return (
    <Item
      render={<Link to={searchHref(search)} />}
      className="flex-col items-stretch gap-2"
    >
      <div className="flex items-start gap-2">
        <mode.icon
          aria-hidden
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
        />
        <span className="sr-only">{mode.label}:</span>
        {/* Boolean is set in mono: the quotes and brackets are the query, and
            in a proportional face they read as punctuation around it. */}
        <span
          className={cn(
            "min-w-0 flex-1 text-sm font-medium",
            search.boolean && "font-mono text-xs leading-5"
          )}
        >
          {search.query}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {search.filters.map((filter) => (
          <Badge key={filter} variant="outline" className="font-normal">
            {filter}
          </Badge>
        ))}
      </div>

      <Meta>
        <span>{search.matches} matches</span>
        <span>{search.ranAgo}</span>
        {/* The only reason to re-run a search, so it is the only thing here
            that gets a colour. */}
        {search.newSince > 0 && (
          <Badge variant="success" className="font-normal">
            {search.newSince} new
          </Badge>
        )}
      </Meta>
    </Item>
  )
}
