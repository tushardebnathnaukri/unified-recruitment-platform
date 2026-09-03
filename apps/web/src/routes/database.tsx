import * as React from "react"
import { useNavigate } from "react-router"
import { EyeOffIcon, SearchIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Card } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Label } from "@workspace/ui/components/label"
import { Separator } from "@workspace/ui/components/separator"
import { Switch } from "@workspace/ui/components/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { Field, OptionSelect } from "@/components/form-field"
import { TagInput } from "@/components/tag-input"
import {
  LAST_SEEN,
  LOCATIONS,
  NOTICE_PERIODS,
  SEARCH_SCOPES,
} from "@/lib/database-search"
import { EXPERIENCE_YEARS } from "@/lib/post-job"

/**
 * Resume database search.
 *
 * Fields and their wording come from the live iimjobs/hirist search form, so
 * the two stay comparable. Three controls are shaped differently, each because
 * the live one loses information a recruiter needs at the moment they fill it:
 *
 * 1. KEYWORDS ARE CHIPS, not one comma-soup text box. The field's own
 *    neighbouring checkbox says "mark all keywords as mandatory" — which is a
 *    per-keyword idea the moment you have more than two, and unreadable when
 *    the keywords are an undelimited run of text. Chips make each keyword a
 *    thing you can see, drop, and (later) mark on its own.
 * 2. BOOLEAN MODE SWAPS THE CONTROL. A boolean expression is not a list of
 *    chips — it has operators and parentheses — so the toggle switches to a
 *    textarea rather than leaving a chip field that quietly cannot express
 *    `(kafka OR kinesis) NOT intern`. The mandatory checkbox goes with it: in
 *    boolean mode the query already says what is required.
 * 3. SEARCH SCOPE IS A NAMED SELECT. Live, "Search in complete profile" is a
 *    chevron that reads as a link, so the setting it holds is invisible until
 *    you happen to open it.
 *
 * The results surface is not designed yet — Search hands off to a placeholder.
 */
export function DatabasePage() {
  const navigate = useNavigate()

  const [booleanMode, setBooleanMode] = React.useState(false)
  const [keywords, setKeywords] = React.useState<string[]>([])
  const [expression, setExpression] = React.useState("")
  const [allMandatory, setAllMandatory] = React.useState(false)
  const [scope, setScope] = React.useState(SEARCH_SCOPES[0])
  const [exclude, setExclude] = React.useState<string[]>([])
  const [expMin, setExpMin] = React.useState("")
  const [expMax, setExpMax] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [lastSeen, setLastSeen] = React.useState(LAST_SEEN[0])
  const [notice, setNotice] = React.useState("")
  const [hideViewed, setHideViewed] = React.useState(false)

  // Keywords are the one required field, so Search is off until there is
  // something to search for — the live form accepts the click and then returns
  // an error, which costs a round trip to say what the asterisk already said.
  const searchable = booleanMode
    ? expression.trim() !== ""
    : keywords.length > 0

  function reset() {
    setBooleanMode(false)
    setKeywords([])
    setExpression("")
    setAllMandatory(false)
    setScope(SEARCH_SCOPES[0])
    setExclude([])
    setExpMin("")
    setExpMax("")
    setLocation("")
    setLastSeen(LAST_SEEN[0])
    setNotice("")
    setHideViewed(false)
  }

  return (
    <form
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 lg:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (searchable) navigate("/database/results")
      }}
    >
      <Card className="gap-6 p-4 pb-0">
        <Field
          label="Search keywords"
          htmlFor="keywords"
          required
          hint={
            booleanMode
              ? "Combine terms with AND, OR and NOT. Group with parentheses."
              : "Press Enter after each keyword."
          }
          action={
            <Label htmlFor="boolean" className="gap-2 font-normal">
              <Switch
                id="boolean"
                checked={booleanMode}
                onCheckedChange={setBooleanMode}
              />
              Boolean search
            </Label>
          }
        >
          {booleanMode ? (
            <Textarea
              id="keywords"
              rows={3}
              value={expression}
              onChange={(event) => setExpression(event.target.value)}
              placeholder={
                '(Kafka OR Kinesis) AND "platform engineer" NOT intern'
              }
            />
          ) : (
            <TagInput
              id="keywords"
              value={keywords}
              onChange={setKeywords}
              placeholder="Skills or designations — eg. Kafka, Platform Engineer"
            />
          )}
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Only meaningful for chips: a boolean expression states what is
              required in the query itself, so the checkbox would either lie or
              silently override what was typed. */}
          {!booleanMode && (
            <Label className="gap-2 font-normal">
              <Checkbox
                checked={allMandatory}
                onCheckedChange={(checked) => setAllMandatory(checked === true)}
              />
              Every keyword must appear
            </Label>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Label htmlFor="scope" className="text-sm font-normal">
              Search in
            </Label>
            <OptionSelect
              id="scope"
              value={scope}
              onValueChange={setScope}
              placeholder="Complete profile"
              options={SEARCH_SCOPES}
              className="w-56"
            />
          </div>
        </div>

        <Field
          label="Exclude keywords"
          htmlFor="exclude"
          optional
          hint="Profiles containing any of these are left out."
        >
          <TagInput
            id="exclude"
            value={exclude}
            onChange={setExclude}
            placeholder="Add a keyword to exclude"
          />
        </Field>

        <Separator />

        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Refine your search</h2>
          <p className="text-xs text-muted-foreground">
            Every filter is optional. Leave one alone and it does not narrow
            anything.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Experience" optional>
            <div className="grid grid-cols-2 gap-3">
              <OptionSelect
                value={expMin}
                onValueChange={setExpMin}
                placeholder="Min"
                options={EXPERIENCE_YEARS}
              />
              <OptionSelect
                value={expMax}
                onValueChange={setExpMax}
                placeholder="Max"
                options={EXPERIENCE_YEARS.slice(1)}
              />
            </div>
          </Field>

          <Field label="Location" htmlFor="location" optional>
            <OptionSelect
              id="location"
              value={location}
              onValueChange={setLocation}
              placeholder="Select"
              options={LOCATIONS}
            />
          </Field>

          <Field label="Last seen" htmlFor="last-seen" optional>
            <OptionSelect
              id="last-seen"
              value={lastSeen}
              onValueChange={setLastSeen}
              placeholder="All"
              options={LAST_SEEN}
            />
          </Field>

          <Field label="Notice period" htmlFor="notice" optional>
            <OptionSelect
              id="notice"
              value={notice}
              onValueChange={setNotice}
              placeholder="Select notice period"
              options={NOTICE_PERIODS}
            />
          </Field>
        </div>

        {/* The action bar belongs to the card rather than floating under it:
            it is the form's footer, and the tinted strip is what makes the
            primary action findable after a long scroll. */}
        <div className="-mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-muted/40 px-4 py-3">
          <Button type="submit" disabled={!searchable}>
            <SearchIcon data-icon="inline-start" />
            Search
          </Button>

          <Button type="button" variant="ghost" onClick={reset}>
            Reset
          </Button>

          <Label className="ml-auto gap-2 font-normal">
            <Checkbox
              checked={hideViewed}
              onCheckedChange={(checked) => setHideViewed(checked === true)}
            />
            <EyeOffIcon className="size-4 text-muted-foreground" />
            Hide profiles I have already viewed
          </Label>
        </div>
      </Card>
    </form>
  )
}
