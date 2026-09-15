/**
 * Generated portraits — made-up faces from `scripts/generate-avatars.mjs`
 * (Gemini), vendored so the prototype renders offline. Anything without a file
 * returns `undefined`, and the caller's `AvatarFallback` shows initials.
 *
 * Two sets. NAMED fixture people (the recruiter, the message dock's threads)
 * are `first-last.jpg` and looked up by full name. CANDIDATES are generated, so
 * their faces come from a pool: `candidates/first-N.jpg`, three per first name,
 * N an age band picked from experience so the face fits the CV.
 */
const NAMED = byStem(
  import.meta.glob<string>("../assets/avatars/*.jpg", {
    eager: true,
    import: "default",
  })
)

const CANDIDATES = byStem(
  import.meta.glob<string>("../assets/avatars/candidates/*.jpg", {
    eager: true,
    import: "default",
  })
)

function byStem(files: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(files).map(([path, url]) => [
      path.slice(path.lastIndexOf("/") + 1, -".jpg".length),
      url,
    ])
  ) as Record<string, string | undefined>
}

const slug = (text: string) => text.toLowerCase().replace(/\s+/g, "-")

export function photoFor(name: string) {
  return NAMED[slug(name)]
}

/**
 * A candidate's face, by first name and years of experience. Careers here
 * start around 22, so under 9 years is late twenties to about thirty, under 16
 * is the mid thirties, and the rest are forties.
 */
export function candidatePhoto(name: string, experienceYears: number) {
  const band = experienceYears < 9 ? 1 : experienceYears < 16 ? 2 : 3
  return CANDIDATES[`${slug(name.split(" ")[0])}-${band}`]
}
