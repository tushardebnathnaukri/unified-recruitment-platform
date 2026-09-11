import * as React from "react"

import { LAST_VISIT, type ResponseBucket } from "@/lib/applicants"

/**
 * Where the people on a candidate list came from: they applied to a posting,
 * or a database search found them.
 *
 * IT CHANGES WORDS, NOT SHAPES. The response manager and the database results
 * are the same screen — tabs by decision, the same cards, table and split
 * view, the same filter pills and profile panel — because deciding on people
 * is the same job whichever door they came in by. What differs is a handful of
 * phrases: somebody on a posting "applied", somebody in the database last
 * "updated" their profile; a posting "asks for" skills, a search looked for
 * them. Those live here, in one table, rather than as a `source` prop threaded
 * through every card, row and panel that prints one.
 *
 * A context rather than a prop because the words are needed five components
 * deep — the profile inside the split view, the panel over the list — and a
 * prop through each of them would be plumbing for a sentence. The default is
 * `posting`, so every screen that predates the database needs no provider.
 */
export type ListSource = "posting" | "search"

type ListCopy = {
  /** The verb in front of `appliedAgo`, on the card, the table and the panel. */
  arrived: string
  /** Title of the when-they-arrived column in the table. */
  arrivedColumn: string
  /** Heading over the people who arrived since last time. */
  newSince: string
  /** The skills bucket on a card when none of the asked-for skills are there. */
  noSkillsMatched: string
  /** "3 of the 4 {askedFor}" on the profile's skills section. */
  askedFor: string
  /** The profile's Matched row when it is empty. */
  noRequirementsMet: string
  /** The last item in a candidate's overflow menu. */
  remove: string
  /** What the in-list search box and the filter drawer call the list. */
  searchLabel: string
  filterTitle: string
  empty: Record<ResponseBucket, { title: string; body: string }>
}

const COPY: Record<ListSource, ListCopy> = {
  posting: {
    arrived: "Applied",
    arrivedColumn: "Applied",
    newSince: `New since ${LAST_VISIT}`,
    noSkillsMatched: "None of the four the posting asks for",
    askedFor: "this posting asks for",
    noRequirementsMet: "None of the posting's requirements",
    remove: "Remove from this job",
    searchLabel: "Search responses",
    filterTitle: "Filter responses",
    empty: {
      undecided: {
        title: "You are all caught up",
        body: "Everybody who has applied has a decision. New applicants will land here the next time you come in.",
      },
      maybe: {
        title: "Nothing in Maybe",
        body: "The middle button on a card puts somebody here — the pile you want to come back to rather than decide on now.",
      },
      shortlisted: {
        title: "Nothing in Shortlisted",
        body: "Nobody is shortlisted. Shortlisting somebody from any tab moves them here.",
      },
      contacted: {
        title: "Nothing in Contacted",
        body: "You have not reached out to anybody yet. Contacted candidates are the ones waiting on a reply from you.",
      },
      rejected: {
        title: "Nothing in Not a fit",
        body: "You have not turned anybody down on this posting.",
      },
      all: {
        title: "Nothing in All",
        body: "Nobody has applied to this posting yet.",
      },
    },
  },
  search: {
    // A database profile was not applied with — it was last touched by its
    // owner, which is the recency a sourcing recruiter actually weighs.
    arrived: "Updated",
    arrivedColumn: "Updated",
    newSince: "New since you last ran this",
    noSkillsMatched: "None of the skills you searched for",
    askedFor: "your search looks for",
    noRequirementsMet: "None of the skills you searched for",
    remove: "Hide from this search",
    searchLabel: "Search within results",
    filterTitle: "Filter results",
    empty: {
      undecided: {
        title: "You are through all of them",
        body: "Everybody this search found has a decision. Run it again later to see who has joined since.",
      },
      maybe: {
        title: "Nothing in Maybe",
        body: "The middle button on a card puts somebody here — the pile you want to come back to rather than decide on now.",
      },
      shortlisted: {
        title: "Nothing in Shortlisted",
        body: "Nobody from this search is shortlisted yet.",
      },
      contacted: {
        title: "Nothing in Contacted",
        body: "You have not reached out to anybody from this search yet.",
      },
      rejected: {
        title: "Nothing in Not a fit",
        body: "You have not ruled anybody out of this search.",
      },
      all: {
        title: "Nobody matches",
        body: "Nobody on the database matches this search. Loosen a filter, or rewrite it.",
      },
    },
  },
}

export const ListSourceContext = React.createContext<ListSource>("posting")

export function useListCopy(): ListCopy {
  return COPY[React.useContext(ListSourceContext)]
}
