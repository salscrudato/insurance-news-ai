/**
 * Terms of Service Page
 * Concise, App Store–ready legal terms with Apple-grade reading layout
 */

import { ChevronLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { hapticLight } from "@/lib/haptics"
import { openUrl } from "@/lib/browser"

const EFFECTIVE_DATE = "February 10, 2026"
const CONTACT_EMAIL = "legal@pcbrief.app"

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

export function TermsPage() {
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
            Terms of Service
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
          <Section title="1. Acceptance of Terms">
            <p>
              By using The Brief ("App"), you agree to these Terms of Service. If you do not agree, please do not use the App. We may update these Terms from time to time; continued use after changes constitutes acceptance.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              The Brief is a news aggregation platform focused on the property and casualty (P&C) insurance industry. The App curates articles from third-party publishers and provides AI-generated summaries, daily briefings, and a conversational AI assistant powered by those sources.
            </p>
          </Section>

          <Section title="3. Informational Purposes Only">
            <p>
              All content in the App—including AI-generated summaries, analysis, and chat responses—is provided for general informational purposes only. Nothing in the App constitutes professional, legal, financial, insurance, or investment advice. You should consult qualified professionals before making decisions based on information obtained through the App.
            </p>
            <p>
              While we strive for accuracy, AI-generated content may contain errors or omissions. Always verify important information with original sources.
            </p>
          </Section>

          <Section title="4. User Accounts">
            <p>
              The App supports anonymous (guest) authentication and optional sign-in via Apple or Google. Your preferences, bookmarks, and chat history are associated with your account.
            </p>
            <p>
              You may delete your account at any time from <strong className="text-[var(--color-text-primary)]">Settings → Delete Account</strong>. Deleting your account permanently removes all associated data including preferences, bookmarks, chat history, and push notification tokens. This action is immediate and cannot be undone.
            </p>
            <p>
              Signing out of a guest account will clear associated data.
            </p>
          </Section>

          <Section title="5. Intellectual Property &amp; Content Attribution">
            <p>
              The App's design, features, and proprietary technology are owned by The Brief. News articles, images, and other publisher content displayed in the App remain the property of their respective owners. We link to original sources and do not claim ownership of third-party content.
            </p>
          </Section>

          <Section title="6. Acceptable Use">
            <p>You agree not to:</p>
            <ul className="list-disc pl-[20px] space-y-[4px]">
              <li>Use the App for any unlawful purpose</li>
              <li>Scrape, crawl, or use automated means to access the App</li>
              <li>Reverse engineer, decompile, or disassemble any part of the App</li>
              <li>Interfere with or disrupt the App's functionality</li>
              <li>Resell, redistribute, or commercially exploit App content</li>
            </ul>
          </Section>

          <Section title="7. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, The Brief and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App, including reliance on any content provided. Our total liability shall not exceed the amount, if any, you paid for access to the App.
            </p>
          </Section>

          <Section title="8. Termination">
            <p>
              We may suspend or terminate your access at any time, without prior notice, if you violate these Terms. Upon termination your right to use the App ceases immediately.
            </p>
          </Section>

          <Section title="9. Governing Law">
            <p>
              These Terms are governed by the laws of the State of New Jersey, United States, without regard to conflict-of-law provisions.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Questions about these Terms? Reach us at{" "}
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
