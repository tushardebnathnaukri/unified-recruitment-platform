/**
 * The AI Agent V2.3 prototype's component, as a store with its methods.
 *
 * Carried over from the peer's class component method by method (see
 * `store.ts` for why it keeps `state` / `setState` rather than becoming a
 * reducer). The copy, the timings and the order of every state change are the
 * prototype's own; what changed is types, and that the derived view — the
 * prototype's 3,900-line `renderVals` — lives with the screens that draw it
 * (`components/ai-agent/`) instead of in here.
 */
import {
  CITY_ALIAS,
  COSUGGEST,
  FN,
  FOCUS,
  ORDER,
  ORDER_STEPS,
  PHASE_DONE,
  ROLES,
  STEP_MS,
  VNOTES,
  clearPast,
  detectRole,
  fmt,
  loadInstLists,
  loadLists,
  loadPast,
  pctTxt,
  poolFor,
  recScreen,
  setBuckets,
} from "@/lib/ai-agent/data"
import { Store } from "@/lib/ai-agent/store"
import type {
  AgentForm,
  Buckets,
  CompanyList,
  InstituteList,
  QuestionOption,
  RoleKey,
  RoleQuestion,
  ScreeningItem,
  SourceKey,
  StepKey,
} from "@/lib/ai-agent/types"

export type Stage = "start" | "review" | "preview" | "done"

export type ChatMessage = { who: "you" | "ai"; text: string }
export type LogEntry = { t: string; d: string; sub?: string; g?: string }
export type ThinkStep = { t: string; d: string }

/** A targeting field — industry, domain, their subs, and any custom one. */
export type AddlField = {
  id: string
  label: string
  type: "text" | "select"
  value: string
  src: SourceKey
  options?: string[] | null
  isNew?: boolean
  custom?: boolean
  hint?: string
}

export type Understood = {
  summary: string
  must: { t: string; q: string }[]
  nice: string[]
  deal: string[]
}

export type AgentState = {
  stage: Stage
  note: string
  recording: boolean
  voiceIdx: number
  voiceKey?: RoleKey
  showPast: boolean
  fileMsg: string
  notice: string
  roleKey: RoleKey | null
  form: AgentForm | null
  src: Partial<Record<string, SourceKey>>
  locks: Partial<Record<string, boolean>>
  addl: AddlField[]
  customise: boolean
  nf: { label: string; type: string; options: string }
  u: Understood | null
  newMust: string
  questions: RoleQuestion[]
  extraF: number
  screening: ScreeningItem[]
  newQ: string
  unchecked: Record<string, boolean>
  jdOverride: string | null
  tab: StepKey
  log: LogEntry[]
  showLog: boolean
  chat: ChatMessage[]
  chatInput: string
  thinkSteps: ThinkStep[]
  thinkStep: number
  filling: boolean
  lastChange: { label: string; pct: number } | null
  accepted: number
  newLoc: string
  newSkill: string
  boost: boolean
  linkedin: boolean
  cosOpen: boolean
  coCluster: string
  instOpen: boolean
  instCluster: string
  instQuery: string
  newInstListName: string
  instLists: InstituteList[]
  newCo: string
  newListName: string
  savedLists: CompanyList[]
  // Set by buildJob and the steps after it.
  srcJd?: boolean
  pastJob?: string | null
  pjOpen?: boolean
  coSrc?: "past" | "ai" | "edited" | null
  instSrc?: "past" | "ai" | "edited" | null
  screenEnabled?: boolean
  tried?: boolean
  phase?: StepKey
  revealed?: Partial<Record<StepKey, boolean>>
  maxStep?: number
  vn?: "idle" | "rec" | "processing" | "done"
  vnText?: string
  vnSrc?: "note" | "call"
  vnItems?: { t: string; where: string }[]
  vnSnap?: Pick<AgentState, "u" | "screening" | "addl"> | null
  vnKeys?: string[]
  vnSkip?: boolean
  call?: "connecting" | "live" | "processing" | null
  callSecs?: number
  callText?: string
  callMin?: boolean
  bk?: Record<string, "must" | "good">
  lastMove?: {
    id: number
    k: string
    label: string
    to: "must" | "good"
    prev: "must" | "good"
    before: number
  } | null
  rmToast?: string | null
  rmSnap?: {
    form: AgentForm
    addl: AddlField[]
    bk: Record<string, "must" | "good">
  } | null
  rmId?: number
  // The panel's "show more" toggles.
  todoAll?: boolean
  doneAll?: boolean
  // Targeting: the role-detail editor, the side editors, the quick check.
  r1Ed?: "role" | "where" | "skills" | "all" | null
  r1Snap?: AgentForm | null
  r1SrcSnap?: AgentState["src"] | null
  backTo?: StepKey | null
  tEd?: "class" | "co" | "inst" | "pref" | null
  tEdKey?: string | null
  youKeys?: string[]
  triConf?: Record<string, boolean>
  triFocus?: string | null
  allM?: boolean
  allG?: boolean
  addOpenM?: boolean
  addOpenG?: boolean
  newMustC?: string
  newGoodC?: string
  prefMenu?: boolean
  chipMenuE?: string | null
  menuAdd?: "m" | "g" | null
  pairEd?: "domain" | "industry" | null
  pairTmp?: [string, string] | null
  // The JD and screening steps.
  jdFile?: { name: string; read: boolean } | null
  jdAddOpen?: boolean
  qThinking?: boolean
  qAddOpen?: boolean
  // Review and "choose how to source".
  planMode?: "post" | "reco"
  doneMode?: "post" | "reco" | "max"
  ofMore?: boolean
  ofSel?: "max" | "pro" | "reco"
  convN?: number
  r1Slim?: boolean
  editTok?: string | null
  formView?: boolean
  planOverride?: "paid" | "free"
  planMenu?: boolean
  autoAdv?: boolean
  transit?: number
  transitId?: number
  transitKind?: "jd" | "tgt"
  transitLeft?: number
  transitSecs?: number
  pvStep?: "review" | "decide"
  tgtOpen?: boolean
  prefOpen?: boolean
}

export function initialState(): AgentState {
  return {
    stage: "start",
    note: "",
    recording: false,
    voiceIdx: 0,
    showPast: false,
    fileMsg: "",
    notice: "",
    roleKey: null,
    form: null,
    src: {},
    locks: {},
    addl: [],
    customise: false,
    nf: { label: "", type: "Text", options: "" },
    u: null,
    newMust: "",
    questions: [],
    extraF: 1,
    screening: [],
    newQ: "",
    unchecked: {},
    jdOverride: null,
    tab: "basic",
    log: [],
    showLog: false,
    chat: [],
    chatInput: "",
    thinkSteps: [],
    thinkStep: 0,
    filling: false,
    lastChange: null,
    accepted: 0,
    newLoc: "",
    newSkill: "",
    boost: false,
    linkedin: true,
    cosOpen: false,
    coCluster: "",
    instOpen: false,
    instCluster: "",
    instQuery: "",
    newInstListName: "",
    instLists: loadInstLists(),
    newCo: "",
    newListName: "",
    savedLists: loadLists(),
  }
}

type CommitOptions = {
  fields?: string[]
  src?: SourceKey
  lock?: boolean
  label?: string
  log?: string
  accepted?: boolean
  extraF?: number
  extra?: (after: number, pct: number) => Partial<AgentState>
}

type CommitResult = {
  before?: number
  after?: number
  pct?: number
  msg?: string
  locked?: boolean
}

export class AgentController extends Store<AgentState> {
  /**
   * The prototype's `props.plan` — "Paid (Pro credits)" or "Free only" —
   * which `planOverride` beats once the header switch is used.
   */
  planDefault: "paid" | "free" = "paid"
  /**
   * What the current step still needs — set as the review screen derives
   * (the prototype's `_curMissing`), read by `goNext` to refuse to move on.
   */
  private curMissing: { k: string; label: string }[] = []

  setCurMissing(missing: { k: string; label: string }[]) {
    this.curMissing = missing
  }

  private noticeTimer: ReturnType<typeof setTimeout> | null = null
  private voiceTimer: ReturnType<typeof setInterval> | null = null
  private vnTimer: ReturnType<typeof setInterval> | null = null
  private callTimer: ReturnType<typeof setInterval> | null = null
  private callWords: ReturnType<typeof setInterval> | null = null

  constructor(initial: AgentState = initialState()) {
    super(initial)
  }

  /** The role being worked on. Only call once `roleKey` is set. */
  get role() {
    return ROLES[this.state.roleKey!]
  }

  get paid() {
    const override = this.state.planOverride
    return override ? override === "paid" : this.planDefault === "paid"
  }

  /**
   * Where a notice goes. The prototype drew its own bottom-centre toast; the
   * port hands it to the app's toaster (`components/app-toaster.tsx`) so one
   * kind of confirmation looks one way. Unset, it falls back to state.
   */
  private onNotice: ((msg: string) => void) | null = null

  /** Send notices somewhere — the app's toaster — or back to state (null). */
  setNoticeHandler(handler: ((msg: string) => void) | null) {
    this.onNotice = handler
  }

  toast(msg: string) {
    if (this.onNotice) {
      this.onNotice(msg)
      return
    }
    this.setState({ notice: msg })
    if (this.noticeTimer) clearTimeout(this.noticeTimer)
    this.noticeTimer = this.later(() => this.setState({ notice: "" }), 3200)
  }

  // --- The hiring manager's voice note, and the AI call ----------------------

  vnToggle() {
    const s = this.state
    if (s.filling) return
    if (s.vn === "rec") {
      this.vnFinish()
      return
    }
    if (s.vn === "processing" || s.call) return
    const words = VNOTES[s.roleKey!].text.split(" ")
    let i = 0
    this.setState({ vn: "rec", vnText: "", vnSrc: "note" })
    this.vnTimer = this.every(() => {
      i++
      this.setState({ vnText: words.slice(0, i).join(" ") })
      if (i >= words.length) this.vnFinish()
    }, 70)
  }

  beginCall() {
    const s = this.state
    if (s.call || s.vn === "rec" || s.vn === "processing") return
    this.setState({
      call: "connecting",
      callSecs: 0,
      callText: "",
      callMin: false,
      log: s.log.concat([
        { t: "Started an AI call to capture the brief", d: "" },
      ]),
    })
    this.later(() => {
      if (this.state.call !== "connecting") return
      this.setState({ call: "live" })
      const words = VNOTES[this.state.roleKey!].text.split(" ")
      let i = 0
      this.callTimer = this.every(() => {
        this.setState((st) => ({ callSecs: (st.callSecs || 0) + 1 }))
      }, 1000)
      this.callWords = this.every(() => {
        i++
        this.setState({
          callText: words.slice(Math.max(0, i - 24), i).join(" "),
        })
        if (i >= words.length && this.callWords) {
          clearInterval(this.callWords)
          this.callWords = null
        }
      }, 160)
    }, 1500)
  }

  endCall() {
    const s = this.state
    if (!s.call) return
    if (this.callTimer) {
      clearInterval(this.callTimer)
      this.callTimer = null
    }
    if (this.callWords) {
      clearInterval(this.callWords)
      this.callWords = null
    }
    if (s.call === "connecting") {
      this.setState({ call: null })
      this.toast("Call cancelled")
      return
    }
    const full = VNOTES[s.roleKey!].text
    this.setState({
      call: "processing",
      vn: "processing",
      vnSrc: "call",
      vnText: full,
    })
    this.later(() => {
      this.setState({ call: null })
      this.vnApply()
    }, 1400)
  }

  vnFinish() {
    if (this.vnTimer) {
      clearInterval(this.vnTimer)
      this.vnTimer = null
    }
    this.setState({ vn: "processing" })
    this.later(() => this.vnApply(), 1100)
  }

  // --- Must-have / good-to-have buckets ---------------------------------------

  critKeys(): string[] {
    const s = this.state
    if (!s.u) return []
    return ["domain", "industry", "skills"].concat(
      s.u.must.map((m) => "m:" + m.t),
      s.u.deal.map((d) => "d:" + d),
      s.u.nice.map((n) => "n:" + n),
      s.addl.filter((a) => a.custom).map((a) => "a:" + a.id),
      ["co", "inst", "course", "batch", "div", "video"]
    )
  }

  bucketOf(k: string, over?: Record<string, "must" | "good">): "must" | "good" {
    const o = (over && over[k]) || (this.state.bk || {})[k]
    if (o) return o
    if (
      k === "domain" ||
      k === "industry" ||
      k === "skills" ||
      k.indexOf("m:") === 0 ||
      k.indexOf("d:") === 0
    )
      return "must"
    return "good"
  }

  bucketsFor(over?: Record<string, "must" | "good">): Buckets | null {
    const s = this.state
    if (!s.u) return null
    const b: Buckets = {}
    const ks = this.critKeys()
    ks.forEach((k) => (b[k] = this.bucketOf(k, over)))
    b._on = !!(s.revealed || {}).addl
    b._mustN = ks.filter((k) => /^(m|n|a):/.test(k) && b[k] === "must").length
    b._dealN = ks.filter((k) => k.indexOf("d:") === 0).length
    return b
  }

  /** Refresh the buckets `poolFor` reads — before every derivation. */
  syncBuckets() {
    setBuckets(this.bucketsFor())
  }

  moveCrit(k: string, to: "must" | "good", label?: string) {
    const s = this.state
    if (k.indexOf("d:") === 0) {
      this.toast(
        k === "domain"
          ? "Domain is needed to match candidates. Edit it instead."
          : "Exclusions always filter. Remove it if it doesn’t apply."
      )
      return
    }
    const prev = this.bucketOf(k)
    if (prev === to) return
    const R = this.role
    const before = poolFor(R, s.form!, s.extraF)
    const bk = Object.assign({}, s.bk || {})
    bk[k] = to
    const mid = Date.now()
    this.later(() => {
      if (this.state.lastMove && this.state.lastMove.id === mid)
        this.setState({ lastMove: null })
    }, 5000)
    this.setState({
      rmToast: null,
      bk,
      lastMove: { id: mid, k, label: label || k, to, prev, before },
      log: s.log.concat([
        {
          t:
            "Moved " +
            (label || k) +
            " to " +
            (to === "must" ? "Must have" : "Good to have"),
          d: "",
        },
      ]),
    })
  }

  removeCrit(type: "m" | "d" | "n" | "a", val: string) {
    const s = this.state
    const u = Object.assign({}, s.u!)
    let screening = s.screening,
      addl = s.addl
    if (type === "m") {
      u.must = s.u!.must.filter((x) => x.t !== val)
      screening = s.screening.filter((x) => x.key !== val)
    }
    if (type === "d") u.deal = s.u!.deal.filter((x) => x !== val)
    if (type === "n") u.nice = s.u!.nice.filter((x) => x !== val)
    if (type === "a") addl = s.addl.filter((x) => x.id !== val)
    this.setState({
      u,
      screening,
      addl,
      lastMove: null,
      log: s.log.concat([{ t: "Removed a targeting criterion", d: "" }]),
    })
  }

  revealConv() {
    this.setState({ convN: 1 })
    ;[2].forEach((n, i) =>
      this.later(() => this.setState({ convN: n }), (i + 1) * 450)
    )
  }

  vnApply() {
    const s = this.state
    const snap = { u: s.u, screening: s.screening, addl: s.addl }
    const u = Object.assign({}, s.u!, {
      must: s.u!.must.slice(),
      nice: s.u!.nice.slice(),
      deal: s.u!.deal.slice(),
    })
    const screening = s.screening.slice()
    const addl = s.addl.slice()
    const items: { t: string; where: string }[] = []
    const vk = (s.vnKeys || []).slice()
    VNOTES[s.roleKey!].fx.forEach((e) => {
      if (e.type === "must" && !u.must.some((m) => m.t === e.t)) {
        u.must.push({ t: e.t, q: e.q })
        screening.push({ t: e.q, key: e.t, on: false })
        items.push({ t: "Must-have: " + e.t, where: "Must have" })
        vk.push("m:" + e.t)
      }
      if (e.type === "nice" && u.nice.indexOf(e.v) < 0) {
        u.nice.push(e.v)
        items.push({ t: "Nice to have: " + e.v, where: "Good to have" })
        vk.push("n:" + e.v)
      }
      if (e.type === "deal" && u.deal.indexOf(e.v) < 0) {
        u.deal.push(e.v)
        items.push({
          t: "Deal-breaker: " + e.v,
          where: "Must have · exclusion",
        })
        vk.push("d:" + e.v)
      }
      if (e.type === "addl" && !addl.some((a) => a.label === e.label)) {
        const nid = "vn" + Date.now()
        addl.push({
          id: nid,
          label: e.label,
          type: "text",
          value: e.v,
          src: "you",
          isNew: true,
          custom: true,
          hint: "From your voice note",
        })
        items.push({ t: e.label + ": " + e.v, where: "Good to have" })
        vk.push("a:" + nid)
      }
    })
    if (!items.length)
      items.push({ t: "Nothing new", where: "everything was already captured" })
    this.setState({
      vn: "done",
      u,
      screening,
      addl,
      vnItems: items,
      vnSnap: snap,
      vnKeys: vk,
      log: s.log.concat([
        {
          t:
            (s.vnSrc === "call" ? "AI call" : "Voice note") +
            ": added " +
            items.length +
            " details",
          d: "",
        },
      ]),
      chat: s.chat.concat([
        {
          who: "ai",
          text:
            "Thanks, that’s useful context. I added " +
            items.length +
            " things from your " +
            (s.vnSrc === "call" ? "call" : "voice note") +
            ".",
        },
      ]),
    })
  }

  vnUndo() {
    const s = this.state
    if (!s.vnSnap) return
    this.setState({
      u: s.vnSnap.u,
      screening: s.vnSnap.screening,
      addl: s.vnSnap.addl,
      vn: "idle",
      vnText: "",
      vnItems: [],
      vnSnap: null,
      vnKeys: [],
      log: s.log.concat([{ t: "Undid voice note changes", d: "" }]),
    })
  }

  // --- Dictating the brief (a scripted demo) ---------------------------------

  toggleVoice() {
    if (this.state.recording) {
      this.stopVoice()
      return
    }
    const key = ORDER[this.state.voiceIdx % ORDER.length]
    const words = ROLES[key].voice.split(" ")
    let i = 0
    this.setState({ recording: true, note: "", voiceKey: key })
    this.voiceTimer = this.every(() => {
      i++
      this.setState({ note: words.slice(0, i).join(" ") })
      if (i >= words.length) this.stopVoice()
    }, 75)
  }

  stopVoice() {
    if (this.voiceTimer) {
      clearInterval(this.voiceTimer)
      this.voiceTimer = null
    }
    this.setState((s) => ({ recording: false, voiceIdx: s.voiceIdx + 1 }))
  }

  // --- Reading the brief -------------------------------------------------------

  buildJob(note: string): Partial<AgentState> {
    const key = detectRole(note)
    const R = ROLES[key]
    const low = note.toLowerCase()
    const src: Partial<Record<string, SourceKey>> = {}
    const locs: string[] = []
    Object.keys(CITY_ALIAS).forEach((a) => {
      if (low.indexOf(a) > -1) {
        const n = CITY_ALIAS[a]
        if (locs.indexOf(n) < 0) locs.push(n)
      }
    })
    let locations = locs.slice(0, 3)
    src.locations = locations.length ? "you" : "inferred"
    if (!locations.length) locations = [R.cities[0].n]
    const em = note.match(
      /(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*(?:yrs|years|yr|year)/i
    )
    let expMin = R.exp[0],
      expMax = R.exp[1]
    if (em) {
      expMin = Math.min(+em[1], +em[2])
      expMax = Math.max(+em[1], +em[2])
      src.exp = "you"
    } else src.exp = "inferred"
    const sm = note.match(
      /(\d{1,3})\s*(?:-|–|to)\s*(\d{1,3})\s*(?:lpa|lakhs?|l)\b/i
    )
    let salMin: number | null = null,
      salMax: number | null = null
    if (sm) {
      salMin = +sm[1]
      salMax = +sm[2]
      src.salary = "you"
    } else src.salary = "needs"
    src.title = low.indexOf(R.title.toLowerCase()) > -1 ? "you" : "inferred"
    src.company = "account"
    src.skills = "inferred"
    src.course = "none"
    src.batch = "none"
    src.video = "none"
    src.confidential = "none"
    src.hideSalary = "none"
    let diversity: string[] = []
    if (/women|female/.test(low)) {
      diversity = ["Female Candidates"]
      src.diversity = "you"
    } else src.diversity = "none"
    const confidential = low.indexOf("confidential") > -1
    if (confidential) src.confidential = "you"
    const form: AgentForm = {
      title: R.title,
      company: "Northwind Labs",
      confidential,
      locations,
      expMin,
      expMax,
      salMin,
      salMax,
      hideSalary: false,
      skills: R.skills.slice(),
      batchMin: "",
      batchMax: "",
      course: [],
      diversity,
      video: false,
      coSubs: [],
      cos: [],
      insts: [],
    }
    const u: Understood = {
      summary: R.summary,
      must: R.must.map((m) => ({ t: m.t, q: m.q })),
      nice: R.nice.slice(),
      deal: R.deal.slice(),
    }
    const qs: RoleQuestion[] = []
    if (salMax == null) {
      const m = R.median
      qs.push({
        id: "sal",
        text:
          "You didn’t mention a budget. For " +
          expMin +
          "–" +
          expMax +
          " yrs, candidates here typically expect around " +
          m +
          "L. What range should I use?",
        options: [
          {
            label: m - 10 + "–" + (m - 2) + "L",
            type: "salary",
            value: [m - 10, m - 2],
          },
          {
            label: m - 5 + "–" + (m + 5) + "L",
            type: "salary",
            value: [m - 5, m + 5],
          },
          {
            label: m + "–" + (m + 12) + "L",
            type: "salary",
            value: [m, m + 12],
          },
        ],
        answer: null,
      })
    }
    qs.push(Object.assign({}, R.roleQ, { answer: null }))
    if (!diversity.length)
      qs.push({
        id: "div",
        text: "Any diversity preference for this role?",
        options: [
          { label: "No preference", type: "none", log: "No diversity filter" },
          {
            label: "Women preferred",
            type: "diversity",
            value: "Female Candidates",
            log: "Women-preferred filter",
          },
          {
            label: "Women returning to work",
            type: "diversity",
            value: "Women Joining back the workforce",
            log: "Returning-women filter",
          },
        ],
        answer: null,
      })
    const addl: AddlField[] = [
      {
        id: "industry",
        label: "Industry",
        type: "text",
        value: R.industry,
        src: "inferred",
        hint: "Describes the company",
      },
      {
        id: "subIndustry",
        label: "Sub-industry",
        type: "text",
        value: R.subIndustry,
        src: "inferred",
        isNew: true,
        hint: "Narrows the company type",
      },
      {
        id: "domain",
        label: "Domain",
        type: "text",
        value: R.domain,
        src: "inferred",
        isNew: true,
        hint: "Describes the role’s work",
      },
      {
        id: "subDomain",
        label: "Sub-domain",
        type: "text",
        value: R.subDomain,
        src: "inferred",
        isNew: true,
        hint: "The specific specialisation",
      },
    ]
    const pool = poolFor(R, form, 1)
    const topCity = R.cities.slice().sort((a, b) => b.s - a.s)[0].n
    const youCount = Object.keys(src).filter((k) => src[k] === "you").length
    const steps: ThinkStep[] = [
      {
        t: this.state.srcJd ? "Reading your JD" : "Reading your brief",
        d:
          "Picked up " +
          (youCount + u.must.length) +
          " details: title, location, experience",
      },
      { t: "Identifying the role", d: R.title + " · skills extracted" },
      {
        t: "Scanning active talent",
        d: fmt(pool) + " active profiles match · most supply in " + topCity,
      },
      {
        t: "Benchmarking salary",
        d: salMax
          ? "Your " + salMin + "–" + salMax + "L vs median " + R.median + "L"
          : "No budget in the brief, so I’ll ask",
      },
    ]
    return {
      roleKey: key,
      coSrc: null,
      instSrc: null,
      form,
      src,
      locks: {},
      addl,
      u,
      questions: qs.slice(0, 2),
      extraF: 1,
      screening: u.must
        .map((m) => ({ t: m.q, key: m.t, on: false }))
        .concat(recScreen(form)),
      screenEnabled: true,
      jdOverride: null,
      thinkSteps: steps,
      thinkStep: 0,
      log: [],
      chat: [],
      lastChange: null,
      accepted: 0,
      tab: "basic",
      tried: false,
      phase: "basic",
      revealed: {},
      maxStep: 0,
      vn: "idle",
      vnText: "",
      vnItems: [],
      vnSnap: null,
      unchecked: {},
      boost: false,
      linkedin: true,
      showLog: false,
    }
  }

  understand() {
    const note = this.state.note.trim()
    if (!note) return
    if (this.state.recording) this.stopVoice()
    this.clearTimers()
    const job = this.buildJob(note)
    this.setState(Object.assign({ stage: "review" as const }, job))
    this.runPhase("basic", job.thinkSteps!, () => {
      const n = this.state.questions.length
      this.setState({
        chat: [
          {
            who: "ai",
            text:
              "I’ve turned your brief into a role profile. Review or edit anything you want. " +
              (n
                ? "I need " +
                  (n === 1 ? "one thing" : "two things") +
                  " from you, then continue and I’ll prepare recommendations."
                : "You stay in control: review and refine before continuing."),
          },
        ],
      })
      this.maybeTransit()
    })
  }

  basicMissing(): string[] {
    const f: Partial<AgentForm> = this.state.form || {}
    const m: string[] = []
    if (!String(f.title || "").trim()) m.push("title")
    if (!String(f.company || "").trim()) m.push("company")
    if (!(f.locations || []).length) m.push("locations")
    if (!((f.expMax ?? 0) > (f.expMin ?? 0))) m.push("exp")
    if (!(f.salMin && f.salMax && f.salMax >= f.salMin)) m.push("salary")
    if ((f.skills || []).length < 3) m.push("skills")
    return m
  }

  // --- Auto-advance between steps ---------------------------------------------

  startTransit(kind: "jd" | "tgt", logT: string) {
    const s = this.state
    const id = (s.transitId || 0) + 1
    const secs = kind === "tgt" ? 5 : 4
    this.setState({
      transit: id,
      transitKind: kind,
      transitLeft: secs,
      transitSecs: secs,
      transitId: id,
      log: s.log.concat([{ t: logT, d: "" }]),
    })
    for (let t = 1; t <= secs; t++)
      this.later(() => {
        if (this.state.transit !== id) return
        if (t < secs) this.setState({ transitLeft: secs - t })
        else this.transitGo()
      }, t * 1000)
  }

  maybeTransit() {
    const s = this.state
    if (s.autoAdv === false || s.tab !== "basic" || (s.revealed || {}).jd)
      return
    if (this.basicMissing().filter((k) => k !== "skills").length) return
    this.startTransit(
      "jd",
      "Role details complete, moving to the job description"
    )
  }

  transitGo() {
    if (!this.state.transit) return
    this.setState({ transit: 0 })
    this.goNext(true)
  }

  transitEdit() {
    const k = this.state.transitKind
    this.setState({ transit: 0 })
    this.toast(
      k === "tgt"
        ? "Staying on screening. Press Next when you’re ready."
        : "Staying on role details. Press Next when you’re ready."
    )
  }

  // --- The staged "thinking" of each step -----------------------------------

  runPhase(name: StepKey, steps: ThinkStep[], after?: () => void) {
    this.setState({
      filling: true,
      phase: name,
      thinkSteps: steps,
      thinkStep: 0,
    })
    steps.forEach((x, i) =>
      this.later(
        () =>
          this.setState((s) => ({
            thinkStep: i + 1,
            log: s.log.concat([{ t: x.t, sub: x.d, d: "", g: name }]),
          })),
        (i + 1) * STEP_MS
      )
    )
    this.later(
      () => {
        this.setState((s) => {
          const r = Object.assign({}, s.revealed)
          r[name] = true
          return { filling: false, revealed: r }
        })
        if (after) after()
      },
      steps.length * STEP_MS + 400
    )
  }

  phaseSteps(name: StepKey): ThinkStep[] {
    const s = this.state
    const R = this.role
    if (name === "addl")
      return [
        { t: "Mapping domain & sub-domain", d: R.domain + " › " + R.subDomain },
        { t: "Mapping industry", d: R.industry + " › " + R.subIndustry },
        {
          t: "Finding companies to hire from",
          d: "Suggested company clusters from similar hires",
        },
        {
          t: "Setting candidate preferences",
          d: "Course type and batch defaults",
        },
      ]
    if (name === "jd")
      return [
        {
          t: "Reading your role details & skills",
          d:
            (s.form!.skills || []).length +
            " skills · " +
            s.u!.must.length +
            " must-haves",
        },
        {
          t: "Drafting the JD",
          d: "From your title, experience, skills and must-haves",
        },
      ]
    if (name === "screen")
      return [
        {
          t: "Reading your must-haves",
          d: s.u!.must.length + " must-haves from your brief",
        },
        {
          t: "Recommending screening questions",
          d: s.screening.length + " questions to pick from",
        },
      ]
    if (name === "profiles")
      return [
        {
          t: "Searching the active pool",
          d: fmt(poolFor(R, s.form!, s.extraF)) + " candidates match",
        },
        { t: "Picking sample profiles", d: "4 closest matches, anonymised" },
      ]
    return []
  }

  focusField(k: string) {
    const id = FOCUS[k]
    if (!id) return
    this.later(() => {
      const el = document.getElementById(id)
      if (el) {
        el.focus()
        el.scrollIntoView({ block: "center", behavior: "smooth" })
      }
    }, 120)
  }

  goNext(force?: boolean) {
    const s = this.state
    if (s.filling) return
    const miss = this.curMissing
    if (miss.length) {
      this.setState({
        tried: true,
        chat: s.chat.concat([
          {
            who: "ai",
            text:
              "Before we move on I need: " +
              miss.map((m) => m.label).join(", ") +
              ".",
          },
        ]),
      })
      this.toast("Fill " + miss.map((m) => m.label).join(", ") + " to continue")
      this.focusField(miss[0].k)
      return
    }
    if (
      !force &&
      s.tab === "screen" &&
      s.autoAdv !== false &&
      !(s.revealed || {}).addl
    ) {
      this.startTransit("tgt", "Role profile ready, moving to targeting")
      return
    }
    const i = ORDER_STEPS.indexOf(s.tab)
    if (s.tab === "profiles") {
      this.setState({ stage: "preview", pvStep: "review" })
      return
    }
    const next = ORDER_STEPS[i + 1]
    const rv = s.revealed || {}
    this.setState({
      tab: next,
      tried: false,
      maxStep: Math.max(s.maxStep || 0, i + 1),
    })
    if (next === "addl" && !rv.addl) this.setState({ convN: 0 })
    if (!rv[next])
      this.runPhase(next, this.phaseSteps(next), () => {
        this.setState((st) => ({
          chat: st.chat.concat([{ who: "ai", text: PHASE_DONE[next] }]),
        }))
        if (next === "addl") {
          this.applyDefaultPrefs()
          this.revealConv()
        }
      })
  }

  applyDefaultPrefs() {
    const st = this.state
    const f0: Partial<AgentForm> = st.form || {}
    const past = loadPast()
    const pastCo =
      past && ((past.coSubs || []).length || (past.cos || []).length)
    const pastIn = past && (past.insts || []).length
    if (!st.coSrc && !(f0.coSubs || []).length && !(f0.cos || []).length) {
      if (pastCo) {
        this.commit(
          { coSubs: past.coSubs || [], cos: past.cos || [] },
          {
            fields: [],
            label: "Applied your usual companies",
            log: "Applied preferred companies from your past jobs",
          }
        )
        this.setState({ coSrc: "past" })
      } else {
        const pick = (COSUGGEST[st.roleKey!] || []).slice(0, 2)
        if (pick.length) {
          this.commit(
            { coSubs: pick },
            {
              fields: [],
              label: "Recommended companies",
              log:
                "Recommended companies based on similar hiring patterns: " +
                pick.map((x) => x.split(" › ")[1]).join(", "),
            }
          )
          this.setState({ coSrc: "ai" })
        }
      }
    }
    if (!st.instSrc && !(f0.insts || []).length && pastIn) {
      this.commit(
        { insts: past.insts },
        {
          fields: [],
          label: "Applied your usual institutes",
          log: "Applied preferred institutes from your past jobs",
        }
      )
      this.setState({ instSrc: "past" })
    }
  }

  // --- Changing the form, and how the pool moves -------------------------------

  commit(patch: Partial<AgentForm>, o: CommitOptions = {}): CommitResult {
    const s = this.state
    const R = this.role
    const extraF = o.extraF != null ? o.extraF : s.extraF
    const before = poolFor(R, s.form!, s.extraF)
    const form = Object.assign({}, s.form!, patch)
    const after = poolFor(R, form, extraF)
    const pct = before ? Math.round(((after - before) / before) * 100) : 0
    const src = Object.assign({}, s.src),
      locks = Object.assign({}, s.locks)
    ;(o.fields || []).forEach((f) => {
      if (o.src) src[f] = o.src
      if (o.lock) locks[f] = true
    })
    const next: Partial<AgentState> = { form, src, locks, extraF }
    if (o.label && after !== before) next.lastChange = { label: o.label, pct }
    if (o.log)
      next.log = s.log.concat([
        { t: o.log, d: after !== before ? pctTxt(pct) : "", g: "changes" },
      ])
    if (o.accepted) next.accepted = s.accepted + 1
    if (o.extra) Object.assign(next, o.extra(after, pct))
    this.setState(next)
    return { before, after, pct }
  }

  ai(
    field: string,
    patch: Partial<AgentForm>,
    label: string,
    extra?: CommitOptions["extra"]
  ) {
    if (this.state.filling)
      return {
        msg: "Give me a second, I’m still filling the form.",
      } as CommitResult
    if (this.state.locks[field]) {
      this.toast(FN[field] + " is locked. Unlock it to let AI change it.")
      return { locked: true } as CommitResult
    }
    return this.commit(patch, {
      fields: [field],
      src: "data",
      label,
      log: "AI: " + label,
      accepted: true,
      extra,
    })
  }

  edit(field: string, patch: Partial<AgentForm>, label?: string): CommitResult {
    if (this.state.filling) return {}
    return this.commit(patch, {
      fields: [field],
      src: "edited",
      lock: true,
      label,
    })
  }

  toggleLock(k: string) {
    this.setState((s) => {
      const locks = Object.assign({}, s.locks)
      locks[k] = !locks[k]
      return { locks }
    })
  }

  addLocation(name: string, by: "ai" | "you"): CommitResult {
    const f = this.state.form!
    if (f.locations.indexOf(name) > -1)
      return { msg: name + " is already added." }
    if (f.locations.length >= 3)
      return { msg: "You can post in up to 3 locations. Remove one first." }
    if (by === "ai")
      return this.ai(
        "locations",
        { locations: f.locations.concat([name]) },
        "Added " + name
      )
    return this.edit(
      "locations",
      { locations: f.locations.concat([name]) },
      "Added " + name
    )
  }

  widenExp() {
    const f = this.state.form!
    const a = Math.max(0, f.expMin - 1),
      b = Math.min(30, f.expMax + 2)
    return this.ai(
      "exp",
      { expMin: a, expMax: b },
      "Experience " + a + "–" + b + " yrs"
    )
  }

  marketSal() {
    const R = this.role
    const f = this.state.form!
    const mx = R.median + 2
    const mn = f.salMin ? Math.min(f.salMin, mx - 5) : R.median - 8
    return this.ai(
      "salary",
      { salMin: mn, salMax: mx },
      "Salary " + mn + "–" + mx + "L (market)"
    )
  }

  /** The panel's "ask your agent" box — a handful of commands, by keyword. */
  runCommand(text: string) {
    const t = (text || "").trim()
    if (!t) return
    const low = t.toLowerCase()
    const s = this.state
    const R = this.role
    const say = (reply: string): Partial<AgentState> => ({
      chat: this.state.chat.concat([
        { who: "you", text: t },
        { who: "ai", text: reply },
      ]),
      chatInput: "",
    })
    const done = (res: CommitResult, what: string) => {
      if (res.locked) {
        this.setState(
          say(what + ": that field is locked. Unlock it and ask again.")
        )
        return
      }
      if (res.msg) {
        this.setState(say(res.msg))
        return
      }
      this.setState(
        say(
          "Done: " +
            what +
            ". Pool " +
            pctTxt(res.pct ?? 0) +
            ", now " +
            fmt(res.after) +
            "."
        )
      )
    }
    const aliasHit = Object.keys(CITY_ALIAS).find((a) => low.indexOf(a) > -1)
    if (aliasHit && /remove|drop|delete/.test(low)) {
      const n = CITY_ALIAS[aliasHit]
      if (s.form!.locations.indexOf(n) < 0) {
        this.setState(say(n + " isn’t in the locations."))
        return
      }
      done(
        this.ai(
          "locations",
          { locations: s.form!.locations.filter((x) => x !== n) },
          "Removed " + n
        ),
        "removed " + n
      )
      return
    }
    if (aliasHit) {
      const n = CITY_ALIAS[aliasHit]
      done(this.addLocation(n, "ai"), "added " + n)
      return
    }
    if (/hide/.test(low) && /salary|ctc/.test(low)) {
      done(
        this.ai(
          "hideSalary",
          { hideSalary: true },
          "Salary hidden from candidates"
        ),
        "salary hidden from candidates (still used for matching)"
      )
      return
    }
    if (/salary|ctc|budget|market|pay/.test(low)) {
      const r = this.marketSal()
      done(r, "salary set to market (" + (R.median + 2) + "L max)")
      return
    }
    if (/widen|broaden|experience|exp\b|years/.test(low)) {
      const f = s.form!
      done(
        this.widenExp(),
        "experience widened to " +
          Math.max(0, f.expMin - 1) +
          "–" +
          Math.min(30, f.expMax + 2) +
          " yrs"
      )
      return
    }
    if (/confidential/.test(low)) {
      done(
        this.ai("confidential", { confidential: true }, "Made confidential"),
        "company name hidden from applicants"
      )
      return
    }
    if (/women|female|diversity/.test(low)) {
      done(
        this.ai(
          "diversity",
          { diversity: ["Female Candidates"] },
          "Women-preferred filter"
        ),
        "added a women-preferred filter"
      )
      return
    }
    if (/title/.test(low)) {
      const best = R.alt.slice().sort((a, b) => b.m - a.m)[0]
      done(
        this.ai("title", { title: best.t }, "Title → " + best.t),
        "title changed to “" + best.t + "”"
      )
      return
    }
    this.setState(
      say(
        "In this prototype I can change locations, experience, salary, title, confidentiality and diversity. Try “Add Pune” or “match market salary”."
      )
    )
  }

  /** An answer to one of the agent's quick questions. */
  answer(qi: number, opt: QuestionOption) {
    const s = this.state
    const qs = s.questions.map((q, i) =>
      i === qi ? Object.assign({}, q, { answer: opt.label }) : q
    )
    const left = qs.filter((x) => !x.answer).length
    const tail = left
      ? ""
      : " That’s all I needed. Review the form and preview when ready."
    const chatWith = (reply: string): ChatMessage[] =>
      s.chat.concat([
        { who: "you", text: opt.label },
        { who: "ai", text: reply + tail },
      ])
    if (opt.type === "skip") {
      this.setState({
        questions: qs,
        chat: chatWith("No problem, I’ll leave that as is."),
      })
      return
    }
    if (opt.type === "salary") {
      const [lo, hi] = opt.value as [number, number]
      this.commit(
        { salMin: lo, salMax: hi },
        {
          fields: ["salary"],
          src: "answer",
          label: "Budget " + opt.label,
          log: "You set budget " + opt.label,
          extra: (after, pct) => ({
            questions: qs,
            chat: chatWith(
              "Set the budget to " +
                opt.label +
                ". Pool " +
                pctTxt(pct) +
                ", now " +
                fmt(after) +
                "."
            ),
          }),
        }
      )
      return
    }
    if (opt.type === "diversity") {
      this.commit(
        { diversity: [opt.value as string] },
        {
          fields: ["diversity"],
          src: "answer",
          label: opt.label,
          log: "You chose: " + opt.label,
          extra: (after, pct) => ({
            questions: qs,
            chat: chatWith(
              "Added that preference. Pool " +
                pctTxt(pct) +
                ", now " +
                fmt(after) +
                "."
            ),
          }),
        }
      )
      return
    }
    if (opt.type === "extra") {
      this.commit(
        {},
        {
          extraF: opt.value as number,
          label: opt.log,
          log: "You chose: " + opt.log,
          extra: (after, pct) => ({
            questions: qs,
            chat: chatWith(
              opt.log +
                "." +
                (pct
                  ? " Pool " + pctTxt(pct) + ", now " + fmt(after) + "."
                  : "")
            ),
          }),
        }
      )
      return
    }
    if (opt.type === "nice") {
      const value = opt.value as string
      const u = Object.assign({}, s.u!, {
        nice:
          s.u!.nice.indexOf(value) > -1 ? s.u!.nice : s.u!.nice.concat([value]),
      })
      this.setState({
        questions: qs,
        u,
        log: s.log.concat([{ t: "You chose: " + opt.log, d: "" }]),
        chat: chatWith(opt.log + ". It’s in the JD as a nice-to-have."),
      })
      return
    }
    this.setState({
      questions: qs,
      log: s.log.concat([{ t: "You chose: " + (opt.log || opt.label), d: "" }]),
      chat: chatWith("Got it."),
    })
  }

  addCustomField(label: string, type: string, options: string) {
    label = (label || "").trim()
    if (!label) return
    const s = this.state
    const R = this.role
    const l = label.toLowerCase()
    if (s.addl.some((f) => f.label.toLowerCase() === l)) {
      this.toast(label + " is already a field.")
      return
    }
    let v = ""
    if (/team/.test(l)) v = R.extras.team
    else if (/report/.test(l)) v = R.extras.reports
    else if (/hire|urgen|type of/.test(l)) v = R.extras.hire
    else if (/notice/.test(l)) v = R.extras.notice
    else if (/travel/.test(l)) v = R.extras.travel
    const opts =
      type === "Dropdown"
        ? (options || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : null
    const isSel = !!(opts && opts.length)
    if (isSel && v && opts!.indexOf(v) < 0) v = ""
    const f: AddlField = {
      id: "c" + Date.now(),
      label,
      type: isSel ? "select" : "text",
      options: isSel ? ["Select"].concat(opts!) : null,
      value: v || (isSel ? "Select" : ""),
      src: v ? "inferred" : "needs",
      isNew: true,
      custom: true,
      hint: v ? "AI filled this from your brief" : "",
    }
    this.setState({
      addl: s.addl.concat([f]),
      nf: { label: "", type: "Text", options: "" },
      log: s.log.concat([
        {
          t:
            "New field “" +
            label +
            "”" +
            (v ? " filled: " + v : " added, needs your input"),
          d: "",
        },
      ]),
    })
  }

  /** The drafted JD, from the role's own lines and what the recruiter set. */
  jdFrom(s: AgentState = this.state) {
    const R = ROLES[s.roleKey!]
    const f = s.form!
    const u = s.u!
    const L: string[] = []
    L.push("About the role")
    L.push(u.summary)
    L.push("")
    L.push("What you’ll do")
    R.resp.forEach((r) => L.push("• " + r))
    L.push("")
    L.push("What we’re looking for")
    L.push("• " + f.expMin + "–" + f.expMax + " years of relevant experience")
    u.must.forEach((m) => L.push("• " + m.t))
    L.push("• Skills: " + f.skills.join(", "))
    if (u.nice.length) {
      L.push("")
      L.push("Good to have")
      u.nice.forEach((n) => L.push("• " + n))
    }
    return L.join("\n")
  }

  /** The prototype's `backToStart` — the brief screen, as it was left. */
  backToStart() {
    this.clearTimers()
    this.setState({
      stage: "start",
      note: "",
      showPast: false,
      fileMsg: "",
      filling: false,
      srcJd: false,
    })
  }

  /** Stop remembering the companies and institutes used on past jobs. */
  forgetPast() {
    const s = this.state
    clearPast()
    this.setState({
      coSrc: s.coSrc === "past" ? "edited" : s.coSrc,
      instSrc: s.instSrc === "past" ? "edited" : s.instSrc,
    })
    this.toast(
      "Done. AI won’t prefill from past jobs until you set preferences again."
    )
  }
}
