/**
 * The live site's own static assets, hotlinked rather than vendored.
 *
 * A reference page should look like the thing it references without anyone
 * maintaining it, and these are public files on the product's own host. The
 * trade is that the page degrades if that host moves them — acceptable here,
 * and the wrong trade for anything shipping to a candidate.
 */
const ASSET = "https://beta-recruiter.iimjobs.com/static/images"

/**
 * A REPLICA OF THE LIVE RECRUITER DASHBOARD, AND DELIBERATELY NOT DESIGN
 * SYSTEM WORK.
 *
 * Rebuilt from beta-recruiter.iimjobs.com/dashboard so the current product can
 * sit next to whatever replaces it without a second browser window and a login.
 * It could not be an iframe: that host sends `X-Frame-Options: DENY` and
 * `frame-ancestors 'self'`, which no amount of markup on our side can talk its
 * way past.
 *
 * EVERY VALUE HERE IS HARDCODED ON PURPOSE. The rule against hardcoded brand
 * colour exists so components stay brand-agnostic and get their accents from
 * the token layer — but this page is a photograph of a product as it is today,
 * not a component. Pointing it at our tokens would make it drift the moment the
 * palette moves, which is the one thing a reference must not do. So the styles
 * live in a scoped block below, prefixed `lg-`, touching no token and no other
 * file. Deleting this one file removes every trace.
 *
 * For the same reason it does not respond to the brand switcher or to dark
 * mode. The live product has neither.
 *
 * Numbers came off the running site: page #f4f4f4, cards white on #e8e8e8 at
 * 4px radius, primary #1f8f75, links #155d9a, muted #888, Droid Sans at 16px,
 * a 1152 container splitting 749 + 380.
 *
 * THE LIVE SITE'S OWN DARK NAV BAR IS NOT REPRODUCED. The shell already puts a
 * header above this page, and stacking a second one made the replica read as a
 * screenshot pasted into an app rather than as the content it is here to show.
 * What is being compared is the dashboard, not the chrome around it.
 */
export function LegacyDashboardPage() {
  return (
    <div className="lg-root -my-4 md:-my-6">
      <style>{CSS}</style>

      <div className="lg-page">
        <div className="lg-container">
          <section className="lg-card lg-banner">
            <div className="lg-banner-copy">
              <p className="lg-banner-title">
                Your account now includes Pro Job Postings
              </p>
              <p className="lg-banner-sub">
                Get up to 20 instant database recommendations and unlimited
                applications.{" "}
                <a href="#know" onClick={(e) => e.preventDefault()}>
                  Know more
                </a>
              </p>
            </div>
            <div className="lg-banner-art" aria-hidden="true">
              <img
                className="lg-scene"
                src={`${ASSET}/pro-upgrade-modal/banner/scene.png`}
                alt=""
              />
              {BANNER_AVATARS.map((avatar) => (
                <span
                  key={avatar.id}
                  className="lg-bubble"
                  style={{
                    width: avatar.size,
                    height: avatar.size,
                    left: avatar.left,
                    top: avatar.top,
                  }}
                >
                  <img
                    src={`${ASSET}/pro-upgrade-modal/banner/avatar-${avatar.id}-disc.png`}
                    alt=""
                  />
                  <img
                    src={`${ASSET}/pro-upgrade-modal/banner/avatar-${avatar.id}-face.png`}
                    alt=""
                  />
                </span>
              ))}
              <img
                className="lg-star lg-star-1"
                src={`${ASSET}/pro-upgrade-modal/banner/star.svg`}
                alt=""
              />
              <img
                className="lg-star lg-star-2"
                src={`${ASSET}/pro-upgrade-modal/banner/star.svg`}
                alt=""
              />
            </div>
            <button type="button" className="lg-btn">
              Try Pro
            </button>
          </section>

          <div className="lg-grid">
            <div className="lg-col">
              <h2 className="lg-heading">Overview of Active Jobs</h2>
              <div className="lg-card lg-pad">
                <EmptyState
                  art={`${ASSET}/active_job.svg`}
                  title="You don't have any active jobs right now"
                  sub="You will see a graph here when you do"
                />
              </div>

              <h2 className="lg-heading lg-heading-gap">Recent Jobs</h2>
              <div className="lg-card">
                <div className="lg-card-head">
                  <span className="lg-card-title">Jobs Published (0)</span>
                  <a
                    className="lg-see-all"
                    href="#all"
                    onClick={(e) => e.preventDefault()}
                  >
                    See All ›
                  </a>
                </div>
                <div className="lg-pad">
                  <EmptyState
                    art={`${ASSET}/published_job.svg`}
                    title="You don't have any published jobs right now"
                    sub="You will see a list here when you do"
                  />
                </div>
              </div>
            </div>

            <aside className="lg-col">
              <h2 className="lg-heading">Upcoming Interviews</h2>
              <div className="lg-card lg-pad lg-interviews">
                <p className="lg-interviews-title">0 interviews scheduled</p>
                <p className="lg-interviews-sub">
                  <a href="#demo" onClick={(e) => e.preventDefault()}>
                    See Demo
                  </a>{" "}
                  on how to scheduled Video Interviews
                </p>
                <ul className="lg-ticks">
                  <li>Schedule Interviews in Bulk</li>
                  <li>Enable candidate to self-schedule</li>
                </ul>
              </div>

              <div className="lg-testimonial">
                <div className="lg-testimonial-head">
                  <h2 className="lg-heading">What our customers say</h2>
                  <span className="lg-arrows">
                    <span className="lg-arrow" />
                    <span className="lg-arrow is-on" />
                  </span>
                </div>

                <img
                  className="lg-video"
                  src={`${ASSET}/franklin-testimonial.png`}
                  alt="Franklin Templeton customer testimonial"
                />

                <p className="lg-quote">
                  &ldquo;The Database of iimjobs.com is really tremendous, 50%
                  of our hiring is from iimjobs, especially for the Niche
                  Skills.&rdquo;
                </p>
                <img
                  className="lg-brand"
                  src={`${ASSET}/franklin_templeton.png`}
                  alt="Franklin Templeton"
                />

                <span className="lg-dots">
                  {[0, 1, 2, 3, 4, 5].map((dot) => (
                    <span
                      key={dot}
                      className={dot === 0 ? "lg-dot is-on" : "lg-dot"}
                    />
                  ))}
                </span>
              </div>
            </aside>
          </div>
        </div>

        <span className="lg-chat">Need help? Let&rsquo;s chat</span>
      </div>
    </div>
  )
}

function EmptyState({
  art,
  title,
  sub,
}: {
  art: string
  title: string
  sub: string
}) {
  return (
    <div className="lg-empty">
      <img className="lg-empty-art" src={art} alt="" width={90} height={95} />
      <div className="lg-empty-copy">
        <p className="lg-empty-title">{title}</p>
        <p className="lg-empty-sub">{sub}</p>
        <button type="button" className="lg-btn lg-btn-sm">
          Post Job
        </button>
        <p className="lg-or">OR</p>
        <a href="#prev" onClick={(e) => e.preventDefault()} className="lg-link">
          View previously posted jobs
        </a>
      </div>
    </div>
  )
}

/** Positioned by eye off the live banner; the art is decorative. */
const BANNER_AVATARS = [
  { id: "a", size: 44, left: "6%", top: "6%" },
  { id: "b", size: 34, left: "58%", top: "2%" },
  { id: "c", size: 28, left: "82%", top: "18%" },
  { id: "d", size: 26, left: "10%", top: "62%" },
]

/**
 * Scoped by `.lg-root`, so nothing here can reach a design system component
 * even by accident. Droid Sans is the live site's face; it is not loaded here,
 * so the stack falls through to Noto Sans, which is the same design.
 */
const CSS = `
.lg-root {
  --lg-ink: #2b2b2b;
  --lg-muted: #888888;
  --lg-page: #f4f4f4;
  --lg-border: #e8e8e8;
  --lg-green: #1f8f75;
  --lg-green-nav: #5bb8a4;
  --lg-link: #155d9a;
  --lg-shadow: 0 2px 8px 0 rgba(214, 214, 214, 0.3);
  font-family: "Droid Sans", "Noto Sans", Verdana, sans-serif;
  font-size: 16px;
  line-height: normal;
  color: var(--lg-ink);
  color-scheme: light;
}
.lg-root *, .lg-root *::before, .lg-root *::after { box-sizing: border-box; }
.lg-root p, .lg-root h2, .lg-root ul { margin: 0; }
.lg-root ul { padding: 0; list-style: none; }




.lg-page { background: var(--lg-page); min-height: 100%; padding: 24px 0 60px; position: relative; }
.lg-container { max-width: 1152px; margin: 0 auto; padding: 0 16px; }

.lg-card {
  background: #fff; border: 1px solid var(--lg-border);
  border-radius: 4px; box-shadow: var(--lg-shadow);
}
.lg-pad { padding: 24px; }

.lg-banner { display: flex; align-items: center; gap: 16px; padding: 20px 24px; margin-bottom: 28px; }
.lg-banner-copy { flex: 1; min-width: 0; }
.lg-banner-title { font-size: 16px; font-weight: 700; }
.lg-banner-sub { font-size: 13px; color: #5c5c5c; margin-top: 4px; }
.lg-banner-sub a { color: var(--lg-link); font-weight: 700; text-decoration: none; }
.lg-banner-art {
  position: relative; width: 300px; height: 96px; flex-shrink: 0;
  background: linear-gradient(90deg, #eaf6f1 0%, #e5eef8 60%, #f3ecf8 100%);
  border-radius: 6px;
}
.lg-scene {
  position: absolute; left: 50%; bottom: 0; transform: translateX(-50%);
  width: 150px; height: auto;
}
.lg-bubble { position: absolute; display: block; }
.lg-bubble img { position: absolute; inset: 0; width: 100%; height: 100%; }
.lg-star { position: absolute; width: 16px; height: 16px; }
.lg-star-1 { left: 46%; top: 2%; }
.lg-star-2 { left: 30%; top: 52%; }

.lg-btn {
  background: var(--lg-green); color: #fff; border: 0; border-radius: 6px;
  height: 34px; padding: 0 16px; font-size: 14px; font-weight: 700;
  font-family: inherit; cursor: pointer;
}
.lg-btn-sm { height: 30px; padding: 0 14px; }

.lg-grid { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 24px; align-items: start; }
.lg-col { min-width: 0; }
.lg-heading { font-size: 16px; font-weight: 600; color: var(--lg-ink); margin-bottom: 12px; }
.lg-heading-gap { margin-top: 28px; }

.lg-card-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px; border-bottom: 1px solid var(--lg-border);
}
.lg-card-title { font-size: 14px; font-weight: 700; }
.lg-see-all { font-size: 13px; color: var(--lg-ink); text-decoration: none; }

.lg-empty { display: flex; align-items: flex-start; gap: 28px; padding: 8px 12px; }
.lg-empty-art { width: 90px; height: 95px; flex-shrink: 0; display: block; }
.lg-empty-copy { min-width: 0; }
.lg-empty-title { font-size: 16px; color: var(--lg-ink); }
.lg-empty-sub { font-size: 14px; color: var(--lg-muted); margin-top: 4px; }
.lg-empty-copy .lg-btn { margin-top: 14px; }
.lg-or { font-size: 13px; color: var(--lg-muted); margin-top: 10px; }
.lg-link { color: var(--lg-link); font-size: 14px; text-decoration: none; }
.lg-empty-copy .lg-link { display: inline-block; margin-top: 6px; }

.lg-interviews-title { font-size: 16px; font-weight: 700; }
.lg-interviews-sub { font-size: 13px; color: #5c5c5c; margin-top: 6px; }
.lg-interviews-sub a { color: var(--lg-link); text-decoration: none; }
.lg-ticks { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.lg-ticks li { font-size: 13px; padding-left: 22px; position: relative; }
.lg-ticks li::before {
  content: "✓"; position: absolute; left: 0; color: var(--lg-green); font-weight: 700;
}

.lg-testimonial { margin-top: 28px; border-top: 1px solid #dcdcdc; padding-top: 20px; }
.lg-testimonial-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.lg-testimonial-head .lg-heading { max-width: 150px; }
.lg-arrows { display: flex; gap: 6px; }
.lg-arrow { width: 16px; height: 16px; border-radius: 50%; background: #d5d5d5; }
.lg-arrow.is-on { background: var(--lg-green); }
.lg-video { display: block; width: 258px; max-width: 100%; height: auto; border-radius: 6px; margin-top: 12px; }
.lg-quote { font-size: 14px; line-height: 1.5; margin-top: 14px; }
.lg-brand { display: block; width: 140px; height: auto; margin-top: 10px; }
.lg-dots { display: flex; gap: 6px; justify-content: center; margin-top: 16px; }
.lg-dot { width: 6px; height: 6px; border-radius: 50%; background: #d5d5d5; }
.lg-dot.is-on { background: #6b6b6b; }

.lg-chat {
  position: absolute; right: 24px; bottom: 0;
  background: var(--lg-ink); color: #fff; font-size: 13px;
  padding: 10px 18px; border-radius: 4px 4px 0 0;
}

@media (max-width: 900px) {
  .lg-grid { grid-template-columns: minmax(0, 1fr); }
}
`
