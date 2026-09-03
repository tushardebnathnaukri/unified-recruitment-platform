/**
 * Mock applicants for the job candidate pipeline, plus the filter model the
 * rail is driven by.
 *
 * ONE ROSTER, SHOWN FOR EVERY JOB. The prototype has a single candidate list
 * rather than one per posting: the page is here to test the pipeline and the
 * rail, and twenty-seven hand-written people exercise both far better than
 * eight jobs' worth of thin lists would. The consequence is that the job
 * header must not print its own applicant count — `Job.applicants` says 148 for
 * the platform role and this roster is 27, and two different numbers for the
 * same thing on one screen reads as a bug. The tabs are the only count on the
 * page, and they come from here.
 *
 * The people are platform and infrastructure engineers because that is what
 * the job at the top of the list is hiring for. Same reasoning as `JOBS`: data
 * that looks like real applications is the only kind that shows how the design
 * behaves — a 20-year veteran asking above the band, someone on a 90-day
 * notice, a strong profile with a real gap in it.
 */

/**
 * The stages a candidate moves THROUGH, in order. This is the whole point of
 * the redesign: the live product has Shortlisted / Rejected / Saved as three
 * flags on one list, so everything after the shortlist — invited, interviewed,
 * offered, joined — happens in email and WhatsApp and never comes back.
 *
 * Order is load-bearing. It sets the tab order, and `nextStage` reads it to
 * work out what a row's primary action should be.
 */
export type PipelineStage =
  "applied" | "shortlisted" | "interviewing" | "offered" | "hired"

/**
 * States that are NOT on the path. Rejected is terminal; saved is a bookmark
 * someone parked outside the funnel. They sit past a separator in the tab bar
 * for that reason — a saved candidate has not advanced, and putting a bookmark
 * in the middle of a pipeline is what made the legacy tab strip unreadable.
 */
export type TerminalStage = "rejected" | "saved"

export type Stage = PipelineStage | TerminalStage

export const PIPELINE: { value: PipelineStage; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offered", label: "Offered" },
  { value: "hired", label: "Hired" },
]

export const TERMINAL: { value: TerminalStage; label: string }[] = [
  { value: "rejected", label: "Rejected" },
  { value: "saved", label: "Saved" },
]

/** Has the recruiter looked at this person, and have they been contacted. */
export type ReviewState = "unread" | "reviewed" | "contacted"

export type InterviewMode = "video" | "in-person" | "phone"

/**
 * A scheduled interview. `when` is a display string and `bucket` is what the
 * "Scheduled" filter tests, rather than a real date: the prototype has no clock
 * to be relative to, and a hardcoded date silently goes stale the week after
 * it is written. The bucket says what the filter means and never rots.
 */
export type Interview = {
  mode: InterviewMode
  when: string
  bucket: "today" | "this-week" | "next-week" | "past"
  interviewer: string
  round: number
  ofRounds: number
  status: "awaiting" | "confirmed" | "completed"
  feedback: "due" | "submitted" | "not-required"
}

export type Candidate = {
  id: string
  name: string
  role: string
  company: string
  /** Total experience, in months, so "5y 1m" can be printed exactly. */
  tenureMonths: number
  location: string
  /** 0 means available now. Bands in the notice filter are cut off this. */
  noticeDays: number
  currentLakhs: number
  expectedLakhs: number
  education: { institute: string; qualification: string; premier: boolean }
  appliedOn: string
  /** Sort key for "Applied date". The display string above cannot be sorted. */
  appliedDaysAgo: number
  stage: Stage
  review: ReviewState
  /**
   * How well the profile answers the posting, 0–100.
   *
   * NEW, AND CURRENTLY UNSOURCED. The legacy page already ranks by "Magic Sort
   * (Relevance)" and offers Marks / Time / Accuracy sorts whose scores it never
   * shows anywhere — so the ranking exists and the recruiter cannot see it.
   * This surfaces it, together with what matched and what did not. If the real
   * product has no match signal behind it, this field and the strip that reads
   * it come out: an invented score is worse than no score.
   */
  match: number
  matchedOn: string[]
  /** The one thing this profile does not answer. `null` when nothing stands out. */
  gap: string | null
  media: {
    video: boolean
    /** Runtime of the video resume, so the row can offer it as "02:21". */
    videoSeconds?: number
    coverLetter: boolean
    certifications: boolean
  }
  tags: string[]
  interview?: Interview
  /** Why a rejected row is where it is. Kept so the decision has a record. */
  decision?: { reason: string; by: string; on: string }
  /** Offered and hired rows carry their own headline fact instead of a match. */
  outcome?: { label: string; detail: string }
}

export const CANDIDATES: Candidate[] = [
  {
    id: "c1",
    name: "Shikhar Katiyar",
    role: "Staff Engineer, Platform",
    company: "Razorpay",
    tenureMonths: 74,
    location: "Bengaluru",
    noticeDays: 30,
    currentLakhs: 62,
    expectedLakhs: 82,
    education: {
      institute: "IIT Bombay",
      qualification: "B.Tech / BE",
      premier: true,
    },
    appliedOn: "15 Oct",
    appliedDaysAgo: 3,
    stage: "applied",
    review: "unread",
    match: 92,
    matchedOn: ["Kubernetes", "Go", "Multi-tenant"],
    gap: "No on-call ownership",
    media: {
      video: true,
      videoSeconds: 141,
      coverLetter: false,
      certifications: true,
    },
    tags: ["Referred"],
  },
  {
    id: "c2",
    name: "Vaibhav Gupta",
    role: "Senior Software Engineer",
    company: "IndiaMART InterMESH",
    tenureMonths: 58,
    location: "Delhi NCR",
    noticeDays: 0,
    currentLakhs: 44,
    expectedLakhs: 60,
    education: {
      institute: "IIT Kanpur",
      qualification: "M.Tech",
      premier: true,
    },
    appliedOn: "15 Oct",
    appliedDaysAgo: 3,
    stage: "applied",
    review: "unread",
    match: 88,
    matchedOn: ["Go", "Distributed systems", "Terraform"],
    gap: "No Kubernetes at scale",
    media: { video: false, coverLetter: true, certifications: false },
    tags: [],
  },
  {
    id: "c3",
    name: "Rahul Jinwal",
    role: "Principal Engineer",
    company: "SFL Sports",
    tenureMonths: 72,
    location: "Bengaluru",
    noticeDays: 30,
    currentLakhs: 55,
    expectedLakhs: 78,
    education: {
      institute: "IIM Amritsar",
      qualification: "MBA / PGDM",
      premier: true,
    },
    appliedOn: "22 Oct",
    appliedDaysAgo: 1,
    stage: "applied",
    review: "reviewed",
    match: 84,
    matchedOn: ["Kubernetes", "Platform teams"],
    gap: "Six years against a 9–14 band",
    media: {
      video: true,
      videoSeconds: 98,
      coverLetter: true,
      certifications: false,
    },
    tags: [],
  },
  {
    id: "c4",
    name: "Bhaumik N Shah",
    role: "Engineering Manager, Infra",
    company: "Fynd",
    tenureMonths: 122,
    location: "Mumbai",
    noticeDays: 0,
    currentLakhs: 71,
    expectedLakhs: 90,
    education: {
      institute: "Rajiv Gandhi Institute of Technology",
      qualification: "B.Tech / BE",
      premier: false,
    },
    appliedOn: "15 Oct",
    appliedDaysAgo: 3,
    stage: "applied",
    review: "unread",
    match: 81,
    matchedOn: ["Kubernetes", "Cost optimisation"],
    gap: "Mostly managing, little hands-on",
    media: { video: false, coverLetter: true, certifications: true },
    tags: [],
  },
  {
    id: "c5",
    name: "Ananya Krishnan",
    role: "Senior SRE",
    company: "Flipkart",
    tenureMonths: 106,
    location: "Bengaluru",
    noticeDays: 60,
    currentLakhs: 68,
    expectedLakhs: 88,
    education: {
      institute: "NIT Trichy",
      qualification: "B.Tech / BE",
      premier: true,
    },
    appliedOn: "14 Oct",
    appliedDaysAgo: 4,
    stage: "applied",
    review: "unread",
    match: 90,
    matchedOn: ["Kubernetes", "Go", "Observability", "Incident response"],
    gap: null,
    media: {
      video: true,
      videoSeconds: 187,
      coverLetter: false,
      certifications: true,
    },
    tags: ["Referred"],
  },
  {
    id: "c6",
    name: "Devansh Mehta",
    role: "Backend Engineer III",
    company: "Zeta",
    tenureMonths: 61,
    location: "Hyderabad",
    noticeDays: 45,
    currentLakhs: 39,
    expectedLakhs: 55,
    education: {
      institute: "BITS Pilani",
      qualification: "B.Tech / BE",
      premier: true,
    },
    appliedOn: "13 Oct",
    appliedDaysAgo: 5,
    stage: "applied",
    review: "reviewed",
    match: 72,
    matchedOn: ["Go", "gRPC"],
    gap: "No infrastructure ownership",
    media: { video: false, coverLetter: false, certifications: false },
    tags: [],
  },
  {
    id: "c7",
    name: "Priyanka Sundaram",
    role: "Platform Engineer",
    company: "Postman",
    tenureMonths: 88,
    location: "Bengaluru",
    noticeDays: 30,
    currentLakhs: 58,
    expectedLakhs: 72,
    education: {
      institute: "Anna University",
      qualification: "B.Tech / BE",
      premier: false,
    },
    appliedOn: "13 Oct",
    appliedDaysAgo: 5,
    stage: "applied",
    review: "unread",
    match: 86,
    matchedOn: ["Kubernetes", "Go", "CI/CD"],
    gap: "No multi-region work",
    media: {
      video: true,
      videoSeconds: 132,
      coverLetter: true,
      certifications: false,
    },
    tags: [],
  },
  {
    id: "c8",
    name: "Karthik Rangan",
    role: "Lead Engineer, Cloud",
    company: "Freshworks",
    tenureMonths: 141,
    location: "Chennai",
    noticeDays: 90,
    currentLakhs: 82,
    expectedLakhs: 105,
    education: {
      institute: "IIT Madras",
      qualification: "M.Tech",
      premier: true,
    },
    appliedOn: "12 Oct",
    appliedDaysAgo: 6,
    stage: "applied",
    review: "unread",
    match: 89,
    matchedOn: ["Kubernetes", "Go", "Multi-tenant", "Cost optimisation"],
    gap: "Asking above the band",
    media: { video: false, coverLetter: true, certifications: true },
    tags: [],
  },
  {
    id: "c9",
    name: "Sneha Bhattacharya",
    role: "Senior Software Engineer",
    company: "Swiggy",
    tenureMonths: 79,
    location: "Bengaluru",
    noticeDays: 0,
    currentLakhs: 51,
    expectedLakhs: 66,
    education: {
      institute: "Jadavpur University",
      qualification: "B.Tech / BE",
      premier: false,
    },
    appliedOn: "11 Oct",
    appliedDaysAgo: 7,
    stage: "applied",
    review: "contacted",
    match: 78,
    matchedOn: ["Go", "Kafka"],
    gap: "Kubernetes only as a user",
    media: {
      video: true,
      videoSeconds: 76,
      coverLetter: false,
      certifications: false,
    },
    tags: ["Callback"],
  },
  {
    id: "c10",
    name: "Aman Tiwari",
    role: "DevOps Lead",
    company: "Dream11",
    tenureMonths: 115,
    location: "Mumbai",
    noticeDays: 60,
    currentLakhs: 64,
    expectedLakhs: 84,
    education: {
      institute: "VJTI Mumbai",
      qualification: "B.Tech / BE",
      premier: false,
    },
    appliedOn: "11 Oct",
    appliedDaysAgo: 7,
    stage: "applied",
    review: "unread",
    match: 83,
    matchedOn: ["Kubernetes", "Terraform", "Incident response"],
    gap: "Little Go",
    media: { video: false, coverLetter: false, certifications: true },
    tags: [],
  },
  {
    id: "c11",
    name: "Ritika Nair",
    role: "Software Engineer II",
    company: "Atlassian",
    tenureMonths: 43,
    location: "Bengaluru",
    noticeDays: 30,
    currentLakhs: 36,
    expectedLakhs: 52,
    education: {
      institute: "IIIT Hyderabad",
      qualification: "B.Tech / BE",
      premier: true,
    },
    appliedOn: "10 Oct",
    appliedDaysAgo: 8,
    stage: "applied",
    review: "unread",
    match: 64,
    matchedOn: ["Go"],
    gap: "Under the experience band",
    media: {
      video: true,
      videoSeconds: 205,
      coverLetter: false,
      certifications: false,
    },
    tags: [],
  },
  {
    id: "c12",
    name: "Joseph Mathew",
    role: "Staff SRE",
    company: "Gojek",
    tenureMonths: 158,
    location: "Remote",
    noticeDays: 45,
    currentLakhs: 88,
    expectedLakhs: 110,
    education: {
      institute: "College of Engineering Trivandrum",
      qualification: "B.Tech / BE",
      premier: false,
    },
    appliedOn: "9 Oct",
    appliedDaysAgo: 9,
    stage: "applied",
    review: "reviewed",
    match: 80,
    matchedOn: ["Kubernetes", "Observability", "Multi-tenant"],
    gap: "Well above the band on both",
    media: { video: false, coverLetter: true, certifications: true },
    tags: [],
  },
  {
    id: "c13",
    name: "Nikhil Agarwal",
    role: "Backend Engineer",
    company: "Meesho",
    tenureMonths: 52,
    location: "Bengaluru",
    noticeDays: 90,
    currentLakhs: 33,
    expectedLakhs: 48,
    education: {
      institute: "Delhi Technological University",
      qualification: "B.Tech / BE",
      premier: false,
    },
    appliedOn: "8 Oct",
    appliedDaysAgo: 10,
    stage: "applied",
    review: "unread",
    match: 58,
    matchedOn: ["Go"],
    gap: "No platform experience",
    media: { video: false, coverLetter: false, certifications: false },
    tags: [],
  },
  {
    id: "c14",
    name: "Meera Iyer",
    role: "Infrastructure Engineer",
    company: "Zerodha",
    tenureMonths: 97,
    location: "Bengaluru",
    noticeDays: 0,
    currentLakhs: 60,
    expectedLakhs: 75,
    education: {
      institute: "PSG College of Technology",
      qualification: "B.Tech / BE",
      premier: false,
    },
    appliedOn: "8 Oct",
    appliedDaysAgo: 10,
    stage: "applied",
    review: "reviewed",
    match: 87,
    matchedOn: ["Kubernetes", "Go", "Bare metal"],
    gap: null,
    media: {
      video: true,
      videoSeconds: 119,
      coverLetter: true,
      certifications: false,
    },
    tags: ["Callback"],
  },

  {
    id: "c15",
    name: "Arjun Deshpande",
    role: "Senior Platform Engineer",
    company: "PhonePe",
    tenureMonths: 112,
    location: "Bengaluru",
    noticeDays: 30,
    currentLakhs: 70,
    expectedLakhs: 92,
    education: {
      institute: "IIT Kharagpur",
      qualification: "B.Tech / BE",
      premier: true,
    },
    appliedOn: "6 Oct",
    appliedDaysAgo: 12,
    stage: "shortlisted",
    review: "reviewed",
    match: 94,
    matchedOn: ["Kubernetes", "Go", "Multi-tenant", "Observability"],
    gap: null,
    media: {
      video: true,
      videoSeconds: 163,
      coverLetter: true,
      certifications: true,
    },
    tags: ["Referred"],
  },
  {
    id: "c16",
    name: "Farheen Qureshi",
    role: "Staff Engineer",
    company: "CRED",
    tenureMonths: 129,
    location: "Bengaluru",
    noticeDays: 60,
    currentLakhs: 79,
    expectedLakhs: 98,
    education: {
      institute: "IIT Roorkee",
      qualification: "B.Tech / BE",
      premier: true,
    },
    appliedOn: "6 Oct",
    appliedDaysAgo: 12,
    stage: "shortlisted",
    review: "contacted",
    match: 91,
    matchedOn: ["Kubernetes", "Go", "Security"],
    gap: "Two-month notice",
    media: { video: false, coverLetter: true, certifications: false },
    tags: [],
  },
  {
    id: "c17",
    name: "Vikrant Chaudhary",
    role: "Cloud Architect",
    company: "Tata 1mg",
    tenureMonths: 134,
    location: "Gurugram",
    noticeDays: 30,
    currentLakhs: 74,
    expectedLakhs: 95,
    education: {
      institute: "NIT Kurukshetra",
      qualification: "M.Tech",
      premier: true,
    },
    appliedOn: "5 Oct",
    appliedDaysAgo: 13,
    stage: "shortlisted",
    review: "reviewed",
    match: 85,
    matchedOn: ["Kubernetes", "Terraform", "Cost optimisation"],
    gap: "Architecture over delivery",
    media: {
      video: true,
      videoSeconds: 91,
      coverLetter: false,
      certifications: true,
    },
    tags: [],
  },
  {
    id: "c18",
    name: "Lakshmi Prasad",
    role: "Senior SRE",
    company: "Navi",
    tenureMonths: 101,
    location: "Bengaluru",
    noticeDays: 0,
    currentLakhs: 63,
    expectedLakhs: 80,
    education: {
      institute: "IIIT Bangalore",
      qualification: "M.Tech",
      premier: true,
    },
    appliedOn: "4 Oct",
    appliedDaysAgo: 14,
    stage: "shortlisted",
    review: "reviewed",
    match: 88,
    matchedOn: ["Kubernetes", "Incident response", "Go"],
    gap: null,
    media: { video: false, coverLetter: true, certifications: false },
    tags: ["Callback"],
  },

  {
    id: "c19",
    name: "Deepak Arya",
    role: "Senior Platform Engineer",
    company: "Swiggy",
    tenureMonths: 118,
    location: "Bengaluru",
    noticeDays: 30,
    currentLakhs: 76,
    expectedLakhs: 96,
    education: {
      institute: "IIT Delhi",
      qualification: "B.Tech / BE",
      premier: true,
    },
    appliedOn: "1 Oct",
    appliedDaysAgo: 17,
    stage: "interviewing",
    review: "contacted",
    match: 91,
    matchedOn: ["Kubernetes", "Go", "Multi-tenant"],
    gap: null,
    media: {
      video: true,
      videoSeconds: 148,
      coverLetter: true,
      certifications: true,
    },
    tags: ["Referred"],
    interview: {
      mode: "video",
      when: "Thu 4 Sep, 3:00 PM",
      bucket: "this-week",
      interviewer: "Priya Nair",
      round: 1,
      ofRounds: 2,
      status: "confirmed",
      feedback: "not-required",
    },
  },
  {
    id: "c20",
    name: "Utkarsh Trivedi",
    role: "Staff Engineer, Infra",
    company: "CRED",
    tenureMonths: 104,
    location: "Bengaluru",
    noticeDays: 60,
    currentLakhs: 72,
    expectedLakhs: 90,
    education: {
      institute: "IIM Bangalore",
      qualification: "MBA / PGDM",
      premier: true,
    },
    appliedOn: "30 Sep",
    appliedDaysAgo: 18,
    stage: "interviewing",
    review: "contacted",
    match: 87,
    matchedOn: ["Kubernetes", "Go"],
    gap: "Two-month notice",
    media: { video: false, coverLetter: true, certifications: false },
    tags: [],
    interview: {
      mode: "in-person",
      when: "Fri 5 Sep, 11:00 AM",
      bucket: "this-week",
      interviewer: "Arjun Rao",
      round: 1,
      ofRounds: 2,
      status: "awaiting",
      feedback: "not-required",
    },
  },
  {
    id: "c21",
    name: "Sartaz Singh",
    role: "Senior Infrastructure Engineer",
    company: "PhonePe",
    tenureMonths: 110,
    location: "Pune",
    noticeDays: 30,
    currentLakhs: 66,
    expectedLakhs: 86,
    education: {
      institute: "NIT Trichy",
      qualification: "B.Tech / BE",
      premier: true,
    },
    appliedOn: "28 Sep",
    appliedDaysAgo: 20,
    stage: "interviewing",
    review: "contacted",
    match: 83,
    matchedOn: ["Kubernetes", "Terraform"],
    gap: "Little Go in production",
    media: {
      video: true,
      videoSeconds: 172,
      coverLetter: false,
      certifications: true,
    },
    tags: [],
    interview: {
      mode: "video",
      when: "Mon 1 Sep, 2:00 PM",
      bucket: "past",
      interviewer: "Priya Nair",
      round: 1,
      ofRounds: 2,
      status: "completed",
      feedback: "due",
    },
  },

  {
    id: "c22",
    name: "Neha Raghavan",
    role: "Principal SRE",
    company: "Groww",
    tenureMonths: 147,
    location: "Bengaluru",
    noticeDays: 30,
    currentLakhs: 84,
    expectedLakhs: 104,
    education: {
      institute: "IIT Guwahati",
      qualification: "B.Tech / BE",
      premier: true,
    },
    appliedOn: "20 Sep",
    appliedDaysAgo: 28,
    stage: "offered",
    review: "contacted",
    match: 95,
    matchedOn: ["Kubernetes", "Go", "Multi-tenant", "Observability"],
    gap: null,
    media: {
      video: true,
      videoSeconds: 107,
      coverLetter: true,
      certifications: true,
    },
    tags: ["Referred"],
    outcome: { label: "Offer sent", detail: "₹1.02 Cr fixed · sent 2 Sep" },
  },
  {
    id: "c23",
    name: "Imran Sheikh",
    role: "Lead Platform Engineer",
    company: "Porter",
    tenureMonths: 126,
    location: "Bengaluru",
    noticeDays: 0,
    currentLakhs: 73,
    expectedLakhs: 90,
    education: {
      institute: "IIT Bombay",
      qualification: "M.Tech",
      premier: true,
    },
    appliedOn: "12 Sep",
    appliedDaysAgo: 36,
    stage: "hired",
    review: "contacted",
    match: 93,
    matchedOn: ["Kubernetes", "Go", "Multi-tenant"],
    gap: null,
    media: { video: false, coverLetter: true, certifications: true },
    tags: [],
    outcome: { label: "Joining", detail: "Accepted · starts 1 Oct" },
  },

  {
    id: "c24",
    name: "Rohit Bansal",
    role: "Software Engineer",
    company: "Paytm",
    tenureMonths: 34,
    location: "Noida",
    noticeDays: 90,
    currentLakhs: 24,
    expectedLakhs: 40,
    education: {
      institute: "Amity University",
      qualification: "B.Tech / BE",
      premier: false,
    },
    appliedOn: "14 Oct",
    appliedDaysAgo: 4,
    stage: "rejected",
    review: "reviewed",
    match: 41,
    matchedOn: [],
    gap: "Three years against a 9–14 band",
    media: { video: false, coverLetter: false, certifications: false },
    tags: [],
    decision: {
      reason: "Well under the experience band",
      by: "Priya Nair",
      on: "15 Oct",
    },
  },
  {
    id: "c25",
    name: "Sana Kulkarni",
    role: "Senior Backend Engineer",
    company: "Udaan",
    tenureMonths: 92,
    location: "Bengaluru",
    noticeDays: 90,
    currentLakhs: 57,
    expectedLakhs: 95,
    education: {
      institute: "COEP Pune",
      qualification: "B.Tech / BE",
      premier: false,
    },
    appliedOn: "12 Oct",
    appliedDaysAgo: 6,
    stage: "rejected",
    review: "reviewed",
    match: 74,
    matchedOn: ["Go", "Kafka"],
    gap: "Asking 66% over current",
    media: {
      video: true,
      videoSeconds: 194,
      coverLetter: false,
      certifications: false,
    },
    tags: [],
    decision: {
      reason: "Expectation outside the band",
      by: "Arjun Rao",
      on: "13 Oct",
    },
  },
  {
    id: "c26",
    name: "Tarun Vasudevan",
    role: "DevOps Engineer",
    company: "Wipro",
    tenureMonths: 68,
    location: "Chennai",
    noticeDays: 90,
    currentLakhs: 21,
    expectedLakhs: 42,
    education: {
      institute: "SRM University",
      qualification: "B.Tech / BE",
      premier: false,
    },
    appliedOn: "10 Oct",
    appliedDaysAgo: 8,
    stage: "rejected",
    review: "reviewed",
    match: 52,
    matchedOn: ["Terraform"],
    gap: "Services background, no product platform",
    media: { video: false, coverLetter: true, certifications: true },
    tags: [],
    decision: {
      reason: "No product platform experience",
      by: "Priya Nair",
      on: "11 Oct",
    },
  },

  {
    id: "c27",
    name: "Gauri Sathe",
    role: "Engineering Manager, Platform",
    company: "Slice",
    tenureMonths: 152,
    location: "Pune",
    noticeDays: 60,
    currentLakhs: 86,
    expectedLakhs: 108,
    education: {
      institute: "IIT Bombay",
      qualification: "MBA / PGDM",
      premier: true,
    },
    appliedOn: "7 Oct",
    appliedDaysAgo: 11,
    stage: "saved",
    review: "reviewed",
    match: 79,
    matchedOn: ["Kubernetes", "Platform teams"],
    gap: "Manager, not an IC role",
    media: {
      video: true,
      videoSeconds: 141,
      coverLetter: true,
      certifications: false,
    },
    tags: ["Future role"],
  },
  {
    id: "c28",
    name: "Harsh Vardhan",
    role: "Senior Engineer, Networking",
    company: "Juniper Networks",
    tenureMonths: 138,
    location: "Bengaluru",
    noticeDays: 45,
    currentLakhs: 77,
    expectedLakhs: 94,
    education: {
      institute: "IIT Kanpur",
      qualification: "M.Tech",
      premier: true,
    },
    appliedOn: "3 Oct",
    appliedDaysAgo: 15,
    stage: "saved",
    review: "reviewed",
    match: 76,
    matchedOn: ["Bare metal", "Observability"],
    gap: "Networking depth, less Kubernetes",
    media: { video: false, coverLetter: false, certifications: true },
    tags: ["Future role"],
  },
]

/* -------------------------------------------------------------------------
 * Formatters. One each, so the same fact cannot render two ways on one row —
 * the legacy page prints "6y 6m" in the list and "6 years" in the profile.
 * ---------------------------------------------------------------------- */

export function formatTenure(months: number) {
  return `${Math.floor(months / 12)}y ${months % 12}m`
}

export function formatNotice(days: number) {
  if (days === 0) return "Immediately available"
  const months = Math.round(days / 30)
  return months === 1 ? "1 month notice" : `${months} months notice`
}

/**
 * Indian salary conventions: lakhs until a crore, then crores to two places.
 * Stored as lakhs throughout so the two never have to be reconciled.
 */
export function formatSalary(lakhs: number) {
  return lakhs >= 100 ? `₹${(lakhs / 100).toFixed(2)} Cr` : `₹${lakhs}L`
}

export function formatPay(candidate: Candidate) {
  return `${formatSalary(candidate.currentLakhs)} → ${formatSalary(
    candidate.expectedLakhs
  )}`
}

/** The stage after this one, or `null` at the end of the pipeline. */
export function nextStage(stage: Stage): PipelineStage | null {
  const at = PIPELINE.findIndex((entry) => entry.value === stage)
  if (at === -1) return null
  return PIPELINE[at + 1]?.value ?? null
}

export function stageLabel(stage: Stage) {
  return (
    [...PIPELINE, ...TERMINAL].find((entry) => entry.value === stage)?.label ??
    stage
  )
}

/* -------------------------------------------------------------------------
 * Filter model
 *
 * Every option carries its own predicate. That is what lets one function do
 * the filtering AND the per-option counts, so a count can never disagree with
 * the list it is counting — the failure mode where a facet promises 94 rows
 * and hands back 71.
 *
 * Within a facet the selected options are OR'd; across facets they are AND'd.
 * That is what people expect from this shape of rail, and it is why the notice
 * bands below are cut so they do not overlap: with OR inside a facet, an
 * "up to 1 month" that also swallowed "immediately available" would make the
 * two counts add up to more than the rows on screen.
 * ---------------------------------------------------------------------- */

export type FacetOption = {
  value: string
  label: string
  test: (candidate: Candidate) => boolean
}

export type Facet = {
  id: string
  label: string
  /** Open on first paint. Only the first few are — the rest are one click. */
  defaultOpen: boolean
  options: FacetOption[]
  /**
   * Set when the facet is behind a paid tier. It renders as a locked row with
   * this badge and never opens, rather than being hidden: a recruiter who
   * cannot filter by it should still be able to see that it exists.
   */
  lockedBadge?: string
}

/**
 * Options for a facet whose values come out of the roster rather than being
 * enumerated — locations, companies, interviewers, tags.
 *
 * Built against the WHOLE roster, not the filtered list, so options do not
 * vanish underneath the pointer as filters are applied. Only the counts move.
 */
function derived(
  id: string,
  label: string,
  valuesOf: (candidate: Candidate) => string[],
  limit: number
): Facet {
  const counts = new Map<string, number>()
  for (const candidate of CANDIDATES)
    for (const value of valuesOf(candidate))
      counts.set(value, (counts.get(value) ?? 0) + 1)

  const options = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => ({
      value,
      label: value,
      test: (candidate: Candidate) => valuesOf(candidate).includes(value),
    }))

  return { id, label, defaultOpen: false, options }
}

const REVIEW_FACET: Facet = {
  id: "review",
  label: "Review state",
  defaultOpen: true,
  options: [
    { value: "unread", label: "Unread", test: (c) => c.review === "unread" },
    {
      value: "reviewed",
      label: "Reviewed",
      test: (c) => c.review === "reviewed",
    },
    {
      value: "contacted",
      label: "Contacted",
      test: (c) => c.review === "contacted",
    },
  ],
}

const MATCH_FACET: Facet = {
  id: "match",
  label: "Match",
  defaultOpen: true,
  options: [
    {
      value: "strong",
      label: "Strong · 85% and up",
      test: (c) => c.match >= 85,
    },
    {
      value: "good",
      label: "Good · 65–84%",
      test: (c) => c.match >= 65 && c.match < 85,
    },
    {
      value: "partial",
      label: "Partial · under 65%",
      test: (c) => c.match < 65,
    },
  ],
}

const NOTICE_FACET: Facet = {
  id: "notice",
  label: "Notice period",
  defaultOpen: true,
  options: [
    {
      value: "now",
      label: "Immediately available",
      test: (c) => c.noticeDays === 0,
    },
    {
      value: "1m",
      label: "Up to 1 month",
      test: (c) => c.noticeDays > 0 && c.noticeDays <= 30,
    },
    {
      value: "2m",
      label: "1 – 2 months",
      test: (c) => c.noticeDays > 30 && c.noticeDays <= 60,
    },
    {
      value: "3m",
      label: "2 – 3 months",
      test: (c) => c.noticeDays > 60 && c.noticeDays <= 90,
    },
    {
      value: "3m+",
      label: "3 months or more",
      test: (c) => c.noticeDays > 90,
    },
  ],
}

/**
 * THE BRAND FAULT LINE. Premier-institute filtering is an iimjobs idea —
 * IIM/IIT/ISB pedigree is what its recruiters screen on, and the legacy
 * profile carries CAT percentile, IIT-JEE rank and GMAT score as first-class
 * fields. hirist screens on stack.
 *
 * It stays one facet with a neutral name rather than becoming
 * `if (brand === "iimjobs")` in a component, per the rule in CLAUDE.md. If the
 * two products really need different attributes here, that is a product
 * divergence for the design team to settle, not something to absorb in code.
 */
const EDUCATION_FACET: Facet = {
  id: "education",
  label: "Education",
  defaultOpen: false,
  options: [
    {
      value: "premier",
      label: "Premier institute",
      test: (c) => c.education.premier,
    },
    {
      value: "mba",
      label: "MBA / PGDM",
      test: (c) => c.education.qualification === "MBA / PGDM",
    },
    {
      value: "mtech",
      label: "M.Tech",
      test: (c) => c.education.qualification === "M.Tech",
    },
    {
      value: "btech",
      label: "B.Tech / BE",
      test: (c) => c.education.qualification === "B.Tech / BE",
    },
  ],
}

const MEDIA_FACET: Facet = {
  id: "media",
  label: "Profile & media",
  defaultOpen: false,
  options: [
    {
      value: "video",
      label: "Has video resume",
      test: (c) => c.media.video,
    },
    {
      value: "cover",
      label: "Has cover letter",
      test: (c) => c.media.coverLetter,
    },
    {
      value: "certs",
      label: "Has certifications",
      test: (c) => c.media.certifications,
    },
  ],
}

/**
 * Present but locked. The live product gates this behind Maven and the filter
 * is a real, deliberate DEI sourcing feature — which is a different thing from
 * the legacy profile printing marital status and age as plain fields, and the
 * two should not be confused when this page is designed out.
 */
const DIVERSITY_FACET: Facet = {
  id: "diversity",
  label: "Diversity",
  defaultOpen: false,
  options: [],
  lockedBadge: "Maven",
}

const INTERVIEW_STATUS_FACET: Facet = {
  id: "interview-status",
  label: "Interview status",
  defaultOpen: true,
  options: [
    {
      value: "awaiting",
      label: "Awaiting response",
      test: (c) => c.interview?.status === "awaiting",
    },
    {
      value: "confirmed",
      label: "Confirmed",
      test: (c) => c.interview?.status === "confirmed",
    },
    {
      value: "completed",
      label: "Completed",
      test: (c) => c.interview?.status === "completed",
    },
  ],
}

const INTERVIEW_MODE_FACET: Facet = {
  id: "interview-mode",
  label: "Mode",
  defaultOpen: true,
  options: [
    {
      value: "video",
      label: "Video",
      test: (c) => c.interview?.mode === "video",
    },
    {
      value: "in-person",
      label: "Face to face",
      test: (c) => c.interview?.mode === "in-person",
    },
    {
      value: "phone",
      label: "Telephonic",
      test: (c) => c.interview?.mode === "phone",
    },
  ],
}

const SCHEDULED_FACET: Facet = {
  id: "scheduled",
  label: "Scheduled",
  defaultOpen: true,
  options: [
    {
      value: "today",
      label: "Today",
      test: (c) => c.interview?.bucket === "today",
    },
    {
      value: "this-week",
      label: "This week",
      test: (c) => c.interview?.bucket === "this-week",
    },
    {
      value: "next-week",
      label: "Next week",
      test: (c) => c.interview?.bucket === "next-week",
    },
    {
      value: "past",
      label: "In the past",
      test: (c) => c.interview?.bucket === "past",
    },
  ],
}

const FEEDBACK_FACET: Facet = {
  id: "feedback",
  label: "Feedback",
  defaultOpen: true,
  options: [
    {
      value: "due",
      label: "Due",
      test: (c) => c.interview?.feedback === "due",
    },
    {
      value: "submitted",
      label: "Submitted",
      test: (c) => c.interview?.feedback === "submitted",
    },
    {
      value: "not-required",
      label: "Not required",
      test: (c) => c.interview?.feedback === "not-required",
    },
  ],
}

const LOCATION_FACET = derived(
  "location",
  "Current location",
  (c) => [c.location],
  8
)
const COMPANY_FACET = derived(
  "company",
  "Current company",
  (c) => [c.company],
  8
)
const TAGS_FACET = derived("tags", "Tags", (c) => c.tags, 8)
const INTERVIEWER_FACET = derived(
  "interviewer",
  "Interviewer",
  (c) => (c.interview ? [c.interview.interviewer] : []),
  8
)

/**
 * THE FACETS CHANGE WITH THE STAGE. This is the argument for putting the
 * pipeline in tabs rather than leaving it as flags: at Applied the question is
 * who is worth a look, so the rail is review state, match and notice; at
 * Interviewing the question is what is on the calendar and what is overdue, and
 * filtering scheduled interviews by notice period is noise.
 *
 * A rejected row's review state is not a live question either, so the decided
 * stages get the narrower set.
 */
export function facetsForStage(stage: Stage): Facet[] {
  switch (stage) {
    case "interviewing":
      return [
        INTERVIEW_STATUS_FACET,
        FEEDBACK_FACET,
        SCHEDULED_FACET,
        INTERVIEW_MODE_FACET,
        INTERVIEWER_FACET,
        MATCH_FACET,
        LOCATION_FACET,
        TAGS_FACET,
      ]
    case "offered":
    case "hired":
    case "rejected":
      return [
        MATCH_FACET,
        LOCATION_FACET,
        EDUCATION_FACET,
        COMPANY_FACET,
        TAGS_FACET,
      ]
    default:
      return [
        REVIEW_FACET,
        MATCH_FACET,
        NOTICE_FACET,
        LOCATION_FACET,
        EDUCATION_FACET,
        COMPANY_FACET,
        MEDIA_FACET,
        TAGS_FACET,
        DIVERSITY_FACET,
      ]
  }
}

/**
 * Experience is a range rather than bands because the posting itself is one —
 * the recruiter is looking at a 9–14 job and wants to see who sits inside it.
 * Bands would make that two clicks and an approximation.
 *
 * Held as strings so the inputs can be empty, which is a real state: "9 and up"
 * is a filter people want, and a number field cannot express it.
 */
export type Filters = {
  facets: Record<string, string[]>
  minYears: string
  maxYears: string
}

export const NO_FILTERS: Filters = { facets: {}, minYears: "", maxYears: "" }

function withinExperience(candidate: Candidate, filters: Filters) {
  const years = candidate.tenureMonths / 12
  const min = Number(filters.minYears)
  const max = Number(filters.maxYears)
  if (filters.minYears !== "" && !Number.isNaN(min) && years < min) return false
  if (filters.maxYears !== "" && !Number.isNaN(max) && years > max) return false
  return true
}

export function matchesFilters(
  candidate: Candidate,
  facets: Facet[],
  filters: Filters
) {
  for (const facet of facets) {
    const chosen = filters.facets[facet.id] ?? []
    if (chosen.length === 0) continue
    const selected = facet.options.filter((o) => chosen.includes(o.value))
    if (!selected.some((o) => o.test(candidate))) return false
  }
  return withinExperience(candidate, filters)
}

/**
 * Per-option counts, each computed with every OTHER facet applied.
 *
 * The cheaper thing is to count against the stage's whole list, and it lies the
 * moment two filters are on: it offers you a "Bengaluru 14" that turns into
 * four rows because you already filtered to unread. Counting cross-filtered
 * means every number on the rail is the number of rows you would get by
 * ticking it. A facet does not cross-filter against itself, or ticking one
 * option would zero the ones beside it.
 */
export function facetCounts(
  candidates: Candidate[],
  facets: Facet[],
  filters: Filters
) {
  const counts: Record<string, Record<string, number>> = {}

  for (const facet of facets) {
    const others = { ...filters, facets: { ...filters.facets, [facet.id]: [] } }
    const pool = candidates.filter((c) => matchesFilters(c, facets, others))
    counts[facet.id] = Object.fromEntries(
      facet.options.map((o) => [o.value, pool.filter(o.test).length])
    )
  }

  return counts
}

/**
 * Every applied filter as a removable chip, so the gap between "68" and "414"
 * always has a visible reason. The experience range is one chip rather than
 * two: it reads as a single constraint and it is cleared as one.
 */
export function activeChips(facets: Facet[], filters: Filters) {
  const chips: {
    key: string
    label: string
    facetId: string
    value: string
  }[] = []

  for (const facet of facets)
    for (const value of filters.facets[facet.id] ?? []) {
      const option = facet.options.find((o) => o.value === value)
      if (!option) continue
      chips.push({
        key: `${facet.id}:${value}`,
        label: `${facet.label}: ${option.label}`,
        facetId: facet.id,
        value,
      })
    }

  if (filters.minYears !== "" || filters.maxYears !== "") {
    const min = filters.minYears === "" ? "any" : filters.minYears
    const max = filters.maxYears === "" ? "any" : filters.maxYears
    chips.push({
      key: "experience",
      label: `Experience: ${min} – ${max} yrs`,
      facetId: "experience",
      value: "",
    })
  }

  return chips
}

export function countFilters(facets: Facet[], filters: Filters) {
  return activeChips(facets, filters).length
}

/* -------------------------------------------------------------------------
 * Sorting
 * ---------------------------------------------------------------------- */

export type Sort =
  "match" | "recent" | "exp-desc" | "exp-asc" | "notice" | "interview"

const SORT_LABELS: Record<Sort, string> = {
  match: "Best match",
  recent: "Applied date",
  "exp-desc": "Experience: high to low",
  "exp-asc": "Experience: low to high",
  notice: "Notice period",
  interview: "Interview date",
}

/**
 * Interviewing leads with the calendar, everything else with the match. Same
 * reasoning as the facets: the question the stage is asking changes, so the
 * default answer to "what order?" changes with it.
 */
export function sortsForStage(stage: Stage): { value: Sort; label: string }[] {
  const values: Sort[] =
    stage === "interviewing"
      ? ["interview", "match", "exp-desc", "exp-asc"]
      : ["match", "recent", "exp-desc", "exp-asc", "notice"]

  return values.map((value) => ({ value, label: SORT_LABELS[value] }))
}

export function defaultSortFor(stage: Stage): Sort {
  return sortsForStage(stage)[0].value
}

const BUCKET_ORDER = { past: 0, today: 1, "this-week": 2, "next-week": 3 }

export function compareBy(sort: Sort) {
  return (a: Candidate, b: Candidate) => {
    switch (sort) {
      case "match":
        return b.match - a.match
      case "recent":
        return a.appliedDaysAgo - b.appliedDaysAgo
      case "exp-desc":
        return b.tenureMonths - a.tenureMonths
      case "exp-asc":
        return a.tenureMonths - b.tenureMonths
      case "notice":
        return a.noticeDays - b.noticeDays
      case "interview":
        return (
          (a.interview ? BUCKET_ORDER[a.interview.bucket] : 99) -
          (b.interview ? BUCKET_ORDER[b.interview.bucket] : 99)
        )
    }
  }
}

/**
 * Free-text search. Deliberately across name, role, company, matched skills and
 * institute rather than name alone: the legacy field is labelled "Search
 * keyword or candidates" and does not say which, so a recruiter typing
 * "Kubernetes" gets nothing and has no way to tell whether that means nobody
 * matched or that it only searches names.
 */
export function matchesSearch(candidate: Candidate, query: string) {
  const q = query.trim().toLowerCase()
  if (q === "") return true
  return [
    candidate.name,
    candidate.role,
    candidate.company,
    candidate.education.institute,
    candidate.education.qualification,
    ...candidate.matchedOn,
    ...candidate.tags,
  ].some((field) => field.toLowerCase().includes(q))
}

/** "02:21", the shape the reference card offers a video resume in. */
export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(
    2,
    "0"
  )}`
}
