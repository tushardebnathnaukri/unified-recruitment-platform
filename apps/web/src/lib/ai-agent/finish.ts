/**
 * The last three screens of the prototype: step 5's sample candidates, the
 * review of what candidates will see, "Choose how your agents source", and
 * the done page. Arithmetic and copy are the prototype's (its `renderVals`
 * from "sample profiles" to the end), without the styles.
 */
import type { AgentController } from "@/lib/ai-agent/controller"
import { INIT, PROF, fmt, savePast } from "@/lib/ai-agent/data"
import { criteriaOf, rowsOf } from "@/lib/ai-agent/targeting"
import type { Core } from "@/lib/ai-agent/view"

/** One check on a sample candidate: "✓ 8–12 yrs", "~ Within budget". */
export type ProfileTag = { t: string; src: string; hit: boolean }

/** Step 5: four sample candidates checked against what the recruiter set. */
export function candidatesOf(agent: AgentController, core: Core) {
  const { s, R, f, RV, paid, pool } = core
  const P = PROF[s.roleKey!]
  const mults = [1.05, 0.92, 1.12, 0.98],
    expAdd = [2, 0, 3, 1]
  const base = f.salMax ? ((f.salMin || f.salMax) + f.salMax) / 2 : R.median
  const pSub = f.coSubs || []
  const crit = criteriaOf(agent, core)
  const MU = crit.must.filter((c) => !c.isEmpty && !c.isExcl),
    GO = crit.good.filter((c) => !c.isEmpty)

  const profiles = [0, 1, 2, 3]
    .map((i) => {
      const exp = Math.min(f.expMax, f.expMin + expAdd[i])
      const loc = f.locations.length
        ? f.locations[i % f.locations.length]
        : R.cities[0].n
      const ctc = Math.round(base * mults[i])
      const C: ProfileTag[] = []
      const add = (t: string, src: string, hit: boolean) =>
        C.push({
          t: (hit ? "✓ " : "~ ") + t,
          src: (hit ? "Matches " : "Partly matches ") + src,
          hit,
        })
      add(f.expMin + "–" + f.expMax + " yrs", "your experience range", true)
      if (f.locations.length) add(loc, "your location", true)
      if (f.salMax) add("Within budget", "your salary range", ctc <= f.salMax)
      f.skills
        .slice(0, 2)
        .forEach((k, j) => add(k, "your skills", (i + j) % 4 !== 3))
      const MT: ProfileTag[] = [],
        GT: ProfileTag[] = []
      const tg = (arr: ProfileTag[], t: string, src: string, hit: boolean) =>
        arr.push({
          t: (hit ? "✓ " : "~ ") + t,
          src: (hit ? "Meets " : "Partly meets ") + src,
          hit,
        })
      MU.forEach((c, j) =>
        tg(MT, c.short, "your must-have", i === 0 || (i + j) % 4 !== 3)
      )
      GO.forEach((c, j) =>
        tg(GT, c.short, "your good-to-have", i === 0 ? true : (i + j) % 3 !== 2)
      )
      const ALL = C.concat(MT, GT)
      const hits = ALL.filter((t) => t.hit).length
      const score = Math.round((hits / ALL.length) * 100) - i
      const mHit = MT.filter((t) => t.hit).length,
        gHit = GT.filter((t) => t.hit).length
      const label =
        score >= 90
          ? "Strong match"
          : score >= 75
            ? "Good match"
            : "Partial match"
      const partial = ALL.filter((t) => !t.hit).map((t) => t.t.slice(2))
      const co =
        pSub.length && i !== 2
          ? pSub[i % pSub.length].split(" › ").pop() + " company"
          : P.cos[i]
      return {
        initials: INIT[i],
        title: P.titles[i],
        meta: exp + " yrs · " + loc + " · " + co + " · expects ~₹" + ctc + "L",
        tags: C,
        mustTags: MT,
        goodTags: GT,
        meets:
          "Meets " +
          mHit +
          " of " +
          MT.length +
          " must-haves" +
          (GT.length
            ? " · " + gHit + " of " + GT.length + " good-to-haves"
            : ""),
        score,
        label,
        tone: (label === "Strong match"
          ? "strong"
          : label === "Good match"
            ? "good"
            : "partial") as "strong" | "good" | "partial",
        why:
          "Checked against what you set: meets " +
          hits +
          " of " +
          ALL.length +
          (partial.length ? "; partly on " + partial.join(", ") : "") +
          ". Active in the last 7 days.",
      }
    })
    .sort((a, b) => b.score - a.score)

  const rows = rowsOf(agent, core)
  return {
    ready: !!RV.profiles,
    intro:
      (paid ? fmt(pool) + " active profiles match. " : "") +
      "A few samples, checked against your requirements. Hover a tag to see why.",
    basics: [
      f.title,
      (f.locations || []).join(", "),
      f.expMin + "–" + f.expMax + " yrs",
      "₹" + (f.salMin || "–") + "–" + (f.salMax || "–") + "L",
    ].join(" · "),
    must: rows.must,
    good: rows.good,
    profiles,
    editTargeting: () => agent.setState({ tab: "addl" }),
  }
}

/** "What candidates will see", and the bar under it. */
export function previewOf(agent: AgentController, core: Core) {
  const { s, f, paid, jdText, jdEdited } = core
  const screenOn = s.screenEnabled ? s.screening.filter((x) => x.on) : []
  return {
    decide: s.stage === "preview" && s.pvStep === "decide",
    title: f.title,
    company: paid && f.confidential ? "Confidential company" : f.company,
    loc: f.locations.join(" · ") || "Location not set",
    exp: f.expMin + "–" + f.expMax + " yrs",
    sal:
      f.hideSalary || !f.salMax
        ? "Salary not disclosed"
        : "₹" + (f.salMin || "") + "–" + f.salMax + "L",
    skills: f.skills,
    jd: jdEdited ? s.jdOverride || "" : jdText,
    jdFile: s.jdFile ? s.jdFile.name : null,
    screening: screenOn.map((q) => q.t),
    backToCandidates: () =>
      agent.setState({ stage: "review", tab: "profiles" }),
    goDecide: () => agent.setState({ pvStep: "decide" }),
    goReview: () => agent.setState({ pvStep: "review" }),
  }
}

const AGENTS: [string, string][] = [
  ["Posting Agent", "Publishes your job on iimjobs"],
  ["Promotion Agent", "Puts your job in front of 3× more candidates"],
  ["Sourcing Agent", "Finds matching profiles in the iimjobs database"],
  ["Screening Agent", "Ranks everyone against your must-haves"],
  ["Outreach Agent", "Emails and notifies matching candidates to apply"],
]

export type AgentKind =
  "Posting" | "Promotion" | "Sourcing" | "Screening" | "Outreach"

/** "Choose how your agents source": three offers, one open at a time. */
export function offersOf(agent: AgentController, core: Core) {
  const { s, f, paid, pool } = core
  const suggestMax = pool < 8000
  const team = (on: number[]) =>
    AGENTS.map((a, i) => ({
      n: a[0],
      d: on[i] ? a[1] : "Not included",
      on: !!on[i],
    }))
  const pub = (boost: boolean, mode: "post" | "max") => () => {
    savePast(f)
    agent.setState({ boost, stage: "done", doneMode: mode, planMode: "post" })
  }
  const showReco = () => {
    if (!paid) {
      agent.toast("Recommended candidates without posting is a Pro feature")
      return
    }
    savePast(f)
    agent.setState({ planMode: "reco", stage: "done", doneMode: "reco" })
  }
  const sel = s.ofSel || "max"
  const raw = [
    {
      k: "max" as const,
      title: "Pro + Boost",
      tag: "Your full agent team",
      line: "Everything in Pro, with 3× reach.",
      agents: team([1, 1, 1, 1, 1]),
      reach: fmt(pool * 3),
      reachNote: "candidates reached · 3× reach",
      cta: "Publish with Pro + Boost →",
      go: paid
        ? pub(true, "max")
        : () => agent.toast("Pro + Boost needs a Pro plan"),
      hl: suggestMax,
      ai: true,
    },
    {
      k: "pro" as const,
      title: "Pro",
      tag: "Post, source and reach out",
      line: "Post the job. Your agents find, rank and invite the best.",
      agents: team([1, 0, 1, 1, 1]),
      reach: fmt(pool),
      reachNote: "active candidates match",
      cta: "Publish with Pro",
      go: pub(false, "post"),
      hl: !suggestMax,
      ai: false,
    },
    {
      k: "reco" as const,
      title: "AI-recommended profiles",
      tag: "No job posting · stays private",
      line: "No posting. Your agents find and rank profiles; you reach out.",
      agents: team([0, 0, 1, 1, 0]),
      reach: fmt(pool),
      reachNote: "active profiles match your must-haves",
      cta: "Find profiles →",
      go: showReco,
      hl: false,
      ai: true,
    },
  ]
  const offers = raw.map((o) => {
    const on = o.agents.filter((a) => a.on)
    return {
      ...o,
      nodes: on.map((a, i) => ({
        l: a.n.replace(" Agent", "") as AgentKind,
        arrow: i < on.length - 1,
      })),
      teamHead: on.length + " AGENTS WORK FOR YOU",
      teamSub:
        o.k === "reco"
          ? "They find and rank. You reach out."
          : o.k === "max"
            ? "Publish → amplify → search → rank → invite"
            : "Publish → search → rank → invite",
      more: !!s.ofMore,
      moreLabel: s.ofMore ? "Hide" : "Know more",
      toggleMore: () => agent.setState({ ofMore: !s.ofMore }),
      agents: on,
      focused: sel === o.k,
      select: () => {
        if (sel !== o.k) agent.setState({ ofSel: o.k })
      },
      nodeCount: on.length + " agents",
      badge: o.k === "max" ? "✦ Recommended" : null,
    }
  })
  return {
    offers,
    linkedin: paid ? s.linkedin : true,
    linkedinLocked: !paid,
    linkedinLabel: paid
      ? "Share on my LinkedIn (optional)"
      : "Share on my LinkedIn (required for free postings)",
    toggleLinkedin: () => agent.setState({ linkedin: !s.linkedin }),
    postBasic: () => {
      savePast(f)
      agent.setState({
        boost: false,
        stage: "done",
        doneMode: "post",
        planMode: "post",
      })
      agent.toast("Posted with basic reach")
    },
  }
}

/** The done page: what happened, and the two ways on. */
export function doneOf(agent: AgentController, core: Core) {
  const { s, f, paid, pool } = core
  const title =
    s.doneMode === "reco"
      ? "Your AI Agent’s recommended profiles are ready"
      : s.doneMode === "max"
        ? f.title + " is live · your agent team is on it"
        : f.title + " is live"
  // The prototype sets a longer line for Pro + Boost and then overwrites it
  // with this one, so this is what it shows.
  const text =
    s.doneMode === "reco"
      ? "The role stays private. Your AI Agent picked these profiles from the iimjobs database based on your requirements and preferences. You decide who to contact."
      : paid
        ? "It’s now in front of " +
          fmt(s.boost ? pool * 3 : pool) +
          " active candidates. Recommended profiles from the database are ready to review."
        : "Your Basic posting is live. Upgrade to Pro to see your talent pool and get recommended candidates."
  return {
    title,
    text,
    again: () => agent.backToStart(),
    explore: () =>
      agent.toast(
        "In production this opens the current form, with everything AI filled carried over."
      ),
  }
}
