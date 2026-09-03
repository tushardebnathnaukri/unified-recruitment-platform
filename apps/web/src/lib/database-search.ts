/**
 * Option data for the resume database search, taken from the live
 * iimjobs/hirist search form.
 *
 * The live form's own vocabulary is kept — Last Seen, Notice Period, the
 * "search in complete profile" scope — so the two are comparable side by side.
 * What changes is the shape of a few controls, and that lives in the page.
 */

/**
 * What the keywords are matched against. The live form hangs this off a
 * "Search in complete profile" disclosure next to the keyword field, which
 * reads as a link rather than a setting — so it becomes a named select here.
 * Values are the labels: nothing downstream stores them.
 */
export const SEARCH_SCOPES = [
  "Complete profile",
  "Resume title and key skills",
  "Current designation",
  "Current company",
]

/**
 * Metros first, then the catch-alls. Same names the candidate roster uses, so a
 * search and a pipeline never spell the same city two ways.
 */
export const LOCATIONS = [
  "Bengaluru",
  "Chennai",
  "Delhi NCR",
  "Gurugram",
  "Hyderabad",
  "Kolkata",
  "Mumbai",
  "Noida",
  "Pune",
  "Anywhere in India",
  "Overseas",
]

/** How recently the candidate was active. "All" is the default, as it is live. */
export const LAST_SEEN = [
  "All",
  "Last 1 day",
  "Last 7 days",
  "Last 15 days",
  "Last 1 month",
  "Last 3 months",
  "Last 6 months",
]

/** Bands cut at the same boundaries as the pipeline rail's notice facet. */
export const NOTICE_PERIODS = [
  "Immediately available",
  "Up to 1 month",
  "1 – 2 months",
  "2 – 3 months",
  "3 months or more",
]
