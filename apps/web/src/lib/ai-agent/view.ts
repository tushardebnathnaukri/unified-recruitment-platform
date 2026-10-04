/**
 * The derived view of the AI Agent V2.3 port — the prototype's `renderVals`,
 * split by screen.
 *
 * The prototype computed every value and handler its template binds to in
 * one 3,900-line method, half of it inline style strings. Here the values and
 * handlers are carried over (same names where they matter, same copy, same
 * arithmetic) and the styles are not: each screen in `components/ai-agent/`
 * turns these into token classes. `coreOf` is what every screen shares — what
 * has been revealed, the displayed form, the pool — and the rest are the
 * pieces each screen draws.
 */
import type { AgentController, AgentState } from "@/lib/ai-agent/controller"
import {
  CITY_ALIAS,
  FN,
  NEXT_LABELS,
  ORDER_STEPS,
  PHASE_BANNER,
  POOLMIX,
  POOL_MULT,
  REVEAL_B,
  ROLES,
  SRC_LABEL,
  STEP_LABELS,
  TAB_LABELS,
  fmt,
  instSet,
  pctTxt,
  poolFor,
} from "@/lib/ai-agent/data"
import type { AgentForm, SourceKey, StepKey } from "@/lib/ai-agent/types"

const BASICK = [
  "title",
  "locations",
  "exp",
  "company",
  "skills",
  "confidential",
  "salary",
  "hideSalary",
  "pool",
]
const ADDLK = ["addl", "course", "batch", "diversity", "video"]

/** What every review screen derives from — call only once a role exists. */
export function coreOf(agent: AgentController, s: AgentState) {
  const R = ROLES[s.roleKey!]
  const f = s.form!
  const RV = s.revealed || {}
  const paid = agent.paid

  /** Whether a field has been "filled in" yet by the staged reveal. */
  const shown = (k: string) => {
    if (BASICK.indexOf(k) > -1) {
      if (s.filling && s.phase === "basic") return s.thinkStep >= REVEAL_B[k]
      return !!RV.basic
    }
    if (ADDLK.indexOf(k) > -1) return !!RV.addl
    if (k === "jd") {
      if (s.filling && s.phase === "jd") return s.thinkStep >= 2
      return !!(RV.jd || RV.addl)
    }
    return true
  }

  // The form as displayed: blank until the agent "fills" each field.
  const df: AgentForm = { ...f }
  if (!shown("title")) df.title = ""
  if (!shown("company")) df.company = ""
  if (!shown("locations")) df.locations = []
  if (!shown("skills")) df.skills = []
  if (!shown("salary")) {
    df.salMin = null
    df.salMax = null
  }
  if (!shown("confidential")) df.confidential = false

  const pool = poolFor(R, f, s.extraF)
  const potential = poolFor(
    R,
    {
      locations: [],
      expMin: Math.max(0, R.exp[0] - 2),
      expMax: R.exp[1] + 3,
      salMax: null,
      batchMin: "",
      batchMax: "",
      course: [],
      diversity: [],
      video: false,
      skills: R.skills,
    },
    1.3
  )
  const topCity = R.cities.slice().sort((a, b) => b.s - a.s)[0].n

  const jdText = agent.jdFrom(s)
  const jdEdited = s.jdOverride != null

  return {
    s,
    R,
    f,
    RV,
    paid,
    shown,
    df,
    pool,
    potential,
    topCity,
    jdText,
    jdEdited,
  }
}

export type Core = ReturnType<typeof coreOf>

/** A field's chip, lock and error — the prototype's `F[k]`. */
export type FieldMeta = {
  tag: SourceKey | "filling"
  locked: boolean
  shown: boolean
  err: boolean
  errMsg: string
}

/**
 * The required details, which step each lives on, and which are missing —
 * what blocks Next, what the panel's "Needs you" lists, and what the footer
 * names. Also tells the controller what is missing on the current step,
 * which is how its `goNext` knows to stop (the prototype's `_curMissing`).
 */
export function requirementsOf(agent: AgentController, core: Core) {
  const { s, f, RV, shown, jdText, jdEdited } = core
  const aval = (id: string) => s.addl.find((a) => a.id === id)?.value ?? ""
  const jdLen = (jdEdited ? s.jdOverride || "" : jdText).trim().length
  const REQ: {
    k: string
    label: string
    tab: StepKey
    ok: boolean
    msg: string
  }[] = [
    {
      k: "title",
      label: "Job title",
      tab: "basic",
      ok: f.title.trim().length >= 3,
      msg: "Add a job title",
    },
    {
      k: "company",
      label: "Company",
      tab: "basic",
      ok: !!f.company.trim(),
      msg: "Add the company you’re hiring for (you can still keep it confidential)",
    },
    {
      k: "locations",
      label: "Location",
      tab: "basic",
      ok: f.locations.length > 0,
      msg: "Add at least one location",
    },
    {
      k: "exp",
      label: "Experience",
      tab: "basic",
      ok: f.expMax > f.expMin,
      msg: "Set a valid experience range",
    },
    {
      k: "salary",
      label: "Salary",
      tab: "basic",
      ok: !!(f.salMin && f.salMax && f.salMax >= f.salMin),
      msg: "Add a min and max salary. It’s used for matching even if hidden",
    },
    {
      k: "skills",
      label: "3+ skills",
      tab: "jd",
      ok: f.skills.length >= 3,
      msg: "Add at least 3 skills (" + f.skills.length + " so far)",
    },
    {
      k: "domain",
      label: "Function",
      tab: "addl",
      ok: !!String(aval("domain") || "").trim(),
      msg: "",
    },
    { k: "jd", label: "Job description", tab: "jd", ok: jdLen >= 100, msg: "" },
  ]
  const avail = (r: (typeof REQ)[number]) =>
    !!RV[r.tab] &&
    !(s.filling && s.phase === r.tab) &&
    shown(r.k === "jd" ? "jd" : "title")
  const missing = REQ.filter((r) => avail(r) && !r.ok)
  const curMissing = s.filling ? [] : missing.filter((r) => r.tab === s.tab)
  agent.setCurMissing(curMissing.map((r) => ({ k: r.k, label: r.label })))

  const F: Record<string, FieldMeta> = {}
  Object.keys(FN).forEach((k) => {
    const isShown = shown(k)
    F[k] = {
      tag: isShown ? s.src[k] || "none" : "filling",
      locked: !!s.locks[k],
      shown: isShown,
      err: false,
      errMsg: "",
    }
  })
  REQ.forEach((r) => {
    if (F[r.k]) {
      F[r.k].err = !!(s.tried && !r.ok && avail(r))
      F[r.k].errMsg = r.msg
    }
  })
  const jr = REQ.find((x) => x.k === "jd")!
  const jdErr = !!(s.tried && !jr.ok && avail(jr))
  const addlErr = (id: string) => {
    const r = REQ.find((x) => x.k === id)
    return { required: !!r, err: !!(r && s.tried && !r.ok && avail(r)) }
  }

  const goMissing = (r: { tab: StepKey; k: string }) => {
    agent.setState({ tab: r.tab, tried: true })
    agent.focusField(r.k)
  }
  const okK = (k: string) => !!REQ.find((x) => x.k === k)?.ok

  return { REQ, missing, curMissing, F, jdErr, addlErr, goMissing, okK }
}

export type Requirements = ReturnType<typeof requirementsOf>

/** The step tabs across the top of the card, and the footer's Back / Next. */
export function stepsOf(agent: AgentController, core: Core, req: Requirements) {
  const { s, RV } = core
  const curIdx = Math.max(0, ORDER_STEPS.indexOf(s.tab))
  const maxIdx = s.maxStep || 0
  const errByTab: Partial<Record<StepKey, number>> = {}
  req.missing.forEach((r) => {
    errByTab[r.tab] = (errByTab[r.tab] || 0) + 1
  })
  const tabs = ORDER_STEPS.map((k, i) => {
    const current = i === curIdx
    const locked = i > maxIdx
    const done = !current && !locked && !!RV[k] && !errByTab[k]
    return {
      k,
      ai: k === "screen",
      label: TAB_LABELS[k] || STEP_LABELS[k],
      n: String(i + 1),
      done,
      locked,
      current,
      hasErr: !!(s.tried && errByTab[k] && !locked),
      errCount: errByTab[k] || 0,
      go: () => {
        if (!locked && !s.filling) agent.setState({ tab: k })
      },
    }
  })

  const cur = req.curMissing
  const reqTitle = s.filling
    ? PHASE_BANNER[s.phase!] || "Preparing suggestions…"
    : "Step " +
      (curIdx + 1) +
      " of " +
      ORDER_STEPS.length +
      " · " +
      STEP_LABELS[s.tab] +
      (cur.length ? " · " + cur.length + " to fill" : " · all set")
  const reqTone: "ai" | "default" | "done" = s.filling
    ? "ai"
    : cur.length
      ? "default"
      : "done"
  const reqBar = Math.round(
    ((curIdx + (cur.length || s.filling ? 0.5 : 1)) / ORDER_STEPS.length) * 100
  )

  const srcVals = (
    Object.keys(s.src).map((k) => s.src[k]) as (SourceKey | undefined)[]
  ).concat(s.addl.map((x) => x.src))
  const aiN = srcVals.filter((x) => x === "inferred" || x === "data").length
  const youN = srcVals.filter((x) => x === "you" || x === "answer").length
  const edN = srcVals.filter((x) => x === "edited").length
  const needN = srcVals.filter((x) => x === "needs").length
  const fillSummary = s.filling
    ? "Preparing suggestions…"
    : "Suggested " +
      aiN +
      " · from your brief " +
      youN +
      " · edited " +
      edN +
      (needN ? " · " + needN + " need input" : "")

  return {
    tabs,
    reqTitle,
    reqTone,
    reqBar,
    fillSummary,
    missing: cur.map((r) => ({ label: r.label, go: () => req.goMissing(r) })),
    nextLabel: NEXT_LABELS[s.tab] || "Continue →",
    backLabel: curIdx === 0 ? "Start over" : "← Back",
    goBack: () => {
      if (curIdx === 0) {
        agent.backToStart()
        return
      }
      agent.setState({ tab: ORDER_STEPS[curIdx - 1], tried: false })
    },
    goNext: () => agent.goNext(),
    counts: { aiN, youN, edN, needN },
  }
}

/** "Your talent pool": the count, its quality, and the mix inside it. */
export function poolOf(core: Core) {
  const { s, f, RV, pool, potential, paid } = core
  const MIX = POOLMIX[s.roleKey!]
  const is = instSet(f.insts)
  const fr = is.length
    ? is.filter((x) => /^II[MT] /.test(x)).length / is.length
    : 0
  const iimShare = is.length
    ? Math.min(0.97, MIX.iim + (1 - MIX.iim) * fr * 0.95)
    : MIX.iim
  const iimN = Math.round((pool * iimShare) / 10) * 10
  const femOnly =
    f.diversity.indexOf("Female Candidates") > -1 ||
    f.diversity.indexOf("Women Joining back the workforce") > -1
  const fem = femOnly ? 100 : Math.round(MIX.fem * 100)
  const COSH = {
    sales: [9, 7, 5],
    hr: [8, 6, 6],
    marketing: [11, 7, 5],
    product: [10, 8, 6],
  }[s.roleKey!]
  const ready = !!RV.addl
  const quality: { label: string; tone: "good" | "moderate" | "thin" } =
    pool >= 5000
      ? { label: "Healthy reach", tone: "good" }
      : pool >= 2000
        ? { label: "Moderate reach", tone: "moderate" }
        : { label: "Thin pool: consider widening", tone: "thin" }
  return {
    show: s.tab === "profiles",
    scanning: !ready,
    paidView: ready && paid,
    freeView: ready && !paid,
    poolFmt: fmt(pool),
    quality,
    iimPct: Math.round(iimShare * 100) + "%",
    iimFmt: fmt(iimN),
    topCosPct: COSH[0] + COSH[1] + COSH[2] + "%",
    topCosNames: MIX.cos.join(" · "),
    topCosTip:
      MIX.cos.map((n, i) => n + " " + COSH[i] + "%").join(" · ") + " of pool",
    topCos: MIX.cos.map((n, i) => ({
      n,
      tip: n + " · " + COSH[i] + "% of pool",
      initials: n
        .split(" ")
        .map((w) => w.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    })),
    femPct: fem,
    barPct: Math.max(4, Math.min(100, Math.round((pool / potential) * 100))),
    delta: s.lastChange
      ? {
          text: pctTxt(s.lastChange.pct) + " after: " + s.lastChange.label,
          negative: s.lastChange.pct < 0,
        }
      : null,
  }
}

/**
 * Role details — the fields, their insights ("powered via calculus") and the
 * Pro teasers. The prototype's sentence view and its suggestion block are
 * not here: V2.2 switched them off (`fvOn`, its "D1"), so they never draw.
 */
export function basicOf(agent: AgentController, core: Core) {
  const { s, R, f, df, pool, paid, RV } = core
  const showIns = paid && !!RV.basic
  const showTease = !paid && !!RV.basic

  // Title
  const bestAlt = R.alt.slice().sort((a, b) => b.m - a.m)[0]
  const title = {
    hasAction: bestAlt.t !== f.title && !s.locks.title,
    tip:
      bestAlt.t === f.title
        ? "Your title is the top performer for similar jobs"
        : "“" +
          bestAlt.t +
          "” gets " +
          bestAlt.m.toFixed(1) +
          "× the applies for similar jobs",
    useBest: () =>
      agent.ai("title", { title: bestAlt.t }, "Title → " + bestAlt.t),
  }

  // Locations: the cities a recruiter could add, and what each would gain.
  const maxS = Math.max(...R.cities.map((c) => c.s))
  const cityRows = R.cities.map((c) => {
    const added = f.locations.indexOf(c.n) > -1
    const full = !added && f.locations.length >= 3
    const gain =
      added || full
        ? 0
        : poolFor(R, { ...f, locations: f.locations.concat([c.n]) }, s.extraF) -
          pool
    return {
      n: c.n,
      supply: fmt(c.s * POOL_MULT),
      bar: Math.round((c.s / maxS) * 100),
      added,
      canAdd: !added && !full,
      gainN: gain,
      gain: fmt(gain),
      add: () => agent.addLocation(c.n, "ai"),
    }
  })
  const cityTips = cityRows
    .filter((c) => c.canAdd && c.gainN > 0)
    .sort((a, b) => b.gainN - a.gainN)
    .slice(0, 2)
    .map((c) => ({
      n: c.n,
      gain: c.gain + " candidates",
      tip:
        "Add " +
        c.n +
        " as a location to reach " +
        c.gain +
        " more active candidates",
      add: c.add,
    }))
  const locTip = cityTips.length
    ? "Add candidates from other locations:"
    : f.locations.length >= 3
      ? "Max 3 locations reached"
      : "You’ve covered the top cities for this role"

  // Experience: would widening by a year down and two up be worth it?
  const wa = Math.max(0, f.expMin - 1),
    wb = Math.min(30, f.expMax + 2)
  const wp = poolFor(R, { ...f, expMin: wa, expMax: wb }, s.extraF)
  const wg = pool ? Math.round(((wp - pool) / pool) * 100) : 0
  const exp = {
    hasAction: wg >= 5 && !s.locks.exp,
    insight:
      wg >= 5
        ? wa +
          "–" +
          wb +
          " yrs adds ~" +
          wg +
          "% reach" +
          (s.locks.exp ? " (unlock to apply)" : "")
        : "Covers most of the supply for this role",
    apply: () => agent.widenExp(),
  }

  // Salary: the prototype's four rules, in its order.
  let salFix: [number, number] | null = null
  let salInsight: string
  let salInsightFull: string
  let salActionLabel = ""
  const sMin = f.salMin || f.salMax,
    sMax = f.salMax
  const expMid = (f.expMin + f.expMax) / 2,
    ctcMid = sMax ? ((sMin || 0) + sMax) / 2 : 0
  const ratio = expMid > 0 && sMax ? ctcMid / expMid : 99
  const spread = sMax && sMin ? Math.round(((sMax - sMin) / sMin) * 100) : 0
  if (!sMax) {
    salInsight = "Median " + R.median + "L"
    salInsightFull =
      "Market median for " +
      f.expMin +
      "–" +
      f.expMax +
      " yrs is " +
      R.median +
      "L"
    salFix = [R.median - 8, R.median + 2]
    salActionLabel = "Use " + (R.median - 8) + "–" + (R.median + 2) + "L"
  } else if (ratio < 3) {
    const mid = Math.round(expMid * 3.5)
    const a = Math.round(mid * 0.87),
      b = Math.round(mid * 1.13)
    salInsight = "Too low for " + f.expMin + "–" + f.expMax + " yrs"
    salInsightFull =
      "Under 3L per year of experience, so we can’t target the right candidates"
    salFix = [a, b]
    salActionLabel = "Raise to " + a + "–" + b + "L"
  } else if (spread > 40) {
    const a = Math.round(ctcMid * 0.87),
      b = Math.round(ctcMid * 1.13)
    salInsight = "Range too wide (" + spread + "%)"
    salInsightFull =
      "A " +
      spread +
      "% gap between min and max dilutes targeting. Narrow it to reach the right audience"
    salFix = [a, b]
    salActionLabel = "Narrow to " + a + "–" + b + "L"
  } else if (spread < 5) {
    const a = Math.round(ctcMid * 0.9),
      b = Math.round(ctcMid * 1.1)
    salInsight = "Range too narrow (" + spread + "%)"
    salInsightFull =
      "A gap under 5% limits reach. Broaden it to reach more candidates"
    salFix = [a, b]
    salActionLabel = "Broaden to " + a + "–" + b + "L"
  } else if (sMax < R.median) {
    const mp = poolFor(R, { ...f, salMax: R.median + 2 }, s.extraF)
    const g = pool ? Math.round(((mp - pool) / pool) * 100) : 0
    salInsight = "Median " + R.median + "L"
    salInsightFull = "A " + (R.median + 2) + "L max adds ~" + g + "% reach"
    salFix = [Math.min(sMin || 0, R.median - 3), R.median + 2]
    salActionLabel = R.median + 2 + "L max · +" + g + "%"
  } else {
    salInsight = "At or above median (" + R.median + "L)"
    salInsightFull =
      "Your range is at or above the market median, so reach is good"
  }
  const salary = {
    hasAction: !!salFix && !s.locks.salary,
    insight: salInsight,
    insightFull: salInsightFull,
    actionLabel: salActionLabel,
    apply: () => {
      if (!salFix) return
      agent.ai(
        "salary",
        { salMin: salFix[0], salMax: salFix[1] },
        "Salary " + salFix[0] + "–" + salFix[1] + "L"
      )
    },
  }

  const okMap = {
    title: !!String(df.title || "").trim(),
    company: !!String(df.company || "").trim(),
    locations: df.locations.length > 0,
    exp: df.expMax > df.expMin,
    salary: !!(df.salMin && df.salMax),
    skills: df.skills.length >= 3,
  }
  const KEYS = Object.keys(okMap) as (keyof typeof okMap)[]
  const nOk = KEYS.filter((k) => core.shown(k) && okMap[k]).length
  const progress = s.filling
    ? "Preparing suggestions…"
    : nOk === 6
      ? "All 6 details confirmed"
      : nOk +
        " of 6 details ready · " +
        (6 - nOk) +
        " need" +
        (6 - nOk > 1 ? "" : "s") +
        " you"

  return {
    showIns,
    showTease,
    title,
    cityTips,
    cityRows,
    locTip,
    exp,
    salary,
    progress,
    progressDone: nOk === 6,
    upgrade: () => agent.toast("This would open Pro plans (/plans)."),
    onTitle: (value: string) => agent.edit("title", { title: value }),
    onCompany: (value: string) => agent.edit("company", { company: value }),
    removeLocation: (n: string) =>
      agent.edit(
        "locations",
        { locations: f.locations.filter((x) => x !== n) },
        "Removed " + n
      ),
    addTypedLocation: (raw: string) => {
      const typed = raw.trim()
      if (!typed) return
      const n = typed.charAt(0).toUpperCase() + typed.slice(1)
      // The alias table knows "bangalore" and "gurgaon"; anything else is
      // taken as typed, capitalised.
      const r = agent.addLocation(CITY_ALIAS[typed.toLowerCase()] || n, "you")
      if (r && r.msg) agent.toast(r.msg)
    },
    onExpMin: (value: string) => {
      if (!value) return
      const a = +value
      const b = Math.max(a + 1, f.expMax)
      agent.edit(
        "exp",
        { expMin: a, expMax: b },
        "Experience " + a + "–" + b + " yrs"
      )
    },
    onExpMax: (value: string) => {
      if (!value) return
      const b = +value
      const a = Math.min(f.expMin, b - 1)
      agent.edit(
        "exp",
        { expMin: a, expMax: b },
        "Experience " + a + "–" + b + " yrs"
      )
    },
    onSalMin: (value: string) => {
      const a = value ? +value : null
      let b = f.salMax
      if (a && b && b < a) b = a
      agent.edit(
        "salary",
        { salMin: a, salMax: b },
        "Salary " + (a || "–") + "–" + (b || "–") + "L"
      )
    },
    onSalMax: (value: string) => {
      const b = value ? +value : null
      let a = f.salMin
      if (a && b && a > b) a = b
      agent.edit(
        "salary",
        { salMin: a, salMax: b },
        "Max salary " + (b || "–") + "L"
      )
    },
    toggleHideSalary: () =>
      agent.edit("hideSalary", { hideSalary: !f.hideSalary }),
  }
}

/** The agent panel: what it is doing, what it needs, what it has done. */
export function panelOf(agent: AgentController, core: Core, req: Requirements) {
  const { s, RV, pool, jdEdited } = core
  const fillProgress =
    Math.min(s.thinkStep, s.thinkSteps.length) +
    " of " +
    s.thinkSteps.length +
    " steps"
  const todo = s.filling
    ? []
    : req.missing.map((r) => ({
        t: TODO_T[r.k] || r.label,
        go: () => req.goMissing(r),
      }))
  // The prototype sets a "quick questions" status and then, whenever it is
  // not filling, overwrites it with this — so the questions never show.
  const status = s.filling
    ? (STEP_LABELS[s.phase!] || "") + " · " + fillProgress
    : todo.length
      ? todo.length === 1
        ? "I need 1 thing from you"
        : "I need " + todo.length + " things from you"
      : "All set for this step"

  type Kind = "ai" | "you" | "edit" | "acct"
  const kindOf = (sv: SourceKey | undefined): Kind =>
    sv === "inferred" || sv === "data"
      ? "ai"
      : sv === "you" || sv === "answer"
        ? "you"
        : sv === "edited"
          ? "edit"
          : "acct"
  const srcTag = (k: string) => {
    const sv = s.src[k] || "none"
    return { src: SRC_LABEL[sv] || "Default", kind: kindOf(sv) }
  }
  const AITAG = { src: "Recommended", kind: "ai" as Kind }
  const done: { t: string; src: string; kind: Kind }[] = []
  if (RV.basic) {
    if (req.okK("title")) done.push({ t: "Title & role", ...srcTag("title") })
    if (req.okK("locations") && req.okK("exp"))
      done.push({ t: "Location & experience", ...srcTag("exp") })
    if (req.okK("salary")) done.push({ t: "Salary range", ...srcTag("salary") })
    if (req.okK("skills")) done.push({ t: "Skills", ...srcTag("skills") })
    if (req.okK("company")) done.push({ t: "Company", ...srcTag("company") })
  }
  if (RV.addl && req.okK("domain"))
    done.push({ t: "Role classification", ...AITAG })
  if (RV.addl && s.coSrc === "ai" && (s.form?.coSubs || []).length)
    done.push({ t: "Recommended companies", ...AITAG })
  if (RV.addl && s.coSrc === "past")
    done.push({ t: "Companies · from past jobs", ...AITAG })
  if (RV.addl && s.instSrc === "past")
    done.push({ t: "Institutes · from past jobs", ...AITAG })
  if (RV.addl) done.push({ t: "Industry & sub-industry", ...AITAG })
  if (RV.jd && req.okK("jd"))
    done.push(
      jdEdited
        ? { t: "JD", src: "Edited by you", kind: "edit" }
        : { t: "JD", src: "Drafted for review", kind: "ai" }
    )
  if (RV.screen && s.screenEnabled)
    done.push({
      t: s.screening.filter((x) => x.on).length + " screening questions",
      ...AITAG,
    })
  if (RV.profiles) done.push({ t: "Relevant profiles found", ...AITAG })

  const upcoming: string[] = []
  if (!RV.jd) upcoming.push("Draft a JD for your review")
  if (!RV.screen) upcoming.push("Recommend screening questions")
  if (!RV.addl) {
    upcoming.push("Suggest a role classification")
    upcoming.push("Recommend targeting from " + fmt(pool) + " active profiles")
  }
  if (!RV.profiles) upcoming.push("Surface relevant candidate profiles")

  const todoAll = !!s.todoAll
  const doneAll = !!s.doneAll
  const latestFirst = done.slice().reverse()
  return {
    status,
    statusAi: s.filling,
    filling: s.filling,
    think: (s.thinkSteps || []).map((x, i) => ({
      t: x.t,
      d: x.d,
      done: i < s.thinkStep,
      current: i === s.thinkStep,
    })),
    todo,
    todoShown: todoAll ? todo : todo.slice(0, 1),
    todoMore:
      todo.length > 1
        ? todoAll
          ? "Show less ▴"
          : "+" + (todo.length - 1) + " more to fix ▾"
        : null,
    toggleTodoAll: () => agent.setState({ todoAll: !todoAll }),
    doneHead: doneAll ? "Done · " + done.length : "Recent",
    doneShown: doneAll ? latestFirst : latestFirst.slice(0, 3),
    doneMore:
      done.length > 3
        ? doneAll
          ? "Show less ▴"
          : "+" + (done.length - 3) + " earlier ▾"
        : null,
    doneAll,
    toggleDoneAll: () => agent.setState({ doneAll: !doneAll }),
    upcoming: upcoming.slice(0, 1),
  }
}

const TODO_T: Record<string, string> = {
  title: "Job title required",
  company: "Company required",
  locations: "Location required",
  exp: "Experience range required",
  salary: "Salary range required",
  skills: "At least 3 skills required",
  category: "Category required",
  fa: "Functional area required",
  jd: "Job description required",
}

/** The activity log under the panel: what the agent did, grouped. */
export function logOf(agent: AgentController, s: AgentState) {
  const GL: Record<string, string> = {
    basic: "READING YOUR BRIEF",
    addl: "TARGETING & JD",
    profiles: "SAMPLE PROFILES",
    changes: "CHANGES & SUGGESTIONS",
    other: "OTHER UPDATES",
  }
  const order = ["basic", "addl", "profiles", "changes", "other"]
  const groups: Record<string, AgentState["log"]> = {}
  s.log.forEach((l) => {
    const g = l.g && GL[l.g] ? l.g : "other"
    ;(groups[g] = groups[g] || []).push(l)
  })
  const aiSteps = s.log.filter((l) => l.g && l.g !== "changes").length
  const last = s.log[s.log.length - 1]
  return {
    open: s.showLog,
    toggle: () => agent.setState({ showLog: !s.showLog }),
    title: s.log.length
      ? "Worked through " +
        aiSteps +
        " step" +
        (aiSteps === 1 ? "" : "s") +
        (s.log.length > aiSteps
          ? " · " +
            (s.log.length - aiSteps) +
            (s.log.length - aiSteps === 1 ? " change" : " changes")
          : "")
      : "No activity yet",
    latest: last ? "Latest: " + last.t : "",
    groups: order
      .filter((g) => groups[g])
      .map((g) => ({
        label: GL[g],
        items: groups[g].map((l, i, arr) => ({
          t: l.t,
          sub: l.sub || "",
          d: l.d || "",
          negative: (l.d || "").indexOf("−") === 0,
          change: l.g === "changes",
          last: i === arr.length - 1,
        })),
      })),
  }
}

/** The auto-advance countdown between steps. */
export function transitOf(agent: AgentController, s: AgentState) {
  const on = !!s.transit && s.stage === "review"
  if (!on || !s.form) return null
  const f = s.form
  const left = s.transitLeft || 0,
    secs = s.transitSecs || 5,
    done = secs - left
  const nQ = s.screenEnabled ? s.screening.filter((x) => x.on).length : 0
  return {
    kind: s.transitKind,
    bar: Math.round((done / secs) * 100),
    count: "Continuing in " + left + "s…",
    editLabel: s.transitKind === "tgt" ? "Keep editing" : "Stay here",
    line: [
      f.title,
      f.locations.join(", "),
      f.expMin + "–" + f.expMax + " yrs",
      "₹" + f.salMin + "–" + f.salMax + "L",
    ]
      .filter(Boolean)
      .join(" · "),
    items: [
      { k: "Role", v: f.title },
      { k: "Location", v: f.locations.join(", ") },
      { k: "Experience", v: f.expMin + "–" + f.expMax + " yrs" },
      { k: "Salary", v: "₹" + f.salMin + "–" + f.salMax + "L" },
      {
        k: "Skills",
        v:
          f.skills.slice(0, 3).join(", ") +
          (f.skills.length > 3 ? " +" + (f.skills.length - 3) : ""),
      },
      {
        k: "Screening",
        v: nQ
          ? nQ + " question" + (nQ > 1 ? "s" : "")
          : s.screenEnabled
            ? "None selected"
            : "Skipped",
      },
    ],
    go: () => agent.transitGo(),
    stay: () => agent.transitEdit(),
  }
}

/** The AI call, in the corner. */
export function callOf(agent: AgentController, s: AgentState) {
  const cs = s.call || null
  if (!cs) return null
  const mm = (n: number) =>
    String(Math.floor(n / 60)).padStart(2, "0") +
    ":" +
    String(n % 60).padStart(2, "0")
  return {
    state: cs,
    minimised: !!s.callMin,
    toggleMin: () => agent.setState({ callMin: !s.callMin }),
    status:
      cs === "connecting"
        ? "Connecting…"
        : cs === "live"
          ? mm(s.callSecs || 0)
          : "Pulling out what matters…",
    showText: cs === "live" && !s.callMin && !!s.callText,
    text: s.callText || "",
    canEnd: cs === "connecting" || cs === "live",
    end: () => agent.endCall(),
  }
}

/** Step 2: skills, and the drafted job description. */
export function jdOf(agent: AgentController, core: Core) {
  const { s, R, f, df, paid, shown, jdText, jdEdited } = core
  const jdShown = shown("jd")
  const more = R.moreSkills.filter((x) => f.skills.indexOf(x) < 0)
  return {
    backToTargeting:
      s.tab === "jd" && s.backTo === "addl"
        ? () => agent.setState({ tab: "addl", backTo: null })
        : null,
    skills: df.skills,
    removeSkill: (n: string) =>
      agent.edit(
        "skills",
        { skills: f.skills.filter((x) => x !== n) },
        "Removed skill " + n
      ),
    addTypedSkill: (raw: string) => {
      const t = raw.trim()
      agent.setState({ newSkill: "" })
      if (!t || f.skills.indexOf(t) > -1) return
      agent.edit("skills", { skills: f.skills.concat([t]) }, "Added skill " + t)
    },
    suggest:
      more.length > 0 && paid && !s.filling
        ? more.map((n) => ({
            n,
            add: () =>
              agent.ai(
                "skills",
                { skills: f.skills.concat([n]) },
                "Added skill " + n
              ),
          }))
        : [],
    jdShown,
    text: jdShown ? (jdEdited ? s.jdOverride || "" : jdText) : "",
    edited: jdEdited,
    tag: (!jdShown ? "filling" : jdEdited ? "edited" : "drafted") as
      "filling" | "edited" | "drafted",
    note: jdEdited
      ? "You edited this, so AI won’t overwrite it. Regenerate to pick up field changes."
      : "✓ Drafted in 2 mins · updates as you change must-haves, experience or skills.",
    onText: (value: string) => {
      if (!s.filling) agent.setState({ jdOverride: value })
    },
    regenerate: () => agent.setState({ jdOverride: null }),
    file: s.jdFile
      ? {
          name: s.jdFile.name,
          note: s.jdFile.read
            ? "text loaded above · candidates can also download the file"
            : "attached · candidates see and can download it",
        }
      : null,
    attachLabel: s.jdFile ? "Replace your JD" : "Add or paste your own JD",
    paste: () => {
      agent.setState({
        jdAddOpen: false,
        jdOverride: "",
        log: s.log.concat([
          { t: "Cleared the draft to paste your own JD", d: "" },
        ]),
      })
      agent.toast(
        "Paste your JD into the box. Regenerate brings back the AI draft."
      )
      agent.focusField("jd")
    },
    attach: (file: File) => {
      agent.setState({ jdAddOpen: false })
      if (/\.(txt|md)$/i.test(file.name)) {
        void file.text().then((t) =>
          agent.setState({
            jdFile: { name: file.name, read: true },
            jdOverride: t.slice(0, 8000),
          })
        )
      } else {
        agent.setState({ jdFile: { name: file.name, read: false } })
      }
      agent.toast(
        "Attached " + file.name + ". Candidates will see it with the job"
      )
    },
    removeFile: () => agent.setState({ jdFile: null }),
  }
}

/** Step 3: the screening questions candidates answer when they apply. */
export function screenOf(agent: AgentController, core: Core) {
  const { s } = core
  const on = !!s.screenEnabled
  const qSrc = (k: string) =>
    k.indexOf("custom-") === 0
      ? "Added by you"
      : k.indexOf("rec-") === 0
        ? "AI suggestion · common for this role"
        : "AI recommended · from your must-haves"
  const WHY = (k: string) =>
    k === "rec-notice"
      ? "✦ Checks joining time early"
      : k === "rec-loc"
        ? "✦ Based on your job location"
        : k === "rec-exp"
          ? "✦ Based on your experience range"
          : k === "rec-sal"
            ? "✦ Based on your salary range"
            : k.indexOf("ai-") === 0
              ? "✦ Common for roles like this"
              : "✦ From your must-have: " + k
  const indexed = s.screening.map((x, i) => ({ x, i }))
  const mine = indexed.filter((o) => o.x.on)
  const f0: Partial<AgentForm> = s.form || {}
  const POOL = [
    { t: "What is your current notice period?", key: "ai-np" },
    { t: "Why are you looking for a change right now?", key: "ai-why" },
    { t: "What is your current CTC?", key: "ai-ctc" },
    { t: "Have you led a team in your current role?", key: "ai-team" },
    {
      t: "Share one result you are most proud of in your last role.",
      key: "ai-win",
    },
    {
      t:
        "Are you comfortable with " +
        ((f0.skills || [])[0] || "the core skills") +
        " being a key part of this role?",
      key: "ai-skill",
    },
  ].filter((x) => !s.screening.some((y) => y.key === x.key))
  const suggestions = indexed
    .filter((o) => !o.x.on)
    .map((o) => ({
      t: o.x.t,
      why: WHY(String(o.x.key || "")),
      src: qSrc(String(o.x.key || "")),
      add: () =>
        agent.setState({
          screening: s.screening.map((y, j) =>
            j === o.i ? { ...y, on: true } : y
          ),
        }),
    }))
  const addQ = () => {
    const t = s.newQ.trim()
    if (!t) return
    agent.setState({
      newQ: "",
      qAddOpen: false,
      screening: s.screening.concat([
        { t, key: "custom-" + Date.now(), on: true },
      ]),
    })
  }
  const nOn = mine.length
  return {
    on,
    tag: on ? "✦ Drafted by your AI Agent" : "Skipped",
    sub: on
      ? "AI drafted these from your JD and must-haves. Candidates answer them when they apply, so you can shortlist faster."
      : "Screening is off for this job.",
    skip: () => {
      agent.setState({
        screenEnabled: false,
        log: s.log.concat([{ t: "Skipped screening questions", d: "" }]),
      })
      agent.goNext()
    },
    turnBackOn: () =>
      agent.setState({
        screenEnabled: true,
        log: s.log.concat([{ t: "Turned on screening questions", d: "" }]),
      }),
    mine: mine.map((o, n) => {
      const custom = String(o.x.key || "").indexOf("custom-") === 0
      return {
        n: n + 1,
        t: o.x.t,
        src: custom ? "Yours" : "✦ Suggested",
        remove: () =>
          agent.setState({
            screening: custom
              ? s.screening.filter((_, j) => j !== o.i)
              : s.screening.map((y, j) =>
                  j === o.i ? { ...y, on: false } : y
                ),
          }),
      }
    }),
    suggestions,
    sugBoxOn: suggestions.length > 0 || !!s.qThinking || POOL.length > 0,
    sugSub: suggestions.length
      ? "Based on your JD and must-haves · add the ones you want"
      : "All suggestions added · ask for more if you need",
    thinking: !!s.qThinking,
    canSuggestMore: POOL.length > 0 && !s.qThinking,
    suggestMore: () => {
      if (s.qThinking) return
      agent.setState({ qThinking: true })
      agent.later(() => {
        const st = agent.state
        const add = POOL.filter(
          (x) => !st.screening.some((y) => y.key === x.key)
        )
          .slice(0, 2)
          .map((x) => ({ ...x, on: false }))
        agent.setState({
          qThinking: false,
          screening: st.screening.concat(add),
        })
      }, 900)
    },
    addOpen: !!s.qAddOpen,
    openAdd: () => {
      agent.setState({ qAddOpen: true })
      agent.later(() => document.getElementById("f-newq")?.focus(), 50)
    },
    closeAdd: () => agent.setState({ qAddOpen: false, newQ: "" }),
    newQ: s.newQ,
    onNewQ: (value: string) => agent.setState({ newQ: value }),
    addQ,
    summary: on
      ? nOn
        ? nOn + " selected · optional, you can skip this step"
        : "None selected yet · optional, you can skip this step"
      : "Off · turn on to see " +
        s.screening.length +
        " AI-suggested questions",
  }
}
