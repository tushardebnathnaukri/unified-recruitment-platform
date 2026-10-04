/**
 * Step 4, targeting — the prototype's "conversational targeting" (its R1–R7,
 * H1 and C2 blocks), split from `view.ts` because the candidates and review
 * screens read its criteria too.
 *
 * `criteriaOf` is what the requirements ARE: domain, industry, skills, the
 * must-haves and exclusions from the brief, the good-to-haves, custom fields,
 * and the preferences (companies, colleges, course, batch, diversity, video),
 * each in the must or good bucket. The rest is how the step draws and edits
 * them. Copy and arithmetic are the prototype's.
 */
import type { AddlField, AgentController } from "@/lib/ai-agent/controller"
import {
  CLUSTERS,
  COSUGGEST,
  COURSES,
  COURSE_TIP,
  DIVS,
  INSTS,
  ALL_INSTS,
  ROLES,
  VNOTES,
  fmt,
  instSet,
  pctTxt,
  poolFor,
  saveInstLists,
  saveLists,
  savePast,
  setBuckets,
} from "@/lib/ai-agent/data"
import type { AgentForm, SourceKey } from "@/lib/ai-agent/types"
import type { Core, Requirements } from "@/lib/ai-agent/view"

type Src = "jd" | "ai" | "you" | "voice" | "past"
type Bucket = "must" | "good"

/** One requirement, as the prototype's `items` holds it. */
export type Criterion = {
  k: string
  label: string
  t: string
  edit?: "class" | "skills" | "co" | "inst" | "pref"
  lock?: boolean
  lockTip?: string
  rm?: () => void
  empty?: boolean
  src: Src
}

export const SRC_NAME: Record<Src, string> = {
  jd: "From your JD",
  ai: "AI suggestion",
  you: "Added by you",
  voice: "From your voice note",
  past: "From your past jobs",
}

/** Every requirement, in the prototype's order, with its bucket. */
export function criteriaOf(agent: AgentController, core: Core) {
  const { s, f } = core
  const R = ROLES[s.roleKey!]
  const srcEd = (ks: string[]) => ks.some((k) => s.src && s.src[k] === "edited")
  const gv = (id: string) =>
    String(s.addl.find((a) => a.id === id)?.value || "")
  const gs = (id: string): Src =>
    s.addl.find((a) => a.id === id)?.src === "edited" ? "you" : "jd"
  const vk = s.vnKeys || [],
    yk = s.youKeys || []
  const srcOf = (k: string): Src =>
    vk.indexOf(k) > -1 ? "voice" : yk.indexOf(k) > -1 ? "you" : "jd"
  const coTags = coTagsOf(core)
  const inTags = instTagsOf(core)
  const items: Criterion[] = []
  if (s.u && R) {
    items.push({
      k: "domain",
      label: "Domain",
      t:
        "Domain: " +
        (gv("domain") || "—") +
        (gv("subDomain") ? " › " + gv("subDomain") : ""),
      edit: "class",
      lock: true,
      src: gs("domain"),
    })
    items.push({
      k: "industry",
      label: "Industry",
      t:
        "Industry: " +
        (gv("industry") || "—") +
        (gv("subIndustry") ? " › " + gv("subIndustry") : ""),
      edit: "class",
      src: gs("industry"),
    })
    if ((f.skills || []).length)
      items.push({
        k: "skills",
        label: "Hard skills",
        t:
          "Skills: " +
          f.skills.slice(0, 4).join(", ") +
          (f.skills.length > 4 ? " +" + (f.skills.length - 4) : ""),
        edit: "skills",
        src: srcEd(["skills"]) ? "you" : "jd",
      })
    s.u.must.forEach((m) =>
      items.push({
        k: "m:" + m.t,
        label: m.t,
        t: m.t,
        rm: () => agent.removeCrit("m", m.t),
        src: srcOf("m:" + m.t),
      })
    )
    s.u.deal.forEach((d) =>
      items.push({
        k: "d:" + d,
        label: d,
        t: "✕ " + d,
        lock: true,
        lockTip: "Exclusions always filter. Remove it if it doesn’t apply.",
        rm: () => agent.removeCrit("d", d),
        src: srcOf("d:" + d),
      })
    )
    s.u.nice.forEach((n) =>
      items.push({
        k: "n:" + n,
        label: n,
        t: n,
        rm: () => agent.removeCrit("n", n),
        src: srcOf("n:" + n),
      })
    )
    s.addl
      .filter((a) => a.custom)
      .forEach((a) =>
        items.push({
          k: "a:" + a.id,
          label: a.label,
          t: a.label + ": " + (a.value || "—"),
          rm: () => agent.removeCrit("a", a.id),
          src: a.hint === "From your voice note" ? "voice" : "you",
        })
      )
    const sumT = (arr: { v: string }[]) =>
      arr
        .slice(0, 2)
        .map((x) => x.v)
        .join(", ") + (arr.length > 2 ? " +" + (arr.length - 2) : "")
    const psrc = (x: string | null | undefined): Src =>
      x === "past" ? "past" : x === "edited" ? "you" : "ai"
    items.push({
      k: "co",
      label: "Companies",
      t: "Companies: " + sumT(coTags),
      empty: !coTags.length,
      edit: "co",
      src: psrc(s.coSrc),
    })
    items.push({
      k: "inst",
      label: "Colleges",
      t: "Colleges: " + sumT(inTags),
      empty: !inTags.length,
      edit: "inst",
      src: psrc(s.instSrc),
    })
    const fc = (f.course || [])[0]
    items.push({
      k: "course",
      label: "Course type",
      t: "Course: " + (fc || ""),
      empty: !fc,
      edit: "pref",
      src: "you",
    })
    const hb = !!(f.batchMin || f.batchMax)
    items.push({
      k: "batch",
      label: "Graduating year",
      t: "Batch: " + (f.batchMin || "any") + "–" + (f.batchMax || "any"),
      empty: !hb,
      edit: "pref",
      src: "you",
    })
    const dv = f.diversity || []
    items.push({
      k: "div",
      label: "Diversity",
      t: "Diversity: " + dv.join(", "),
      empty: !dv.length,
      edit: "pref",
      src: "you",
    })
    items.push({
      k: "video",
      label: "Video profiles",
      t: "Prefers video profiles",
      empty: !f.video,
      edit: "pref",
      src: "you",
    })
  }

  const open = (k: string) => {
    if (k === "skills") {
      openR1(agent, core, "skills")
      return
    }
    const c = items.find((x) => x.k === k)
    if (c?.edit)
      agent.setState({
        tEd: c.edit as "class" | "co" | "inst" | "pref",
        tEdKey: c.k,
        r1Ed: null,
      })
  }
  const shape = (c: Criterion, b: Bucket) => ({
    ...c,
    bucket: b,
    isEmpty: !!c.empty,
    isClass: c.k === "domain" || c.k === "industry",
    isExcl: c.k.indexOf("d:") === 0,
    short: c.t.length > 34 ? c.t.slice(0, 33) + "…" : c.t,
    srcName: SRC_NAME[c.src] || SRC_NAME.ai,
    canRemove: !!c.rm,
    remove: c.rm || (() => {}),
    canEdit: !!c.edit && !c.empty,
    open: () => open(c.k),
  })
  const must = items
    .filter((c) => agent.bucketOf(c.k) === "must")
    .map((c) => shape(c, "must"))
  const good = items
    .filter((c) => agent.bucketOf(c.k) !== "must")
    .map((c) => shape(c, "good"))
  return { items, must, good, open }
}

export type Criteria = ReturnType<typeof criteriaOf>

function coTagsOf(core: Core) {
  const { s, f, RV } = core
  if (!RV.addl) return []
  const subs = f.coSubs || [],
    cos = f.cos || []
  return subs
    .map((x) => ({
      k: x.indexOf(" › ") > -1 ? x.split(" › ")[0] : "Cluster",
      v: x.indexOf(" › ") > -1 ? x.split(" › ")[1] : x + " (all)",
    }))
    .concat(cos.map((n) => ({ k: "Company", v: n })))
    .filter(() => !!s)
}

function instTagsOf(core: Core) {
  const { f, RV } = core
  if (!RV.addl) return []
  return (f.insts || []).map((x) => ({
    k: x.indexOf(" › ") > -1 ? "College" : "Cluster",
    v: x.indexOf(" › ") > -1 ? x.split(" › ")[1] : x,
  }))
}

/** Open the role-detail editor at the top of targeting (with a snapshot to cancel to). */
function openR1(
  agent: AgentController,
  core: Core,
  k: "role" | "where" | "skills" | "all"
) {
  const { s, f } = core
  agent.setState({
    r1Ed: k,
    r1Snap:
      (s.r1Ed ? s.r1Snap : null) ||
      ({
        ...f,
        locations: f.locations.slice(),
        skills: f.skills.slice(),
      } as AgentForm),
    r1SrcSnap: (s.r1Ed ? s.r1SrcSnap : null) || { ...s.src },
    tEd: null,
  })
}

/** "Here's what I understood": the role line and its editor. */
export function understoodOf(agent: AgentController, core: Core) {
  const { s, f } = core
  const srcEd = (ks: string[]) => ks.some((k) => s.src && s.src[k] === "edited")
  const ed = s.tab === "addl" ? s.r1Ed || null : null
  const bm = agent.basicMissing()
  const need =
    (
      {
        role: ["title", "company"],
        where: ["locations", "exp", "salary"],
        skills: ["skills"],
        all: ["title", "company", "locations", "exp", "salary", "skills"],
      } as Record<string, string[]>
    )[ed || ""] || []
  const NM: Record<string, string> = {
    title: "job title",
    company: "company",
    locations: "a location",
    exp: "a valid experience range",
    salary: "a salary range",
    skills: "at least 3 skills",
  }
  const miss = need.filter((k) => bm.indexOf(k) > -1)
  return {
    line: [
      f.title || "Add a job title",
      f.confidential ? "Confidential" : f.company || "",
      (f.locations || []).join(", "),
      f.expMin + "–" + f.expMax + " yrs",
      "₹" + (f.salMin || "–") + "–" + (f.salMax || "–") + "L",
    ]
      .filter(Boolean)
      .join(" · "),
    edited:
      srcEd(["title", "company"]) ||
      srcEd(["locations", "exp", "salary"]) ||
      srcEd(["skills"]),
    chips: {
      title: f.title || "Add a job title",
      loc: (f.locations || []).join(", ") || "Add location",
      expSal:
        f.expMin +
        "–" +
        f.expMax +
        " yrs · ₹" +
        (f.salMin || "–") +
        "–" +
        (f.salMax || "–") +
        "L",
      skillsN: (f.skills || []).length + " skills",
    },
    editing: ed,
    /** The summary has scrolled off the top: the slim bar takes its place. */
    slim: s.tab === "addl" && !!s.r1Slim,
    setSlim: (slim: boolean) => {
      if (slim !== !!agent.state.r1Slim) agent.setState({ r1Slim: slim })
    },
    editRole: ed === "role" || ed === "all",
    editWhere: ed === "where" || ed === "all",
    editSkills: ed === "skills" || ed === "all",
    title:
      (
        {
          role: "The role",
          where: "Where & pay",
          skills: "Skills",
          all: "Edit role details",
        } as Record<string, string>
      )[ed || ""] || "",
    open: (k: "role" | "where" | "skills" | "all") => openR1(agent, core, k),
    err: miss.length
      ? "Add " + miss.map((k) => NM[k]).join(", ") + " to save"
      : "",
    saveDisabled: miss.length > 0,
    save: () => {
      if (miss.length) return
      agent.setState({ r1Ed: null, r1Snap: null, r1SrcSnap: null })
    },
    cancel: () =>
      agent.setState({
        form: s.r1Snap || s.form,
        src: s.r1SrcSnap || s.src,
        r1Ed: null,
        r1Snap: null,
        r1SrcSnap: null,
      }),
  }
}

/** The function and industry taxonomy the pair editor offers. */
function taxonomy(s: Core["s"]) {
  const TX: { fn: Record<string, string[]>; ind: Record<string, string[]> } = {
    fn: {},
    ind: {},
  }
  const addT = (m: Record<string, string[]>, p: string, c: string) => {
    if (!p) return
    m[p] = m[p] || []
    if (c && m[p].indexOf(c) < 0) m[p].push(c)
  }
  Object.values(ROLES).forEach((RR) => {
    addT(TX.fn, RR.domain, RR.subDomain)
    addT(TX.ind, RR.industry, RR.subIndustry)
  })
  ;[
    ["Brand Marketing", "Performance Marketing"],
    ["Brand Marketing", "Consumer Insights"],
    ["B2B Sales", "Channel Sales"],
    ["B2B Sales", "Inside Sales"],
    ["HR Business Partnering", "Corporate HRBP"],
    ["Product Management", "Platform"],
  ].forEach((x) => addT(TX.fn, x[0], x[1]))
  ;[
    ["FMCG / Consumer", "Food & Beverages"],
    ["FMCG / Consumer", "Home Care"],
    ["Software / SaaS", "Consumer apps"],
    ["Internet / Consumer Tech", "Marketplaces"],
    ["BFSI", "Banking"],
    ["BFSI", "Insurance"],
  ].forEach((x) => addT(TX.ind, x[0], x[1]))
  const gv = (id: string) =>
    String(s.addl.find((a) => a.id === id)?.value || "")
  addT(TX.fn, gv("domain"), gv("subDomain"))
  addT(TX.ind, gv("industry"), gv("subIndustry"))
  return TX
}

type RowKey =
  | "domain"
  | "industry"
  | "skills"
  | "co"
  | "inst"
  | "course"
  | "batch"
  | "div"
  | "video"
const ROW_ORDER: RowKey[] = [
  "domain",
  "industry",
  "skills",
  "co",
  "inst",
  "course",
  "batch",
  "div",
  "video",
]
const ROW_DEF: Record<
  RowKey,
  {
    label: string
    ed: "pair" | "skills" | "co" | "inst" | "pref"
    p?: string
    c?: string
    l1?: string
    l2?: string
    tx?: "fn" | "ind"
    hint?: string
  }
> = {
  domain: {
    label: "Function",
    ed: "pair",
    p: "domain",
    c: "subDomain",
    l1: "Function",
    l2: "Specialisation",
    tx: "fn",
    hint: "What the person does",
  },
  industry: {
    label: "Industry",
    ed: "pair",
    p: "industry",
    c: "subIndustry",
    l1: "Industry",
    l2: "Segment",
    tx: "ind",
    hint: "What their company does",
  },
  skills: { label: "Skills", ed: "skills" },
  co: { label: "Similar companies", ed: "co" },
  inst: { label: "Colleges", ed: "inst" },
  course: { label: "Course type", ed: "pref" },
  batch: { label: "Graduation year", ed: "pref" },
  div: { label: "Diversity", ed: "pref" },
  video: { label: "Video profile", ed: "pref" },
}

/**
 * The two rows — MUST HAVE and GOOD TO HAVE — as chips: drag between rows,
 * a menu to edit, move or remove each, "+ Add" for what is not set yet, the
 * function/industry pair editor, and the undo strips after a move or a
 * removal (the prototype's H1).
 */
export function rowsOf(agent: AgentController, core: Core) {
  const { s, f } = core
  const TX = taxonomy(s)
  const gv = (id: string) =>
    String(s.addl.find((a) => a.id === id)?.value || "")
  const gEdited = (id: string) =>
    s.addl.find((a) => a.id === id)?.src === "edited"
  const coT = coTagsOf(core),
    inT = instTagsOf(core)
  const val = (k: RowKey) => {
    if (k === "domain")
      return gv("domain")
        ? gv("domain") + (gv("subDomain") ? " › " + gv("subDomain") : "")
        : ""
    if (k === "industry")
      return gv("industry")
        ? gv("industry") + (gv("subIndustry") ? " › " + gv("subIndustry") : "")
        : ""
    if (k === "skills") {
      const sk = f.skills || []
      return (
        sk.slice(0, 4).join(", ") +
        (sk.length > 4 ? " +" + (sk.length - 4) : "")
      )
    }
    if (k === "co") return coT.map((x) => x.v).join(", ")
    if (k === "inst") return inT.map((x) => x.v).join(", ")
    if (k === "course") return (f.course || [])[0] || ""
    if (k === "batch")
      return f.batchMin || f.batchMax
        ? (f.batchMin || "any") + "–" + (f.batchMax || "any")
        : ""
    if (k === "div") return (f.diversity || []).join(", ")
    if (k === "video") return f.video ? "Preferred" : ""
    return ""
  }
  const tip = (k: RowKey) => {
    if (k === "domain" || k === "industry")
      return gEdited(k) ? "Edited by you" : "From your JD"
    if (k === "skills")
      return s.src && s.src.skills === "edited"
        ? "Edited by you"
        : "From your JD"
    if (k === "co")
      return s.coSrc === "past"
        ? "From your past jobs"
        : s.coSrc === "edited"
          ? "Added by you"
          : "AI: companies similar hires came from"
    if (k === "inst")
      return s.instSrc === "past"
        ? "From your past jobs"
        : s.instSrc === "edited"
          ? "Added by you"
          : "AI suggestion"
    return "Your preference"
  }
  const setAddl = (o: Record<string, string>) =>
    s.addl.map((a) =>
      a.id in o ? { ...a, value: o[a.id], src: "edited" as const } : a
    )
  const removeK = (k: RowKey) => {
    const snap = {
      form: JSON.parse(JSON.stringify(s.form)) as AgentForm,
      addl: JSON.parse(JSON.stringify(s.addl)) as AddlField[],
      bk: { ...(s.bk || {}) },
    }
    const lbl = ROW_DEF[k].label
    const P = (
      {
        skills: { skills: [] },
        co: { coSubs: [], cos: [] },
        inst: { insts: [] },
        course: { course: [] },
        batch: { batchMin: "", batchMax: "" },
        div: { diversity: [] },
        video: { video: false },
      } as Partial<Record<RowKey, Partial<AgentForm>>>
    )[k]
    if (k === "domain")
      agent.setState({ addl: setAddl({ domain: "", subDomain: "" }) })
    else if (k === "industry")
      agent.setState({ addl: setAddl({ industry: "", subIndustry: "" }) })
    else if (P)
      agent.commit(P, {
        fields: [],
        label: "Removed " + lbl,
        log: "Removed " + lbl,
      })
    const tid = Date.now()
    agent.setState({
      rmSnap: snap,
      rmToast: "Removed " + lbl,
      rmId: tid,
      chipMenuE: null,
      lastMove: null,
      pairEd: null,
    })
    agent.later(() => {
      if (agent.state.rmId === tid)
        agent.setState({ rmToast: null, rmSnap: null })
    }, 5000)
  }
  const openEd = (k: RowKey) => {
    const d = ROW_DEF[k]
    if (d.ed === "skills") {
      agent.setState({
        chipMenuE: null,
        menuAdd: null,
        pairEd: null,
        tEd: null,
      })
      openR1(agent, core, "skills")
      return
    }
    if (d.ed === "pair") {
      const tx = TX[d.tx!]
      const p1 = gv(d.p!) || Object.keys(tx)[0]
      agent.setState({
        pairEd: k as "domain" | "industry",
        pairTmp: [p1, gv(d.c!) || (tx[p1] || [])[0] || ""],
        chipMenuE: null,
        tEd: null,
        menuAdd: null,
      })
    } else
      agent.setState({
        tEd: d.ed,
        tEdKey: k,
        chipMenuE: null,
        pairEd: null,
        menuAdd: null,
      })
  }
  const chip = (k: RowKey) => {
    const must = agent.bucketOf(k) === "must"
    const open = s.chipMenuE === k
    return {
      key: k,
      k: ROW_DEF[k].label,
      kl: ROW_DEF[k].label.toLowerCase(),
      v: val(k),
      tip: tip(k),
      must,
      open,
      active: open || s.pairEd === k || (s.tEdKey === k && !!s.tEd),
      setOpen: (next: boolean) =>
        agent.setState({ chipMenuE: next ? k : null, menuAdd: null }),
      edit: () => openEd(k),
      del: () => removeK(k),
      move: () => {
        agent.setState({ chipMenuE: null, rmToast: null })
        agent.moveCrit(k, must ? "good" : "must", ROW_DEF[k].label)
      },
      moveTip: must ? "Move to Good to have" : "Move to Must have",
    }
  }
  const present = ROW_ORDER.filter((k) => val(k))
  const unused = ROW_ORDER.filter((k) => !val(k))
  const addTo = (b: Bucket) =>
    unused.map((k) => ({
      label: ROW_DEF[k].label,
      go: () => {
        const bk = { ...(s.bk || {}) }
        bk[k] = b
        agent.setState({ bk, menuAdd: null })
        openEd(k)
      },
    }))

  const pk = s.pairEd
  const pd = pk ? ROW_DEF[pk] : null
  const pt = s.pairTmp || ["", ""]
  const pair =
    pd && s.tab === "addl"
      ? {
          title: "Edit " + pd.label.toLowerCase(),
          l1: pd.l1!,
          l2: pd.l2!,
          v1: pt[0],
          v2: pt[1],
          o1: Object.keys(TX[pd.tx!]),
          o2: TX[pd.tx!][pt[0]] || [],
          hint:
            pd.hint +
            " · " +
            pd.l2!.toLowerCase() +
            " options follow the " +
            pd.l1!.toLowerCase(),
          on1: (a1: string) =>
            agent.setState({ pairTmp: [a1, (TX[pd.tx!][a1] || [])[0] || ""] }),
          on2: (a2: string) => agent.setState({ pairTmp: [pt[0], a2] }),
          cancel: () => agent.setState({ pairEd: null, pairTmp: null }),
          save: () => {
            const o: Record<string, string> = {}
            o[pd.p!] = pt[0]
            o[pd.c!] = pt[1] || ""
            agent.setState({
              addl: setAddl(o),
              pairEd: null,
              pairTmp: null,
              log: s.log.concat([
                {
                  t:
                    "Updated " +
                    pd.label.toLowerCase() +
                    " to " +
                    pt[0] +
                    (pt[1] ? " › " + pt[1] : ""),
                  d: "",
                },
              ]),
            })
          },
        }
      : null

  // The move line under the rows, and the guard against a pool that is too thin.
  const R = ROLES[s.roleKey!]
  const P = poolFor(R, f, s.extraF)
  const lm = s.lastMove
  const movePct =
    lm && lm.before ? Math.round(((P - lm.before) / lm.before) * 100) : 0
  let guard: { text: string; move: () => void } | null = null
  if (R && s.revealed?.addl && P < 5000) {
    const crit = criteriaOf(agent, core).items
    let best: { label: string; k: string; p: number } | null = null
    crit
      .filter((c) => !c.lock && !c.empty && agent.bucketOf(c.k) === "must")
      .forEach((c) => {
        setBuckets(agent.bucketsFor({ [c.k]: "good" }))
        const p2 = poolFor(R, f, s.extraF)
        if (!best || p2 > best.p) best = { label: c.label, k: c.k, p: p2 }
      })
    agent.syncBuckets()
    const b = best as { label: string; k: string; p: number } | null
    if (b && b.p > P * 1.15)
      guard = {
        text:
          "Your must-haves narrow the pool to " +
          fmt(P) +
          ". Moving " +
          b.label +
          " to Good to have gives " +
          fmt(b.p) +
          ".",
        move: () => agent.moveCrit(b.k, "good", b.label),
      }
  }

  return {
    must: present.filter((k) => agent.bucketOf(k) === "must").map(chip),
    good: present.filter((k) => agent.bucketOf(k) !== "must").map(chip),
    addMust: addTo("must"),
    addGood: addTo("good"),
    menuAdd: s.menuAdd || null,
    setMenuAdd: (which: "m" | "g" | null) =>
      agent.setState({ menuAdd: which, chipMenuE: null }),
    noUnused: !unused.length,
    drop: (to: Bucket, k: string) =>
      agent.moveCrit(k, to, ROW_DEF[k as RowKey]?.label || k),
    pair,
    rmToast: s.rmToast && s.tab === "addl" ? s.rmToast : null,
    rmUndo: () => {
      if (s.rmSnap)
        agent.setState({
          form: s.rmSnap.form,
          addl: s.rmSnap.addl,
          bk: s.rmSnap.bk,
          rmSnap: null,
          rmToast: null,
        })
    },
    moveLine:
      lm && s.tab === "addl"
        ? "Moved " +
          lm.label +
          " to " +
          (lm.to === "must" ? "Must have" : "Good to have") +
          (lm.before && movePct !== 0
            ? " · pool " +
              fmt(lm.before) +
              " → " +
              fmt(P) +
              " (" +
              pctTxt(movePct) +
              ")"
            : " · pool size unchanged")
        : null,
    undoMove: () => {
      if (!lm) return
      const bk = { ...(s.bk || {}) }
      bk[lm.k] = lm.prev
      agent.setState({ bk, lastMove: null })
    },
    screenNote:
      !!lm &&
      s.tab === "addl" &&
      lm.to === "good" &&
      lm.k.indexOf("m:") === 0 &&
      s.screening.some((x) => x.key === lm.k.slice(2) && x.on),
    guard,
  }
}

/** The side editors: domain & industry, companies, colleges, preferences. */
export function editorsOf(
  agent: AgentController,
  core: Core,
  req: Requirements
) {
  const { s, f, paid } = core
  const te = s.tab === "addl" ? s.tEd || null : null
  const crit = criteriaOf(agent, core)
  const tk = s.tEdKey
  const tItem = crit.items.find((c) => c.k === tk)
  const tMov = !!tItem && !tItem.lock && !tItem.empty && te !== "pref"
  const tb = tk ? agent.bucketOf(tk) : "good"

  // Domain & industry fields, and custom fields.
  const addlShown = core.shown("addl")
  const addlRows = s.addl.map((fd) => {
    const { required, err } = req.addlErr(fd.id)
    return {
      id: fd.id,
      inputId: "ad-" + fd.id,
      label: fd.label,
      isNew: !!fd.isNew,
      tag: (addlShown ? fd.src || "none" : "filling") as SourceKey | "filling",
      select: fd.type === "select",
      options: fd.options || [],
      value: addlShown ? String(fd.value ?? "") : "",
      shown: addlShown,
      placeholder: fd.src === "needs" ? "Add a value" : "",
      hint: fd.hint || "",
      required,
      err,
      removable: s.customise && fd.id !== "category" && fd.id !== "fa",
      remove: () =>
        agent.setState({
          addl: s.addl.filter((x) => x.id !== fd.id),
          log: s.log.concat([{ t: "Removed field “" + fd.label + "”", d: "" }]),
        }),
      onChange: (value: string) =>
        agent.setState({
          addl: s.addl.map((x) =>
            x.id === fd.id
              ? {
                  ...x,
                  value,
                  src: "edited" as const,
                  hint: x.custom ? "" : x.hint,
                }
              : x
          ),
        }),
    }
  })

  // Companies
  const subs = f.coSubs || [],
    cos = f.cos || []
  const setCos = (patch: Partial<AgentForm>, label: string) => {
    agent.commit(patch, { fields: [], label, log: label })
    agent.setState({ coSrc: "edited" })
    savePast(agent.state.form!)
  }
  const sug = (COSUGGEST[s.roleKey!] || []).filter(
    (x) => subs.indexOf(x) < 0 && subs.indexOf(x.split(" › ")[0]) < 0
  )
  const C = s.coCluster
  const allOn = !!C && subs.indexOf(C) > -1
  const companies = {
    past: s.coSrc === "past",
    selected: subs
      .map((x) => ({
        t: x.indexOf(" › ") > -1 ? x.split(" › ")[1] : x + " (all)",
        kind: x.indexOf(" › ") > -1 ? x.split(" › ")[0] : "Cluster",
        company: false,
        remove: () =>
          setCos({ coSubs: subs.filter((y) => y !== x) }, "Removed " + x),
      }))
      .concat(
        cos.map((n) => ({
          t: n,
          kind: "Company",
          company: true,
          remove: () =>
            setCos({ cos: cos.filter((y) => y !== n) }, "Removed " + n),
        }))
      ),
    suggest: paid
      ? sug.map((x) => ({
          t: x.split(" › ")[1],
          add: () => setCos({ coSubs: subs.concat([x]) }, "Added " + x),
        }))
      : [],
    clusters: Object.keys(CLUSTERS).map((k) => ({
      v: k,
      l: k + " (" + CLUSTERS[k].length + ")",
    })),
    cluster: C,
    setCluster: (v: string) => agent.setState({ coCluster: v }),
    sub: C
      ? {
          count:
            (allOn
              ? CLUSTERS[C].length
              : CLUSTERS[C].filter((z) => subs.indexOf(C + " › " + z) > -1)
                  .length) +
            " of " +
            CLUSTERS[C].length +
            " selected",
          allLabel: allOn ? "Clear all" : "Select all",
          toggleAll: () =>
            setCos(
              {
                coSubs: allOn
                  ? subs.filter((y) => y !== C)
                  : subs.filter((y) => y.indexOf(C + " › ") !== 0).concat([C]),
              },
              (allOn ? "Removed " : "Added ") + C + " (all)"
            ),
          options: CLUSTERS[C].map((sc) => {
            const key = C + " › " + sc
            const on = allOn || subs.indexOf(key) > -1
            return {
              t: sc,
              on,
              toggle: () => {
                if (allOn) {
                  setCos(
                    {
                      coSubs: subs
                        .filter((y) => y !== C)
                        .concat(
                          CLUSTERS[C].filter((z) => z !== sc).map(
                            (z) => C + " › " + z
                          )
                        ),
                    },
                    "Removed " + key
                  )
                  return
                }
                setCos(
                  {
                    coSubs: on
                      ? subs.filter((y) => y !== key)
                      : subs.concat([key]),
                  },
                  (on ? "Removed " : "Added ") + key
                )
              },
            }
          }),
        }
      : null,
    newCo: s.newCo,
    setNewCo: (v: string) => agent.setState({ newCo: v }),
    addCo: () => {
      const t = (s.newCo || "").trim()
      agent.setState({ newCo: "" })
      if (!t || cos.some((c) => c.toLowerCase() === t.toLowerCase())) return
      setCos({ cos: cos.concat([t]) }, "Added company " + t)
    },
    lists: (s.savedLists || []).map((l) => ({
      name: l.name,
      count: l.subs.length + l.cos.length + " items",
      tip: l.subs
        .concat(l.cos)
        .map((x) => x.split(" › ").pop())
        .join(", "),
      apply: () => {
        const ns = subs.concat(l.subs.filter((x) => subs.indexOf(x) < 0))
        const nc = cos.concat(l.cos.filter((x) => cos.indexOf(x) < 0))
        setCos({ coSubs: ns, cos: nc }, "Applied list “" + l.name + "”")
        agent.toast("Applied “" + l.name + "”")
      },
    })),
    canSave: subs.length + cos.length > 0,
    listName: s.newListName,
    setListName: (v: string) => agent.setState({ newListName: v }),
    save: () => {
      const nm =
        (s.newListName || "").trim() ||
        "My list " + ((s.savedLists || []).length + 1)
      const lists = (s.savedLists || [])
        .filter((l) => l.name !== nm)
        .concat([{ name: nm, subs: subs.slice(), cos: cos.slice() }])
      saveLists(lists)
      agent.setState({ savedLists: lists, newListName: "" })
      agent.toast("Saved “" + nm + "”. It’ll be available on your future jobs.")
    },
  }

  // Colleges
  const insts = f.insts || []
  const setInst = (list: string[], label: string) => {
    agent.commit({ insts: list }, { fields: [], label, log: label })
    agent.setState({ instSrc: "edited" })
    savePast(agent.state.form!)
  }
  const isInd = (x: string) => x.indexOf(" › ") > -1
  const nm = (x: string) => (isInd(x) ? x.split(" › ")[1] : x)
  const clSel = insts.filter((x) => !isInd(x) && INSTS[x])
  const covered = (n: string) => clSel.filter((c) => INSTS[c].indexOf(n) > -1)
  const isOn = (n: string) =>
    covered(n).length > 0 || insts.indexOf("Institute › " + n) > -1
  const without = (names: string[]) => {
    let out = insts.slice()
    const hit = clSel.filter((c) => INSTS[c].some((n) => names.indexOf(n) > -1))
    hit.forEach((c) => {
      out = out.filter((y) => y !== c)
      INSTS[c].forEach((n) => {
        const k = "Institute › " + n
        if (
          names.indexOf(n) < 0 &&
          out.indexOf(k) < 0 &&
          !out
            .filter((y) => !isInd(y) && INSTS[y])
            .some((y) => INSTS[y].indexOf(n) > -1)
        )
          out.push(k)
      })
    })
    return out.filter((y) => !(isInd(y) && names.indexOf(nm(y)) > -1))
  }
  const iq = (s.instQuery || "").trim().toLowerCase()
  const base =
    s.instCluster && INSTS[s.instCluster] ? INSTS[s.instCluster] : ALL_INSTS
  const vis = base.filter((n) => !iq || n.toLowerCase().indexOf(iq) > -1)
  const nOn = vis.filter(isOn).length
  const allVisOn = vis.length > 0 && nOn === vis.length
  const colleges = {
    past: s.instSrc === "past",
    selected: insts.map((x) => ({
      t: nm(x),
      kind: isInd(x) ? "College" : "Cluster",
      remove: () =>
        setInst(
          insts.filter((y) => y !== x),
          "Removed " + nm(x)
        ),
    })),
    clusters: Object.keys(INSTS).map((k) => {
      const on = insts.indexOf(k) > -1
      return {
        t: k,
        n: INSTS[k].length,
        on,
        tip: INSTS[k].join(", "),
        toggle: () =>
          setInst(
            on ? insts.filter((y) => y !== k) : insts.concat([k]),
            (on ? "Removed " : "Added ") + k
          ),
      }
    }),
    clusterOpts: Object.keys(INSTS).map((k) => ({
      v: k,
      l: k + " (" + INSTS[k].length + ")",
    })),
    allN: ALL_INSTS.length,
    cluster: s.instCluster,
    setCluster: (v: string) => agent.setState({ instCluster: v }),
    query: s.instQuery,
    setQuery: (v: string) => agent.setState({ instQuery: v }),
    count: nOn + " of " + vis.length + " selected",
    allLabel: allVisOn
      ? "Clear these"
      : s.instCluster && !iq
        ? "Select all"
        : "Select all shown",
    toggleAll: () => {
      if (allVisOn) {
        setInst(without(vis), "Cleared " + vis.length + " colleges")
        return
      }
      if (s.instCluster && !iq) {
        const cl = s.instCluster
        setInst(
          insts
            .filter((y) => !(isInd(y) && INSTS[cl].indexOf(nm(y)) > -1))
            .concat([cl]),
          "Added " + cl
        )
        return
      }
      setInst(
        insts.concat(
          vis.filter((n) => !isOn(n)).map((n) => "Institute › " + n)
        ),
        "Added " + vis.filter((n) => !isOn(n)).length + " colleges"
      )
    },
    options: vis.map((n) => {
      const on = isOn(n)
      return {
        t: n,
        on,
        toggle: () =>
          setInst(
            on ? without([n]) : insts.concat(["Institute › " + n]),
            (on ? "Removed " : "Added ") + n
          ),
      }
    }),
    lists: (s.instLists || []).map((l) => ({
      name: l.name,
      count: instSet(l.insts).length + " colleges",
      tip: l.insts.map(nm).join(", "),
      apply: () => {
        setInst(
          insts.concat(l.insts.filter((x) => insts.indexOf(x) < 0)),
          "Applied list “" + l.name + "”"
        )
        agent.toast("Applied “" + l.name + "”")
      },
    })),
    canSave: insts.length > 0,
    listName: s.newInstListName,
    setListName: (v: string) => agent.setState({ newInstListName: v }),
    save: () => {
      const n2 =
        (s.newInstListName || "").trim() ||
        "College list " + ((s.instLists || []).length + 1)
      const lists = (s.instLists || [])
        .filter((l) => l.name !== n2)
        .concat([{ name: n2, insts: insts.slice() }])
      saveInstLists(lists)
      agent.setState({ instLists: lists, newInstListName: "" })
      agent.toast("Saved “" + n2 + "” for future jobs")
    },
  }

  // Preferences
  const yrs = [{ v: "", l: "Any" }]
  for (let y = 2026; y >= 1985; y--) yrs.push({ v: String(y), l: String(y) })
  const prefs = {
    batchOpts: yrs,
    batchMin: f.batchMin,
    batchMax: f.batchMax,
    setBatchMin: (v: string) =>
      agent.edit(
        "batch",
        { batchMin: v },
        v ? "Batch from " + v : "Batch filter cleared"
      ),
    setBatchMax: (v: string) =>
      agent.edit(
        "batch",
        { batchMax: v },
        v ? "Batch up to " + v : "Batch filter cleared"
      ),
    courses: COURSES.map((c) => {
      const sel = f.course[0] === c
      return {
        l: c,
        on: core.shown("course") && sel,
        tip: COURSE_TIP[c],
        toggle: () =>
          agent.edit(
            "course",
            { course: sel ? [] : [c] },
            sel ? "Cleared course type" : "Course type: " + c
          ),
      }
    }),
    courseInfo: f.course[0]
      ? COURSE_TIP[f.course[0]] + "."
      : "No preference by default. Part time covers distance learning, executive programmes and certifications; All includes every course type.",
    diversity: DIVS.map((c) => {
      const on = f.diversity.indexOf(c) > -1
      return {
        l: c,
        on,
        toggle: () =>
          agent.edit(
            "diversity",
            {
              diversity: on
                ? f.diversity.filter((x) => x !== c)
                : f.diversity.concat([c]),
            },
            (on ? "Removed " : "Added ") + c
          ),
      }
    }),
    video: f.video,
    toggleVideo: () =>
      agent.edit(
        "video",
        { video: !f.video },
        f.video ? "Video profile not required" : "Prefer video profiles"
      ),
  }

  return {
    open: te,
    title:
      (
        {
          class: "Domain & industry",
          co: "Companies",
          inst: "Colleges",
          pref: "Candidate preferences",
        } as Record<string, string>
      )[te || ""] || "",
    done: () => agent.setState({ tEd: null, tEdKey: null }),
    canMove: tMov,
    moveLabel: "Move to " + (tb === "must" ? "Good to have" : "Must have"),
    move: () => {
      if (tItem)
        agent.moveCrit(tk!, tb === "must" ? "good" : "must", tItem.label)
    },
    addlRows,
    customise: s.customise,
    customiseLabel: s.customise ? "Done customising" : "+ Add or edit fields",
    toggleCustomise: () => agent.setState({ customise: !s.customise }),
    quickFields: [
      "Team size",
      "Reports to",
      "Hire type",
      "Notice period",
      "Travel required",
    ]
      .filter((n) => !s.addl.some((x) => x.label === n))
      .map((n) => ({ n, add: () => agent.addCustomField(n, "Text", "") })),
    nf: s.nf,
    setNf: (patch: Partial<AgentForm> | Partial<typeof s.nf>) =>
      agent.setState({ nf: { ...s.nf, ...patch } }),
    addField: () => agent.addCustomField(s.nf.label, s.nf.type, s.nf.options),
    companies,
    colleges,
    prefs,
    forgetPast: () => agent.forgetPast(),
  }
}

/** The conversation's beats, the hiring manager's note, and what comes next. */
export function conversationOf(agent: AgentController, core: Core) {
  const { s, RV } = core
  const ready = !!RV.addl && !(s.filling && s.phase === "addl")
  const conv = s.convN == null ? 4 : s.convN
  const vn = s.vn || "idle"
  const settled = vn === "done" || !!s.vnSkip
  const gv = (id: string) =>
    String(s.addl.find((a) => a.id === id)?.value || "").trim()
  const missing: { label: string; go: () => void }[] = []
  if (s.u && !gv("domain"))
    missing.push({
      label: "Set the function",
      go: () => {
        const RR = ROLES[s.roleKey!]
        agent.setState({
          pairEd: "domain",
          pairTmp: [RR.domain || "", RR.subDomain || ""],
          tEd: null,
        })
      },
    })
  if (s.u && !s.u.must.length)
    missing.push({
      label: "Add a must-have",
      go: () => agent.focusField("mustc"),
    })
  const cv2 = ready && conv >= 2
  const cs = s.call || null
  return {
    waiting: s.tab === "addl" && !ready,
    cv1: ready && conv >= 1,
    cv2,
    askMore: cv2 && settled && missing.length > 0,
    allSet: cv2 && settled && !missing.length,
    missing,
    seeCandidates: () => agent.goNext(),
    voice: {
      state: vn,
      title:
        vn === "rec"
          ? "Listening… tap stop when done"
          : vn === "done"
            ? s.vnSrc === "call"
              ? "Got it. Your call is added"
              : "Got it. Your note is added"
            : "Help me find more relevant profiles",
      buttonText: vn === "done" ? "Add another note" : "Record a voice note",
      toggle: () => agent.vnToggle(),
      undo: () => agent.vnUndo(),
      sub:
        vn === "rec"
          ? "Say it the way the hiring manager told you."
          : vn === "done"
            ? "The JD, screening questions and matches are updated."
            : "Share your requirements as a voice note, or get on a call with our AI for assistance.",
      text: s.vnText || "",
      items: s.vnItems || [],
      fromLabel:
        s.vnSrc === "call"
          ? "From your call, I added to the job:"
          : "From your note, I added to the job:",
      examples: (VNOTES[s.roleKey!] ? VNOTES[s.roleKey!].fx : [])
        .map((e) =>
          e.type === "must"
            ? {
                t: "Must have: " + e.t.charAt(0).toLowerCase() + e.t.slice(1),
                k: "must-have",
              }
            : e.type === "addl"
              ? {
                  t: "People from " + e.v + " would be ideal",
                  k: "target companies",
                }
              : e.type === "deal"
                ? {
                    t:
                      "Skip profiles with " +
                      e.v.charAt(0).toLowerCase() +
                      e.v.slice(1),
                    k: "who to avoid",
                  }
                : { t: e.v + " is a big plus", k: "nice to have" }
        )
        .concat([{ t: "Needs to join within 30 days", k: "urgency" }]),
      callBusy: !!cs || vn === "rec" || vn === "processing",
      beginCall: () => agent.beginCall(),
      canSkip: !s.vn || s.vn === "idle",
      skipped: !!s.vnSkip,
      skip: () => agent.setState({ vnSkip: true }),
      unskip: () => agent.setState({ vnSkip: false }),
    },
  }
}
