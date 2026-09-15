#!/usr/bin/env node
/**
 * Generates the portraits in `src/assets/avatars/` with Gemini's image model.
 *
 *   GEMINI_API_KEY=… npm run avatars -w web          # only the missing ones
 *   GEMINI_API_KEY=… npm run avatars -w web -- --force
 *
 * Two sets, both made-up faces, vendored so the prototype renders offline:
 *
 * NAMED — `avatars/first-last.jpg`, one per real fixture person: the recruiter
 * and the message dock's threads. Each is described here by hand.
 *
 * CANDIDATES — `avatars/candidates/first-N.jpg`, three per first name in
 * `lib/applicants.ts`, N being an age band (1 late twenties, 2 mid thirties,
 * 3 forties). `lib/avatars.ts` picks the band from a candidate's experience, so
 * a face is the right age for the CV beside it and two people sharing a first
 * name are usually different faces.
 *
 * The candidates are deliberately NOT all studio shots. A real applicant pool
 * is a mix — a few studio headshots, most taken in natural light at work, some
 * on a phone or webcam — so each portrait gets a style, and the lower-quality
 * ones are also saved smaller and more compressed. All of them stay something a
 * person would put on a CV.
 *
 * `sips` (macOS) does the resizing.
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const MODEL = "gemini-2.5-flash-image"
const CONCURRENCY = 6
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../src/assets/avatars")

/** Keep in step with `nav-user.tsx` and `lib/messages.ts`. */
const PEOPLE = [
  ["Anurag Yadav", "an Indian man in his mid thirties, a corporate recruiter, clean-shaven, smart casual shirt"],
  ["Ananya Krishnan", "an Indian woman around forty, a principal software engineer, glasses, plain dark top"],
  ["Rohit Mehta", "an Indian man in his late thirties, an engineering manager, short beard, open-collar shirt"],
  ["Sneha Pillai", "an Indian woman around thirty, a product designer, relaxed casual top"],
  ["Vikram Iyer", "an Indian man around thirty, a data scientist, casual crew-neck t-shirt"],
  ["Meera Nair", "an Indian woman in her late forties, a finance executive, formal blazer"],
  ["Arjun Desai", "an Indian man in his early forties, a retail category head, blazer over a shirt"],
]

/** `FIRST_NAMES` in `lib/applicants.ts`, in order — keep in step. */
const FIRST_NAMES = [
  ["Arjun", "man"], ["Divya", "woman"], ["Karan", "man"], ["Nisha", "woman"],
  ["Rohit", "man"], ["Ananya", "woman"], ["Vikram", "man"], ["Meera", "woman"],
  ["Siddharth", "man"], ["Priyanka", "woman"], ["Aditya", "man"], ["Kavya", "woman"],
  ["Rahul", "man"], ["Sneha", "woman"], ["Aman", "man"], ["Ritika", "woman"],
  ["Harsh", "man"], ["Tanvi", "woman"], ["Nikhil", "man"], ["Ishita", "woman"],
  ["Varun", "man"], ["Pooja", "woman"], ["Gaurav", "man"], ["Shreya", "woman"],
]

const AGES = ["aged about 28", "aged about 35", "aged about 45"]

const ATTIRE = [
  "a plain crew-neck t-shirt",
  "an open-collar button-down shirt",
  "a blazer over a shirt",
  "a smart knit sweater",
  "a formal suit",
  "a casual polo shirt",
]

const LOOKS = {
  man: ["clean-shaven, short hair", "a neat short beard", "glasses, clean-shaven", "a trimmed moustache and stubble", "slightly wavy hair, light stubble"],
  woman: ["hair tied back", "shoulder-length open hair", "glasses, hair in a bun", "short bob haircut", "long straight hair, small earrings"],
}

/** A quarter studio, half natural, a quarter lower quality. */
const STYLES = ["studio", "natural", "natural", "phone"]

const STYLE_PROMPT = {
  studio:
    "A polished studio headshot: plain seamless backdrop, soft even studio lighting, sharp focus, shallow depth of field.",
  natural:
    "A professional photo taken at work in natural window light, a softly blurred office or meeting-room background, good but not studio-perfect.",
  phone:
    "A lower-quality photo taken on a smartphone or laptop webcam against a plain home or office wall: flat indoor lighting, slightly soft focus, a little noise, ordinary colours — still a neat, professional picture someone would use on a CV.",
}

/** Lower-quality styles are also saved smaller and more compressed. */
const OUTPUT = {
  studio: { size: 192, quality: 84 },
  natural: { size: 192, quality: 78 },
  phone: { size: 120, quality: 52 },
}

const key = process.env.GEMINI_API_KEY
if (!key) {
  console.error("Set GEMINI_API_KEY.")
  process.exit(1)
}
const force = process.argv.includes("--force")

const slug = (name) => name.toLowerCase().replace(/\s+/g, "-")

const jobs = [
  ...PEOPLE.map(([name, who]) => ({
    label: name,
    file: join(OUT, `${slug(name)}.jpg`),
    prompt: `A realistic photographic headshot of ${who}. ${STYLE_PROMPT.studio}`,
    output: OUTPUT.studio,
  })),
  ...FIRST_NAMES.flatMap(([first, gender], n) =>
    AGES.map((age, band) => {
      const i = n * AGES.length + band
      const style = STYLES[i % STYLES.length]
      const look = LOOKS[gender][(n + band * 2) % LOOKS[gender].length]
      const attire = ATTIRE[(n * 5 + band) % ATTIRE.length]
      return {
        label: `${first} ${band + 1} (${style})`,
        file: join(OUT, "candidates", `${slug(first)}-${band + 1}.jpg`),
        prompt:
          `A realistic photograph of an Indian ${gender} ${age}, ${look}, wearing ${attire}. ` +
          STYLE_PROMPT[style],
        output: OUTPUT[style],
      }
    })
  ),
]

const FRAMING =
  " Tightly framed head-and-shoulders: the face and top of the shoulders fill the square," +
  " eyes about a third of the way down, looking at the camera, a natural expression." +
  " Natural skin texture. No text, no watermark, no props."

async function generate({ label, file, prompt, output }) {
  if (existsSync(file) && !force) return `skip  ${label}`

  for (let attempt = 1; ; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt + FRAMING }] }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio: "1:1" },
          },
        }),
      }
    )
    const json = await response.json()
    const image = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)

    if (!image) {
      const reason = json.error?.message ?? "no image in the response"
      const retryable = !json.error || [429, 500, 503].includes(json.error.code)
      if (retryable && attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 5000 * attempt))
        continue
      }
      throw new Error(`${label}: ${reason}`)
    }

    mkdirSync(dirname(file), { recursive: true })
    const raw = join(tmpdir(), `${slug(label)}-${Date.now()}.png`)
    writeFileSync(raw, Buffer.from(image.inlineData.data, "base64"))
    execFileSync(
      "sips",
      [
        ...["-s", "format", "jpeg", "-s", "formatOptions", String(output.quality)],
        ...["-Z", String(output.size), raw, "--out", file],
      ],
      { stdio: "ignore" }
    )
    rmSync(raw)
    return `wrote ${label}`
  }
}

let failed = 0
const queue = [...jobs]
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let job; (job = queue.shift()); ) {
      try {
        console.log(await generate(job))
      } catch (error) {
        failed++
        console.error(`FAIL  ${error.message}`)
      }
    }
  })
)
process.exit(failed ? 1 : 0)
