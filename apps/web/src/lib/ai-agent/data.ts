/**
 * THE AI AGENT V2.3 PROTOTYPE'S DATA AND PURE RULES, ported as written.
 *
 * Source: a peer's single-file prototype, "AI Job Posting Prototype – V2.3.1
 * — Your iimjobs AI Agent". Everything here is that file's own canned data —
 * four sample roles, their pools, cities, clusters, institutes and copy — and
 * the rules that read it (`detectRole`, `poolFor`, `fmt`). Values and words are
 * kept verbatim so the variant shows the peer's design rather than ours; only
 * types were added, and the inline-style constants (tag colours, shimmer)
 * were dropped for the design system's tokens in the components.
 *
 * It deliberately does NOT read this app's generators, Gemini readers or
 * posting state (`lib/job-intake.ts`). See "AI Agent (V2.3)" in CLAUDE.md.
 */
import type {
  AgentForm,
  Buckets,
  CompanyList,
  InstituteList,
  PastPrefs,
  PoolForm,
  Role,
  RoleKey,
  ScreeningItem,
  StepKey,
  VoiceNote,
} from "@/lib/ai-agent/types"

export const CITY_ALIAS: Record<string, string> = {
  bangalore: "Bengaluru",
  bengaluru: "Bengaluru",
  mumbai: "Mumbai",
  bombay: "Mumbai",
  gurgaon: "Gurugram",
  gurugram: "Gurugram",
  delhi: "Delhi",
  noida: "Noida",
  pune: "Pune",
  hyderabad: "Hyderabad",
  chennai: "Chennai",
  kolkata: "Kolkata",
  ahmedabad: "Ahmedabad",
}
export const CATEGORIES = [
  "Finance",
  "Sales & Marketing",
  "Consulting",
  "HR",
  "IT & Systems",
  "Operations",
  "Legal",
  "BPO",
]
export const FAS = [
  "Accounting / Taxation / Audit",
  "Administration",
  "Analytics & Business Intelligence",
  "Banking / Financial Services",
  "Content Writer/ Editors",
  "Corporate Planning / Consulting / Strategy",
  "Design",
  "Education / Language Specialist",
  "Entrepreneur / Businessman / Outside Management Consultant",
  "Executive Assistant/Personal Secretary",
  "Export / Import / Merchandising",
  "Hotels / Restaurant Management",
  "HR / IR",
  "Instructional Designer",
  "Insurance",
  "IT",
  "ITeS / BPO / Customer Service",
  "KPO / Research",
  "Legal / Law / Company Secretary",
  "Marketing / Advertising / Public Relations",
  "Media / Entertainment",
  "Pharma / Biotech / Healthcare / Medical / R&D",
  "Production / Maintenance / Quality Assurance",
  "Purchase / Supply Chain / Logistics",
  "Research & Development",
  "Sales / Business Development / Client Servicing",
  "Top Management",
  "Training & Development",
  "Travel / Hospitality",
  "Visual Merchandising",
  "Presales/RFP",
  "Real Estate/Construction",
  "NGO/Social Services/CSR",
  "Miscellaneous",
  "Product Management",
  "Other",
]
export const COURSES = ["Full Time", "Part time", "All"]
export const COURSE_TIP: Record<string, string> = {
  "Full Time": "Regular full-time degree programmes only",
  "Part time":
    "Includes distance learning, executive programmes (e.g. EMBA/PGPX) and certifications",
  All: "Full-time, part-time, distance, executive and certification courses",
}
export const DIVS = [
  "Female Candidates",
  "Women Joining back the workforce",
  "Ex-defence personnel",
  "Differently-abled candidates",
  "Work from Home",
]
export const DIVF: Record<string, number> = {
  "Female Candidates": 0.34,
  "Women Joining back the workforce": 0.07,
  "Ex-defence personnel": 0.04,
  "Differently-abled candidates": 0.03,
  "Work from Home": 0.55,
}
export const ORDER: RoleKey[] = ["sales", "hr", "marketing", "product"]
export const ROLES: Record<RoleKey, Role> = {
  sales: {
    fn: "Sales",
    title: "Regional Sales Manager",
    note: "Need a Regional Sales Manager for our enterprise SaaS business in Mumbai. 8-12 yrs, should have sold to BFSI clients and handled a team of 5-6 AEs, quota 15Cr+. Budget around 35-45L. It's a backfill, need someone in 30 days.",
    voice:
      "Hi, so we need a regional sales manager for Mumbai, enterprise SaaS. Someone with around 8 to 12 years, who has sold into banks and insurance, BFSI basically, and has managed a team of five or six AEs. Budget is roughly 35 to 45 lakhs. It is a backfill so we need to close fast.",
    alt: [
      { t: "Regional Sales Manager", m: 1.0 },
      { t: "Enterprise Sales Head – West", m: 1.6 },
      { t: "Area Sales Manager", m: 0.7 },
    ],
    exp: [8, 12],
    median: 48,
    scale: 0.55,
    cities: [
      { n: "Bengaluru", s: 4200 },
      { n: "Delhi", s: 3600 },
      { n: "Mumbai", s: 3100 },
      { n: "Hyderabad", s: 1400 },
      { n: "Pune", s: 1200 },
    ],
    skills: [
      "Enterprise Sales",
      "SaaS",
      "BFSI",
      "Team Management",
      "Key Account Management",
    ],
    moreSkills: ["Solution Selling", "CXO Relationships", "Salesforce CRM"],
    category: "Sales & Marketing",
    fa: "Sales / Business Development / Client Servicing",
    industry: "Software / SaaS",
    subIndustry: "Enterprise SaaS",
    domain: "B2B Sales",
    subDomain: "Enterprise / Key Account Sales",
    summary:
      "Leads a 5–6 member AE team selling enterprise SaaS into BFSI accounts across the West region, owning a ₹15Cr+ annual quota.",
    must: [
      { t: "B2B SaaS selling", q: "How many years have you sold B2B SaaS?" },
      { t: "BFSI clients", q: "Have you closed deals with BFSI clients?" },
      { t: "Managed 5+ AEs", q: "Have you managed a team of 5 or more AEs?" },
      {
        t: "₹15Cr+ quota",
        q: "Have you owned an annual quota of ₹15Cr or more?",
      },
    ],
    nice: ["MBA"],
    deal: ["Only channel / retail sales"],
    extras: {
      team: "5–6 AEs",
      reports: "Head of Sales – West",
      hire: "Backfill · close in 30 days",
      notice: "Up to 60 days",
      travel: "Frequent, within West region",
    },
    resp: [
      "Own and grow the West region enterprise book with a ₹15Cr+ annual quota",
      "Hire, coach and run a team of 5–6 account executives",
      "Build CXO-level relationships across banks, NBFCs and insurers",
      "Forecast accurately and run a disciplined pipeline in CRM",
    ],
    roleQ: {
      id: "rq",
      text: "Would you consider sellers from IT services companies, or only SaaS product firms? Including services roughly adds a third more people.",
      options: [
        {
          label: "Include IT services",
          type: "extra",
          value: 1.3,
          log: "Included IT services sellers",
        },
        {
          label: "SaaS product only",
          type: "extra",
          value: 1,
          log: "Kept SaaS product sellers only",
        },
      ],
    },
  },
  hr: {
    fn: "HR",
    title: "HR Business Partner",
    note: "Looking for an HRBP to support our tech and product org (~400 people) in Bengaluru. 6-10 years, ideally from a product startup, strong on performance management, org design and employee relations. Reports to the CHRO.",
    voice:
      "Hey, we are looking for an HR business partner in Bangalore for our tech and product teams, around 400 people. Six to ten years of experience, ideally someone from a product startup, really strong on performance management and org design, plus employee relations. The role reports to our CHRO.",
    alt: [
      { t: "HR Business Partner", m: 1.0 },
      { t: "Senior HRBP – Tech & Product", m: 1.4 },
      { t: "HR Manager", m: 0.8 },
    ],
    exp: [6, 10],
    median: 32,
    scale: 0.5,
    cities: [
      { n: "Delhi", s: 2900 },
      { n: "Bengaluru", s: 2600 },
      { n: "Mumbai", s: 2100 },
      { n: "Hyderabad", s: 1100 },
      { n: "Pune", s: 900 },
    ],
    skills: [
      "HR Business Partnering",
      "Performance Management",
      "Org Design",
      "Employee Relations",
      "Talent Management",
    ],
    moreSkills: [
      "HR Analytics",
      "Change Management",
      "Compensation & Benefits",
    ],
    category: "HR",
    fa: "HR / IR",
    industry: "Internet / Consumer Tech",
    subIndustry: "Product startup",
    domain: "HR Business Partnering",
    subDomain: "Tech & Product HRBP",
    summary:
      "Strategic HRBP for a ~400-person tech and product org, driving performance cycles, org design and employee relations, reporting to the CHRO.",
    must: [
      {
        t: "Product startup HR",
        q: "Have you been an HRBP at a product company or startup?",
      },
      {
        t: "Performance management",
        q: "Have you run end-to-end performance cycles?",
      },
      {
        t: "Org design",
        q: "Have you led an org design or restructuring exercise?",
      },
      {
        t: "Supported 300+ employees",
        q: "Have you partnered with a business unit of 300+ people?",
      },
    ],
    nice: ["Tech org exposure"],
    deal: ["Only TA / recruitment experience"],
    extras: {
      team: "Individual contributor",
      reports: "CHRO",
      hire: "New role",
      notice: "Up to 60 days",
      travel: "Minimal",
    },
    resp: [
      "Partner with engineering and product leaders on people strategy for ~400 employees",
      "Run performance and calibration cycles end to end",
      "Lead org design as teams scale",
      "Handle employee relations and build a high-trust culture",
    ],
    roleQ: {
      id: "rq",
      text: "Is a Tier-1 MBA (HR) a must, or just a plus? Making it a must cuts the pool roughly in half.",
      options: [
        {
          label: "Must-have",
          type: "extra",
          value: 0.55,
          log: "Made Tier-1 MBA (HR) mandatory",
        },
        {
          label: "Just a plus",
          type: "nice",
          value: "Tier-1 MBA (HR)",
          log: "Added Tier-1 MBA (HR) as nice-to-have",
        },
      ],
    },
  },
  marketing: {
    fn: "Marketing",
    title: "Brand Manager",
    note: "Brand Manager for a D2C personal care brand, Gurugram. 4-7 yrs FMCG / D2C brand experience, P&L ownership of a ₹50Cr brand, runs performance plus ATL campaigns. 25-32 LPA. Tier-1 MBA preferred.",
    voice:
      "So we need a brand manager for our personal care D2C brand, based in Gurgaon. Four to seven years in FMCG or D2C brand roles, has owned the P&L of a fifty crore brand, and can run both performance and ATL campaigns. Budget is 25 to 32 lakhs, Tier-1 MBA preferred.",
    alt: [
      { t: "Brand Manager", m: 1.0 },
      { t: "Brand Manager – D2C Personal Care", m: 1.3 },
      { t: "Marketing Manager", m: 0.8 },
    ],
    exp: [4, 7],
    median: 30,
    scale: 0.55,
    cities: [
      { n: "Mumbai", s: 2400 },
      { n: "Bengaluru", s: 1900 },
      { n: "Gurugram", s: 1800 },
      { n: "Delhi", s: 1500 },
      { n: "Pune", s: 600 },
    ],
    skills: [
      "Brand Management",
      "P&L Ownership",
      "D2C",
      "Consumer Insights",
      "ATL / BTL Campaigns",
    ],
    moreSkills: [
      "Performance Marketing",
      "Go-to-Market",
      "New Product Development",
    ],
    category: "Sales & Marketing",
    fa: "Marketing / Advertising / Public Relations",
    industry: "FMCG / Consumer",
    subIndustry: "Personal Care D2C",
    domain: "Brand Marketing",
    subDomain: "Brand Management",
    summary:
      "Owns the P&L of a ₹50Cr D2C personal care brand, blending performance and ATL campaigns to drive growth.",
    must: [
      {
        t: "FMCG / D2C brand role",
        q: "Have you worked in an FMCG or D2C brand team?",
      },
      { t: "Brand P&L ownership", q: "Have you owned a brand P&L?" },
      {
        t: "Performance + ATL",
        q: "Have you run both performance and ATL campaigns?",
      },
    ],
    nice: ["Tier-1 MBA"],
    deal: ["Agency-only background"],
    extras: {
      team: "2 executives + agencies",
      reports: "Marketing Head",
      hire: "New role",
      notice: "Up to 60 days",
      travel: "Occasional",
    },
    resp: [
      "Own the brand P&L and annual growth plan for a ₹50Cr brand",
      "Run integrated campaigns across performance, digital and ATL",
      "Turn consumer insight into new launches and packs",
      "Manage creative, media and performance agencies",
    ],
    roleQ: {
      id: "rq",
      text: "Should I also reach brand people from digital-first agencies, or keep it brand-side only?",
      options: [
        {
          label: "Include agencies",
          type: "extra",
          value: 1.2,
          log: "Included digital-first agency talent",
        },
        {
          label: "Brand-side only",
          type: "extra",
          value: 1,
          log: "Kept brand-side talent only",
        },
      ],
    },
  },
  product: {
    fn: "Product",
    title: "Senior Product Manager",
    note: "Senior PM for payments at our fintech, Bengaluru. 5-9 yrs, at least 3 in product, will own merchant onboarding. Must have shipped 0 to 1 products in B2B fintech. Budget 45-60L. Engineering background preferred, no services-only folks.",
    voice:
      "We need a senior PM for payments, Bangalore. Five to nine years, at least three in product, who will own merchant onboarding. They must have shipped zero to one products in B2B fintech. Budget is 45 to 60 lakhs. Engineering background preferred, and please no services-only profiles.",
    alt: [
      { t: "Senior Product Manager", m: 1.0 },
      { t: "Senior Product Manager – Payments", m: 1.5 },
      { t: "Product Owner", m: 0.6 },
    ],
    exp: [5, 9],
    median: 55,
    scale: 0.5,
    cities: [
      { n: "Bengaluru", s: 3800 },
      { n: "Gurugram", s: 2100 },
      { n: "Mumbai", s: 1600 },
      { n: "Hyderabad", s: 900 },
      { n: "Pune", s: 700 },
    ],
    skills: [
      "Product Management",
      "Payments",
      "Merchant Onboarding",
      "0→1 Products",
      "B2B Fintech",
    ],
    moreSkills: ["API Products", "Product Analytics", "Risk & Compliance"],
    category: "IT & Systems",
    fa: "Product Management",
    industry: "Fintech",
    subIndustry: "Payments",
    domain: "Product Management",
    subDomain: "Payments / Merchant Platform",
    summary:
      "Owns merchant onboarding for a B2B payments product, taking new capabilities from 0→1 with engineering and risk teams.",
    must: [
      {
        t: "3+ yrs in product",
        q: "Do you have 3 or more years in a product management role?",
      },
      { t: "Shipped 0→1", q: "Have you taken a product from 0 to 1?" },
      {
        t: "B2B fintech",
        q: "Have you built products in B2B fintech or payments?",
      },
    ],
    nice: ["Engineering background"],
    deal: ["Services-only background"],
    extras: {
      team: "2 PMs, 1 designer",
      reports: "Director of Product",
      hire: "New role",
      notice: "Up to 60 days",
      travel: "Minimal",
    },
    resp: [
      "Own the merchant onboarding roadmap and its conversion metrics",
      "Ship 0→1 capabilities with engineering, risk and compliance",
      "Talk to merchants weekly and turn insight into specs",
      "Define success metrics and run experiments",
    ],
    roleQ: {
      id: "rq",
      text: "You said engineering background is preferred. Should I treat it as a must, or just a plus?",
      options: [
        {
          label: "Must-have",
          type: "extra",
          value: 0.6,
          log: "Made engineering degree mandatory",
        },
        {
          label: "Just a plus",
          type: "nice",
          value: "Engineering background",
          log: "Kept engineering as a plus",
        },
      ],
    },
  },
}
export const VNOTES: Record<RoleKey, VoiceNote> = {
  sales: {
    text: "Quick context before you post. The last person struggled with big bank deals, so I really want someone who has closed a 2 crore plus ticket on their own. People from Freshworks, Zoho or Salesforce would be ideal. Please don’t send me folks who have only sold to SMBs.",
    fx: [
      {
        type: "must",
        t: "Closed a ₹2Cr+ deal",
        q: "Have you closed a single deal worth ₹2Cr or more?",
      },
      {
        type: "addl",
        label: "Target companies",
        v: "Freshworks, Zoho, Salesforce",
      },
      { type: "deal", v: "Only SMB selling" },
    ],
  },
  hr: {
    text: "One thing the CHRO keeps stressing: this person must have handled a restructuring or layoff with care. Folks from Swiggy, Razorpay or Meesho would be great. And they need to be hands-on, not just strategic.",
    fx: [
      {
        type: "must",
        t: "Handled a restructuring",
        q: "Have you managed a restructuring or layoff end to end?",
      },
      {
        type: "addl",
        label: "Target companies",
        v: "Swiggy, Razorpay, Meesho",
      },
      { type: "nice", v: "Hands-on operator" },
    ],
  },
  marketing: {
    text: "The hiring manager wants someone who has launched at least one new product line, not just run campaigns. Backgrounds like Mamaearth, Sugar or Minimalist would be perfect. Skip people who have only done social media.",
    fx: [
      {
        type: "must",
        t: "Launched a new product line",
        q: "Have you launched a new product line from scratch?",
      },
      {
        type: "addl",
        label: "Target companies",
        v: "Mamaearth, Sugar, Minimalist",
      },
      { type: "deal", v: "Only social media experience" },
    ],
  },
  product: {
    text: "The director wants someone who has worked closely with risk and compliance, the RBI side of things. Razorpay, Cashfree or Juspay people would be ideal. Being comfortable with SQL is a big plus.",
    fx: [
      {
        type: "must",
        t: "Worked with risk & compliance",
        q: "Have you shipped products with risk and compliance (e.g. RBI) requirements?",
      },
      {
        type: "addl",
        label: "Target companies",
        v: "Razorpay, Cashfree, Juspay",
      },
      { type: "nice", v: "Comfortable with SQL" },
    ],
  },
}
export const PAST = [
  {
    label: "Area Sales Manager – Pune",
    meta: "Posted Aug 2026 · 142 applies",
    note: "Area Sales Manager, Pune. 6-9 yrs in B2B software sales, handles mid-market accounts, team of 3. Budget 22-30L.",
  },
  {
    label: "Product Manager – Growth",
    meta: "Posted Jul 2026 · 210 applies",
    note: "Product Manager for growth at a consumer fintech, Bengaluru. 4-7 yrs, owns activation and retention funnels, strong with experiments. Budget 35-48L.",
  },
]
export const FN: Record<string, string> = {
  title: "Job title",
  company: "Company",
  locations: "Location",
  exp: "Experience",
  salary: "Salary",
  skills: "Skills",
  batch: "Graduating year",
  course: "Course type",
  diversity: "Diversity",
  video: "Video profile",
  confidential: "Confidentiality",
  hideSalary: "Salary visibility",
}
export const REVEAL_B: Record<string, number> = {
  title: 1,
  locations: 1,
  exp: 1,
  company: 2,
  skills: 2,
  confidential: 2,
  pool: 3,
  salary: 4,
  hideSalary: 4,
}
export function recScreen(f: Partial<AgentForm> = {}): ScreeningItem[] {
  const loc = (f.locations || [])[0]
  return [
    { t: "Can you join within 60 days?", key: "rec-notice", on: false },
    {
      t: loc
        ? "Are you open to working from " + loc + "?"
        : "Are you open to relocating for this role?",
      key: "rec-loc",
      on: false,
    },
    {
      t: f.expMin
        ? "Do you have " + f.expMin + "+ years of relevant experience?"
        : "Do you have the required years of relevant experience?",
      key: "rec-exp",
      on: false,
    },
    {
      t: "Is the salary range for this role acceptable to you?",
      key: "rec-sal",
      on: false,
    },
  ]
}
export const ORDER_STEPS: StepKey[] = [
  "basic",
  "jd",
  "screen",
  "addl",
  "profiles",
]
export const STEP_LABELS: Record<string, string> = {
  basic: "Confirm role details",
  jd: "Job description",
  screen: "Screening questions",
  addl: "Review targeting",
  profiles: "Review matching candidates",
}
export const TAB_LABELS: Record<StepKey, string> = {
  basic: "Role details",
  jd: "Job description",
  screen: "Screening questions",
  addl: "Targeting",
  profiles: "Candidates",
}
export const NEXT_LABELS: Record<StepKey, string> = {
  basic: "Next: job description →",
  jd: "Next: screening questions →",
  screen: "Next: review targeting →",
  addl: "See sample candidates →",
  profiles: "Next: choose how to source →",
}
export const PHASE_BANNER: Record<string, string> = {
  basic: "Turning your brief into a role profile…",
  jd: "Drafting your job description…",
  screen: "Recommending screening questions…",
  addl: "Preparing recommendations: targeting and preferences…",
  profiles: "Finding relevant candidate profiles…",
}
export const PHASE_DONE: Record<string, string> = {
  addl: "Here are my recommendations based on your brief: role classification, companies and preferences. Change anything you want.",
  jd: "I drafted the JD from your role details and skills. Edit freely; your edits stay.",
  screen:
    "I recommended screening questions from your must-haves. Tap to add or remove, or skip screening.",
  profiles:
    "Here are a few profiles I found based on your current requirements. Review the matches and tell me what you’d like to change.",
}
export const FOCUS: Record<string, string> = {
  mustc: "mustc-in",
  title: "f-title",
  company: "f-company",
  locations: "f-loc",
  exp: "f-exp",
  salary: "f-sal",
  skills: "f-skill",
  domain: "ad-domain",
  jd: "f-jd",
}
export const SRC_LABEL: Record<string, string> = {
  you: "From your brief",
  inferred: "Suggested",
  data: "Recommended",
  answer: "You answered",
  edited: "Edited by you",
  account: "From account",
  needs: "Needs input",
  none: "Default",
}
export const INIT = ["AK", "RS", "NM", "PV"]
// Sample company taxonomy (clusters → sub-clusters). Swap in Cluster_Subcluster_Definitions.xlsx for the full 77-sub-cluster list.
export const CLUSTERS: Record<string, string[]> = {
  Consulting: [
    "Strategy (MBB)",
    "Big 4 & Advisory",
    "Tech & Digital Consulting",
    "Boutique Consulting",
  ],
  Banking: [
    "Private Banks",
    "PSU Banks",
    "Foreign Banks",
    "Investment Banking",
  ],
  "Financial Services": [
    "NBFCs",
    "Insurance",
    "Asset & Wealth Management",
    "PE / VC",
  ],
  Fintech: ["Payments", "Lending", "Wealthtech", "Insurtech"],
  "IT Services": [
    "Tier-1 IT Services",
    "Mid-tier IT Services",
    "Engineering Services",
  ],
  "SaaS & IT Product": [
    "Indian SaaS",
    "Global IT Product",
    "Enterprise Software",
  ],
  "Global Capability Centres": [
    "BFSI GCCs",
    "Tech GCCs",
    "Retail & Other GCCs",
  ],
  "Consumer Internet": [
    "E-commerce",
    "Quick Commerce",
    "Food & Mobility",
    "Edtech",
    "Healthtech",
  ],
  "FMCG & Consumer": [
    "MNC FMCG",
    "Indian FMCG",
    "D2C Brands",
    "Consumer Durables",
  ],
  Retail: ["Organised Retail", "Fashion & Lifestyle"],
  "Pharma & Healthcare": ["Pharma", "Hospitals", "Medtech & Diagnostics"],
  Manufacturing: [
    "Auto & Auto Components",
    "Industrial & Capital Goods",
    "Chemicals",
  ],
  "Energy & Infrastructure": [
    "Oil & Gas",
    "Power & Renewables",
    "Infra & Construction",
  ],
  "Telecom & Media": [
    "Telecom",
    "Media & Entertainment",
    "Advertising & Agencies",
  ],
  Conglomerates: ["Indian Conglomerates", "MNC Conglomerates"],
  "Logistics & Supply Chain": ["Logistics", "Supply Chain Tech"],
  "Real Estate": ["Developers", "Proptech"],
  "Travel & Hospitality": ["Hotels", "Travel & Aviation"],
}
export const COSUGGEST: Record<RoleKey, string[]> = {
  sales: [
    "SaaS & IT Product › Indian SaaS",
    "SaaS & IT Product › Global IT Product",
    "IT Services › Tier-1 IT Services",
  ],
  hr: [
    "Consumer Internet › E-commerce",
    "Fintech › Payments",
    "SaaS & IT Product › Indian SaaS",
  ],
  marketing: [
    "FMCG & Consumer › D2C Brands",
    "FMCG & Consumer › MNC FMCG",
    "Consumer Internet › E-commerce",
  ],
  product: [
    "Fintech › Payments",
    "Fintech › Lending",
    "Consumer Internet › E-commerce",
  ],
}
// Institute clusters (sample definitions; swap in the official institute-cluster sheet)
export const OLD_IIMS = [
  "IIM Ahmedabad",
  "IIM Bangalore",
  "IIM Calcutta",
  "IIM Lucknow",
  "IIM Kozhikode",
  "IIM Indore",
]
export const ALL_IIMS = OLD_IIMS.concat([
  "IIM Mumbai",
  "IIM Shillong",
  "IIM Rohtak",
  "IIM Ranchi",
  "IIM Raipur",
  "IIM Tiruchirappalli",
  "IIM Udaipur",
  "IIM Kashipur",
  "IIM Nagpur",
  "IIM Visakhapatnam",
  "IIM Bodh Gaya",
  "IIM Amritsar",
  "IIM Sambalpur",
  "IIM Sirmaur",
  "IIM Jammu",
])
export const OLD_IITS = [
  "IIT Kharagpur",
  "IIT Bombay",
  "IIT Madras",
  "IIT Kanpur",
  "IIT Delhi",
  "IIT Guwahati",
  "IIT Roorkee",
]
export const ALL_IITS = OLD_IITS.concat([
  "IIT (BHU) Varanasi",
  "IIT (ISM) Dhanbad",
  "IIT Ropar",
  "IIT Bhubaneswar",
  "IIT Gandhinagar",
  "IIT Hyderabad",
  "IIT Jodhpur",
  "IIT Patna",
  "IIT Indore",
  "IIT Mandi",
  "IIT Palakkad",
  "IIT Tirupati",
  "IIT Bhilai",
  "IIT Goa",
  "IIT Jammu",
  "IIT Dharwad",
])
export const NITS = [
  "NIT Tiruchirappalli",
  "NIT Surathkal",
  "NIT Warangal",
  "NIT Calicut",
  "NIT Rourkela",
  "VNIT Nagpur",
  "SVNIT Surat",
  "MNIT Jaipur",
  "MNNIT Allahabad",
  "MANIT Bhopal",
  "NIT Kurukshetra",
  "NIT Durgapur",
  "NIT Silchar",
  "NIT Jamshedpur",
  "NIT Delhi",
  "NIT Hamirpur",
  "NIT Jalandhar",
  "NIT Patna",
  "NIT Raipur",
  "NIT Srinagar",
  "NIT Agartala",
  "NIT Goa",
  "NIT Puducherry",
  "NIT Uttarakhand",
  "NIT Andhra Pradesh",
  "NIT Arunachal Pradesh",
  "NIT Manipur",
  "NIT Meghalaya",
  "NIT Mizoram",
  "NIT Nagaland",
  "NIT Sikkim",
]
export const INSTS: Record<string, string[]> = {
  "Old IIMs": OLD_IIMS,
  "All IIMs": ALL_IIMS,
  "Old IITs": OLD_IITS,
  "All IITs": ALL_IITS,
  "IITs + NITs": ALL_IITS.concat(NITS),
  "Top B-Schools": OLD_IIMS.concat([
    "ISB Hyderabad",
    "XLRI Jamshedpur",
    "FMS Delhi",
    "SPJIMR Mumbai",
    "MDI Gurgaon",
    "IIM Mumbai",
    "IIFT Delhi",
    "JBIMS Mumbai",
    "NMIMS Mumbai",
    "SIBM Pune",
  ]),
  "Top Engineering": OLD_IITS.concat([
    "IIT (BHU) Varanasi",
    "BITS Pilani",
    "NIT Tiruchirappalli",
    "NIT Surathkal",
    "NIT Warangal",
    "IIIT Hyderabad",
    "DTU Delhi",
    "NSUT Delhi",
    "Jadavpur University",
  ]),
}
export const EXTRA_INSTS = [
  "BITS Goa",
  "BITS Hyderabad",
  "IIIT Bangalore",
  "IIIT Delhi",
  "VIT Vellore",
  "Manipal Institute of Technology",
  "ISB Mohali",
  "IMT Ghaziabad",
  "Great Lakes Chennai",
  "TISS Mumbai",
  "XIM Bhubaneswar",
  "IRMA Anand",
  "MICA Ahmedabad",
  "SRCC Delhi",
  "St. Stephen's College Delhi",
  "Lady Shri Ram College",
  "Christ University",
  "Symbiosis (SIBM) Pune",
  "Loyola College Chennai",
  "Presidency University Kolkata",
]
export const ALL_INSTS: string[] = (function () {
  const o: Record<string, number> = {}
  Object.keys(INSTS).forEach((k) => INSTS[k].forEach((n) => (o[n] = 1)))
  EXTRA_INSTS.forEach((n) => (o[n] = 1))
  return Object.keys(o).sort((a, b) => a.localeCompare(b))
})()
const INST_LIST_KEY = "iimjobs_proto_inst_lists_v231",
  PAST_KEY = "iimjobs_proto_past_prefs_v231"
export function loadInstLists(): InstituteList[] {
  try {
    const x = JSON.parse(localStorage.getItem(INST_LIST_KEY) || "null")
    if (Array.isArray(x)) return x
  } catch {
    /* storage blocked */
  }
  return [
    {
      name: "Campus A-list",
      insts: [
        "Old IIMs",
        "Institute › ISB Hyderabad",
        "Institute › XLRI Jamshedpur",
      ],
    },
  ]
}
export function saveInstLists(l: InstituteList[]) {
  try {
    localStorage.setItem(INST_LIST_KEY, JSON.stringify(l))
  } catch {
    /* storage blocked */
  }
}
export function loadPast(): PastPrefs | null {
  try {
    const x = JSON.parse(localStorage.getItem(PAST_KEY) || "null")
    if (x && typeof x === "object") return x
  } catch {
    /* storage blocked */
  }
  return null
}
export function savePast(f: Pick<AgentForm, "coSubs" | "cos" | "insts">) {
  try {
    localStorage.setItem(
      PAST_KEY,
      JSON.stringify({
        coSubs: (f.coSubs || []).slice(),
        cos: (f.cos || []).slice(),
        insts: (f.insts || []).slice(),
      })
    )
  } catch {
    /* storage blocked */
  }
}
export function clearPast() {
  try {
    localStorage.removeItem(PAST_KEY)
  } catch {
    /* storage blocked */
  }
}
export function instSet(list: string[] | undefined): string[] {
  const out: Record<string, number> = {}
  ;(list || []).forEach((x) => {
    if (x.indexOf(" › ") > -1) out[x.split(" › ")[1]] = 1
    else (INSTS[x] || []).forEach((n) => (out[n] = 1))
  })
  return Object.keys(out)
}
const LIST_KEY = "iimjobs_proto_company_lists_v231"
export function loadLists(): CompanyList[] {
  try {
    const x = JSON.parse(localStorage.getItem(LIST_KEY) || "null")
    if (Array.isArray(x)) return x
  } catch {
    /* storage blocked */
  }
  return [
    {
      name: "Top SaaS targets",
      subs: [
        "SaaS & IT Product › Indian SaaS",
        "SaaS & IT Product › Global IT Product",
      ],
      cos: ["Freshworks", "Zoho"],
    },
  ]
}
export function saveLists(l: CompanyList[]) {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(l))
  } catch {
    /* storage blocked */
  }
}
export const POOLMIX: Record<
  RoleKey,
  { iim: number; fem: number; cos: string[] }
> = {
  sales: { iim: 0.18, fem: 0.22, cos: ["Salesforce", "Freshworks", "Zoho"] },
  hr: { iim: 0.22, fem: 0.58, cos: ["Swiggy", "Razorpay", "Flipkart"] },
  marketing: {
    iim: 0.34,
    fem: 0.41,
    cos: ["Hindustan Unilever", "Mamaearth", "Nykaa"],
  },
  product: { iim: 0.28, fem: 0.27, cos: ["Razorpay", "PhonePe", "Paytm"] },
}
export const PROF: Record<RoleKey, { titles: string[]; cos: string[] }> = {
  sales: {
    titles: [
      "Senior Manager – Enterprise Sales",
      "Regional Sales Head",
      "Enterprise Account Director",
      "Sales Manager – BFSI Vertical",
    ],
    cos: [
      "Mid-size SaaS product company",
      "Global CRM software firm",
      "Indian SaaS scale-up",
      "IT services major (BFSI unit)",
    ],
  },
  hr: {
    titles: [
      "Senior HRBP – Engineering",
      "HR Business Partner",
      "Lead HRBP – Product & Tech",
      "HR Manager – Business Partnering",
    ],
    cos: [
      "Consumer internet startup",
      "Fintech scale-up",
      "B2B SaaS company",
      "E-commerce marketplace",
    ],
  },
  marketing: {
    titles: [
      "Brand Manager",
      "Senior Brand Manager",
      "Assistant Brand Manager",
      "Brand & Growth Manager",
    ],
    cos: [
      "D2C beauty brand",
      "FMCG multinational",
      "Personal care D2C startup",
      "Consumer foods company",
    ],
  },
  product: {
    titles: [
      "Senior Product Manager",
      "Product Manager – Payments",
      "Lead PM – Merchant Platform",
      "Senior PM – Lending",
    ],
    cos: [
      "Payments gateway company",
      "Neo-banking startup",
      "B2B fintech SaaS",
      "Digital lending platform",
    ],
  },
}
export const STEP_MS = 800

/** Prototype scale, so pools read in the thousands. */
export const POOL_MULT = 13
export function fmt(input: number | null | undefined): string {
  const n = Math.abs(Number(input || 0))
  const B: [number, string][] = [
    [20000, "20K+"],
    [15000, "15K+"],
    [10000, "10K+"],
    [5000, "5K+"],
    [2000, "2K+"],
    [1000, "1K+"],
    [500, "500+"],
    [100, "100+"],
    [50, "50+"],
    [10, "10+"],
  ]
  for (let i = 0; i < B.length; i++) {
    if (n >= B[i][0]) return B[i][1]
  }
  return "Under 10"
}
export function pctTxt(p: number): string {
  return (p > 0 ? "+" : p < 0 ? "−" : "") + Math.abs(p) + "%"
}
export function detectRole(t: string): RoleKey {
  const s = " " + t.toLowerCase() + " "
  const W: Record<RoleKey, [string, number][]> = {
    sales: [
      ["sales", 2],
      ["quota", 2],
      ["account executive", 2],
      ["business development", 2],
      ["revenue", 1],
      [" aes", 1],
      ["key account", 2],
    ],
    hr: [
      ["hrbp", 4],
      ["hr business", 4],
      ["human resource", 3],
      [" hr ", 2],
      ["employee relations", 2],
      ["chro", 2],
      ["talent acquisition", 2],
    ],
    marketing: [
      ["brand", 3],
      ["marketing", 3],
      ["campaign", 2],
      ["d2c", 1],
      [" atl", 1],
    ],
    product: [
      ["product manager", 4],
      [" pm ", 3],
      ["senior pm", 4],
      ["roadmap", 2],
      ["product", 1],
    ],
  }
  let best: RoleKey = "sales",
    bs = 0
  ORDER.forEach((k) => {
    let sc = 0
    W[k].forEach((p) => {
      if (s.includes(p[0])) sc += p[1]
    })
    if (sc > bs) {
      bs = sc
      best = k
    }
  })
  return best
}
/**
 * THE MUST / GOOD BUCKETS, as the prototype keeps them: module state that
 * `poolFor` reads, set by the controller before every derivation
 * (`setBuckets`). A good-to-have ranks people and narrows nobody, so a field
 * moved to Good to have stops counting against the pool.
 */
let BK: Buckets | null = null
export function setBuckets(next: Buckets | null) {
  BK = next
}
export function poolFor(R: Role, f: PoolForm, extraF?: number): number {
  const G = (k: string) => !!(BK && BK[k] === "good")
  let loc = 0
  const list = f.locations.length ? f.locations : R.cities.map((c) => c.n)
  list.forEach((n) => {
    const c = R.cities.find((x) => x.n === n)
    loc += c ? c.s : 450
  })
  if (!f.locations.length) loc *= 1.25
  const dW = R.exp[1] - R.exp[0] + 2
  let w = (f.expMax - f.expMin + 2) / dW
  w = Math.max(0.25, Math.min(1.7, w))
  let expF = Math.pow(w, 0.85)
  const c0 = (R.exp[0] + R.exp[1]) / 2,
    c1 = (f.expMin + f.expMax) / 2
  if (Math.abs(c0 - c1) > 3) expF *= 0.7
  let salF = 1
  if (f.salMax) {
    const r = f.salMax / R.median
    if (r < 1) salF = Math.max(0.15, r * r * r)
  }
  const batchF = !G("batch") && (f.batchMin || f.batchMax) ? 0.72 : 1
  const courseF = G("course")
    ? 1
    : f.course[0] === "Full Time"
      ? 0.86
      : f.course[0] === "Part time"
        ? 0.18
        : 1
  let divF = 1
  if (!G("div") && f.diversity.length) {
    divF = Math.min(
      1,
      f.diversity.reduce((a, d) => a + (DIVF[d] || 0.1), 0)
    )
  }
  const vidF = !G("video") && f.video ? 0.42 : 1
  const skF = f.skills.length > 6 ? Math.pow(0.93, f.skills.length - 6) : 1
  const nSub = (f.coSubs || []).reduce(
      (a, x) => a + (x.indexOf(" › ") > -1 ? 1 : 3),
      0
    ),
    nCo = (f.cos || []).length
  const coF =
    !G("co") && (nSub || nCo) ? Math.min(1, 0.15 + nSub * 0.12 + nCo * 0.03) : 1
  const nInst = instSet(f.insts).length
  const instF = !G("inst") && nInst ? Math.min(1, 0.05 + nInst * 0.006) : 1
  let critF = 1
  if (BK && BK._on) {
    if (BK.industry !== "good") critF *= 0.62
    critF *= Math.pow(0.85, BK._mustN || 0) * Math.pow(0.9, BK._dealN || 0)
  }
  const raw =
    loc *
    expF *
    salF *
    batchF *
    courseF *
    divF *
    vidF *
    skF *
    coF *
    instF *
    critF *
    (extraF || 1) *
    R.scale *
    POOL_MULT
  return Math.max(0, Math.round(raw / 10) * 10)
}
