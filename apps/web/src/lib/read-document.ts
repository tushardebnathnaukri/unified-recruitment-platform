/**
 * The words in a file the recruiter attached or dropped — or why there are
 * none.
 *
 * READ IN THE BROWSER, SO IT WORKS WITH THE AI SERVER DOWN. A `.txt` or `.md`
 * is text already; a PDF goes through pdf.js's text layer and a `.docx`
 * through mammoth. Both libraries are imported only when such a file arrives,
 * so the page never pays for them otherwise.
 *
 * AN OLD `.doc` IS NOT READ. It is a binary format with no dependable browser
 * reader, and a half-read JD would be worse than asking for a `.docx` or PDF.
 *
 * Null is "no words", and the reply works out why from the extension
 * (`cannotRead` in `lib/agent.ts`): a `.doc` is the format, a PDF with no
 * text is almost always a scan.
 */
export async function readDocument(file: File): Promise<string | null> {
  const name = file.name.toLowerCase()
  try {
    const text = /\.(txt|md)$/.test(name)
      ? await file.text()
      : name.endsWith(".pdf")
        ? await readPdf(file)
        : name.endsWith(".docx")
          ? await readDocx(file)
          : ""
    return text.trim() || null
  } catch (error) {
    console.warn(`[agent] Could not read ${file.name}.`, error)
    return null
  }
}

async function readPdf(file: File) {
  const [{ getDocument, GlobalWorkerOptions }, { default: PdfWorker }] =
    await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?worker"),
    ])
  // A WORKER VITE BUNDLES, NOT THE `.mjs` AS A URL. The Launchpad's static
  // server sends `.mjs` as `application/octet-stream`, and a browser will not
  // start a module worker of that type — so every PDF read as "no text" on the
  // deployed site while working locally. `?worker` emits it as a `.js`. One
  // worker for the page; pdf.js leaves a port it was handed running.
  GlobalWorkerOptions.workerPort ??= new PdfWorker()

  const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  const pdf = await task.promise
  const pages: string[] = []
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number)
    const content = await page.getTextContent()
    pages.push(
      content.items
        .map((item) =>
          "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""
        )
        .join("")
    )
  }
  await task.destroy()
  // Items carry their own spaces, so a space after each doubles them.
  return pages.join("\n\n").replace(/[ \t]+/g, " ")
}

async function readDocx(file: File) {
  const mammoth = await import("mammoth")
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  })
  return result.value
}
