/**
 * Privacy Policy Page
 * Concise, accurate privacy policy with Apple-grade reading layout
 * Content reflects the actual data architecture: Firebase Auth/Firestore/FCM + OpenAI
 */

import { ChevronLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { hapticLight } from "@/lib/haptics"
import { openUrl } from "@/lib/browser"

const EFFECTIVE_DATE = "February 10, 2026"
const CONTACT_EMAIL = "privacy@pcbrief.app"

/* ------------------------------------------------------------------ */
/* Shared typography primitives for legal pages                        */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-[32px]">
      <h2 className="mb-[10px] text-[17px] font-semibold leading-[1.24] tracking-[-0.4px] text-[var(--color-text-primary)]">
        {title}
      </h2>
      <div className="space-y-[10px] text-[15px] leading-[1.55] tracking-[-0.2px] text-[var(--color-text-secondary)]">
        {children}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function PrivacyPage() {
  const navigate = useNavigate()

  const handleBack = () => {
    hapticLight()
    navigate(-1)
  }

  const handleEmailLink = () => {
    openUrl(`mailto:${CONTACT_EMAIL}`)
  }

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-grouped)]">
      {/* ---- Sticky nav bar ---- */}
      <div
        className="sticky top-0 z-40 glass-nav border-b-[0.5px] border-[var(--color-separator)]"
        style={{ paddingTop: "var(--safe-area-inset-top)" }}
      >
        <div className="flex h-[44px] items-center px-[16px]">
          <button
            onClick={handleBack}
            aria-label="Go back"
            className="flex h-[44px] w-[44px] items-center justify-center -ml-[8px] rounded-full text-[var(--color-accent)] -webkit-tap-highlight-color-transparent active:bg-[var(--color-fill-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          >
            <ChevronLeft className="h-[22px] w-[22px]" strokeWidth={2.5} />
          </button>
          <h1 className="flex-1 text-center text-[17px] font-semibold tracking-[-0.4px] text-[var(--color-text-primary)] mr-[36px]">
            Privacy Policy
          </h1>
        </div>
      </div>

      {/* ---- Scrollable content ---- */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch"
      >
        <div
          className="mx-auto max-w-[600px] px-[20px] pt-[24px]"
          style={{ paddingBottom: "calc(40px + var(--safe-area-inset-bottom))" }}
        >
          {/* Effective date */}
          <p className="mb-[28px] text-[13px] tracking-[-0.08px] text-[var(--color-text-tertiary)]">
            Last updated {EFFECTIVE_DATE}
          </p>

          {/* ---------------------------------------------------- */}
          <Section title="1. Overview">
            <p>
              The Brief ("App") is committed to protecting your privacy. This policy explains what information we collect, how we use it, and what choices you have. By using the App you agree to the practices described here.
            </p>
          </Section>

          <Section title="2. What We Collect">
            <p>
              <strong className="text-[var(--color-text-primary)]">Account identifiers.</strong>{" "}
              When you use the App, Firebase Authentication creates an anonymous user ID. If you sign in with email, we also store your email address.
            </p>
            <p>
              <strong className="text-[var(--color-text-primary)]">Preferences &amp; bookmarks.</strong>{" "}
              Your notification settings, source preferences, and saved articles are stored in Cloud Firestore and linked to your account.
            </p>
            <p>
              <strong className="text-[var(--color-text-primary)]">Push notification tokens.</strong>{" "}
              If you enable notifications, we store your device push token (via Firebase Cloud Messaging) to deliver daily brief alerts.
            </p>
            <p>
              <strong className="text-[var(--color-text-primary)]">Ask AI conversations.</strong>{" "}
              Questions you submit to the Ask AI feature and the generated responses are stored in Firestore. Your questions are sent to OpenAI's API to generate answers.
            </p>
            <p>
              <strong className="text-[var(--color-text-primary)]">Basic usage data.</strong>{" "}
              We may collect general analytics (e.g. which features are used, crash reports) to improve the App.
            </p>
          </Section>

          <Section title="3. What We Do Not Collect">
            <p>
              We do not collect sensitive health information, financial account details, precise location data, contacts, or any data from other apps on your device.
            </p>
          </Section>

          <Section title="4. How We Use Your Data">
            <ul className="list-disc pl-[20px] space-y-[4px]">
              <li>Provide and operate the App's features (briefs, feed, bookmarks, AI chat)</li>
              <li>Deliver push notifications you've opted into</li>
              <li>Improve App performance and fix issues</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-[6px]">
              We do not sell your personal information.
            </p>
          </Section>

          <Section title="5. Third-Party Services">
            <p>The App relies on the following third-party services, each governed by their own privacy policies:</p>
            <ul className="list-disc pl-[20px] space-y-[4px]">
              <li>
                <strong className="text-[var(--color-text-primary)]">Firebase (Google)</strong> — Authentication, Cloud Firestore database, Cloud Functions, and Firebase Cloud Messaging for push notifications.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">OpenAI</strong> — Article summarization and the Ask AI conversational feature. Article text and your questions may be processed by OpenAI's systems.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Apple App Store</strong> — Distribution and app-level analytics.
              </li>
            </ul>
          </Section>

          <Section title="6. Data Retention">
            <p>
              Your account data (preferences, bookmarks, chat threads) is retained as long as your account exists. Signing out of a guest account permanently deletes associated data. Aggregated analytics may be retained for up to 26 months. You may request data deletion at any time by contacting us.
            </p>
          </Section>

          <Section title="7. Your Controls">
            <ul className="list-disc pl-[20px] space-y-[4px]">
              <li>
                <strong className="text-[var(--color-text-primary)]">Notifications:</strong> Disable daily brief notifications in Settings at any time.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Bookmarks:</strong> Remove individual bookmarks from your reading list.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Chat history:</strong> Delete Ask AI conversation threads from within the App.
              </li>
              <li>
                <strong className="text-[var(--color-text-primary)]">Account:</strong> Sign out to delete all guest data, or contact us for a full data removal request.
              </li>
            </ul>
          </Section>

          <Section title="8. Security">
            <p>
              We use reasonable technical and organizational measures to protect your data, including encryption in transit (TLS), secure cloud infrastructure with access controls, and limited personnel access. No system is perfectly secure, and we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="9. Children's Privacy">
            <p>
              The App is not intended for children under 13. We do not knowingly collect information from children. If you believe a child has provided us data, please contact us and we will promptly delete it.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Material changes will be reflected with an updated "Last updated" date. Continued use of the App after changes constitutes acceptance.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              Questions or concerns? Reach us at{" "}
              <button
                onClick={handleEmailLink}
                className="font-medium text-[var(--color-accent)] active:opacity-70"
              >
                {CONTACT_EMAIL}
              </button>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}
