/**
 * Option data for the post-a-job form, taken from the live hirist form.
 *
 * The one real change is `FUNCTIONAL_AREAS`: the live product presents these
 * fifty-odd options as a single flat list, which is unusable without already
 * knowing the exact wording. They have obvious groups, so they are grouped
 * here — the values are unchanged so nothing downstream has to care.
 */

export type JobPlan = "pro" | "basic"

export const JOB_PLANS: {
  value: JobPlan
  label: string
  summary: string
  recommended?: boolean
  /** The handful worth reading at decision time; the rest sit behind a toggle. */
  highlights: string[]
  /** Shown only when the full comparison is expanded. */
  rest: string[]
}[] = [
  {
    value: "pro",
    label: "Pro",
    summary:
      "Advanced posting with all features — complimentary with your current plan for a limited time.",
    recommended: true,
    highlights: [
      "Unlimited application access",
      "Up to 3 locations",
      "Recommended candidates from database",
      "AI-generated description",
    ],
    rest: [
      "Instant candidate reach",
      "JD upload auto-fills the form",
      "Salary confidentiality",
      "Video JD",
      "Video and audio candidate profiles",
      "Confidential hiring",
      "Sharing to LinkedIn is optional",
    ],
  },
  {
    value: "basic",
    label: "Basic",
    summary:
      "Standard posting with essential features — included in your current plan.",
    highlights: [
      "25 application accesses",
      "1 location",
      "No recommended candidates",
      "No AI-generated description",
    ],
    rest: [
      "No instant candidate reach",
      "JD upload fills nothing — manual form",
      "No salary confidentiality",
      "No Video JD",
      "No video and audio candidate profiles",
      "No confidential hiring",
      "Sharing to LinkedIn is required",
    ],
  },
]

export const CATEGORIES = [
  "AI/ML",
  "Data Analytics & BI",
  "Data Engineering",
  "Backend Development",
  "Frontend Development",
  "Full Stack",
  "Mobile Applications",
  "Emerging Technologies & Roles",
  "DevOps / SRE",
  "CyberSecurity",
  "Quality Assurance",
  "Platform Engineering / SAP/Oracle Jobs",
  "Product Management",
  "Business Analysis and Project Management",
  "UI & Design",
  "Semiconductor/VLSI/EDA",
  "Others",
]

export const FUNCTIONAL_AREAS: { group: string; options: string[] }[] = [
  {
    group: "Engineering",
    options: [
      "Backend Development",
      "Frontend Development",
      "Full-Stack Development",
      "Mobile Development - Android",
      "Mobile Development - iOS",
      "Mobile Development - Hybrid/Native",
      "Embedded / Kernel Development",
      "Other Software Development",
    ],
  },
  {
    group: "Data & AI",
    options: [
      "Data Analysis / Business Analysis",
      "Data Science",
      "Data Mining / Analysis",
      "Data Engineering",
      "Big Data / Data Warehousing / ETL",
      "ML / DL Engineering",
      "ML / DL / AI Research",
    ],
  },
  {
    group: "Infrastructure",
    options: [
      "DevOps / Cloud",
      "Site Reliability Engineering",
      "Technical / Solution Architect",
      "Cloud Computing",
      "Database Admin / Development",
      "Network Administration",
      "Systems Administration",
      "IT Infrastructure Services",
      "Networking & Wireless",
    ],
  },
  {
    group: "Quality & Security",
    options: ["QA & Testing", "Cyber Security", "IT Security"],
  },
  {
    group: "Product & Management",
    options: [
      "Product Management",
      "Project Management",
      "Program Management",
      "Engineering Management",
      "Release Management",
      "Senior Management",
    ],
  },
  {
    group: "Design",
    options: [
      "UI / UX Design",
      "Product Design",
      "UX Architect",
      "Interaction Design",
      "User Researcher",
      "Web Design",
      "Graphic Design / Animation",
      "Illustrator",
      "AR / VR Design",
      "Other Design",
    ],
  },
  {
    group: "Emerging",
    options: ["Blockchain", "IoT", "Computer Vision", "AR / VR"],
  },
  {
    group: "Support & Consulting",
    options: [
      "Functional / Technical Consulting",
      "Technical / Production Support",
      "IT Management / IT Support",
      "Technical Writing",
      "Other",
    ],
  },
]

export const COURSE_TYPES = [
  "Full Time",
  "Part time",
  "Distance Learning Program",
  "Executive Program",
  "Certification",
]

export const SALARY_UNITS = ["Lakhs", "Crores"]

/** 0–30, the range the live form offers for experience. */
export const EXPERIENCE_YEARS = Array.from({ length: 31 }, (_, i) => String(i))

/** Newest first, matching the live form's ordering. */
export const GRADUATING_YEARS = Array.from({ length: 57 }, (_, i) =>
  String(2026 - i)
)
