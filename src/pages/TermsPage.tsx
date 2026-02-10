/**
 * Terms of Service Page
 * Comprehensive legal terms for The Brief mobile application
 */

import { ChevronLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { hapticLight } from "@/lib/haptics"

const EFFECTIVE_DATE = "February 10, 2026"
const COMPANY_NAME = "The Brief"
const APP_NAME = "The Brief"
const CONTACT_EMAIL = "legal@pcbrief.app"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-[28px]">
      <h2 className="mb-[12px] text-[17px] font-semibold tracking-[-0.24px] text-[var(--color-text-primary)]">
        {title}
      </h2>
      <div className="space-y-[12px] text-[15px] leading-[1.5] tracking-[-0.16px] text-[var(--color-text-secondary)]">
        {children}
      </div>
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-[16px]">
      <h3 className="mb-[8px] text-[15px] font-medium text-[var(--color-text-primary)]">
        {title}
      </h3>
      <div className="space-y-[8px]">{children}</div>
    </div>
  )
}

export function TermsPage() {
  const navigate = useNavigate()

  const handleBack = () => {
    hapticLight()
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-grouped)]">
      {/* Header */}
      <div
        className="sticky top-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-xl border-b border-[var(--color-separator)]"
        style={{ paddingTop: "var(--safe-area-inset-top)" }}
      >
        <div className="flex h-[52px] items-center px-[16px]">
          <button
            onClick={handleBack}
            className="flex h-[44px] w-[44px] items-center justify-center -ml-[8px] rounded-full text-[var(--color-accent)] active:bg-[var(--color-fill-tertiary)]"
          >
            <ChevronLeft className="h-[24px] w-[24px]" strokeWidth={2} />
          </button>
          <h1 className="flex-1 text-center text-[17px] font-semibold tracking-[-0.24px] text-[var(--color-text-primary)] mr-[36px]">
            Terms of Service
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-[20px] py-[24px]" style={{ paddingBottom: "calc(24px + var(--safe-area-inset-bottom))" }}>
        {/* Last Updated */}
        <p className="mb-[24px] text-[13px] tracking-[-0.08px] text-[var(--color-text-tertiary)]">
          Effective Date: {EFFECTIVE_DATE}
        </p>

        <Section title="1. Acceptance of Terms">
          <p>
            By downloading, installing, accessing, or using the {APP_NAME} mobile application ("App"), 
            you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these 
            Terms, do not use the App.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you ("User," "you," or "your") 
            and {COMPANY_NAME} ("Company," "we," "us," or "our"). We reserve the right to modify these 
            Terms at any time. Continued use of the App after any modifications constitutes acceptance 
            of the updated Terms.
          </p>
        </Section>

        <Section title="2. Description of Service">
          <p>
            {APP_NAME} is a news aggregation and artificial intelligence-powered analysis platform 
            focused on the property and casualty (P&C) insurance industry. The App provides:
          </p>
          <ul className="list-disc pl-[20px] space-y-[6px]">
            <li>Curated news articles from third-party sources</li>
            <li>AI-generated summaries, analysis, and insights</li>
            <li>Daily briefings and notifications</li>
            <li>Article bookmarking and personalization features</li>
          </ul>
        </Section>

        <Section title="3. User Accounts and Registration">
          <p>
            The App uses anonymous authentication to provide personalized features. By using the App, 
            you acknowledge that:
          </p>
          <ul className="list-disc pl-[20px] space-y-[6px]">
            <li>Your preferences and bookmarks are stored anonymously</li>
            <li>Signing out will result in permanent loss of your saved data</li>
            <li>We do not require or store personally identifiable information for basic App functionality</li>
          </ul>
        </Section>

        <Section title="4. Intellectual Property Rights">
          <SubSection title="4.1 Our Content">
            <p>
              The App, including its design, features, AI-generated content, and proprietary technology, 
              is owned by {COMPANY_NAME} and protected by copyright, trademark, and other intellectual 
              property laws. You may not copy, modify, distribute, sell, or lease any part of our 
              services or software without our express written permission.
            </p>
          </SubSection>
          <SubSection title="4.2 Third-Party Content">
            <p>
              News articles, images, and other content displayed in the App are sourced from third-party 
              publishers and remain the property of their respective owners. We provide links to original 
              sources and do not claim ownership of third-party content. Your use of such content is 
              subject to the terms and policies of the original publishers.
            </p>
          </SubSection>
          <SubSection title="4.3 AI-Generated Content">
            <p>
              Summaries, analyses, and insights generated by our AI systems are provided for informational 
              purposes only. While we strive for accuracy, AI-generated content may contain errors, 
              omissions, or inaccuracies. You should verify important information with original sources.
            </p>
          </SubSection>
        </Section>

        <Section title="5. Acceptable Use Policy">
          <p>You agree not to:</p>
          <ul className="list-disc pl-[20px] space-y-[6px]">
            <li>Use the App for any unlawful purpose or in violation of any applicable laws</li>
            <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
            <li>Interfere with or disrupt the App's functionality or servers</li>
            <li>Scrape, crawl, or use automated means to access the App without permission</li>
            <li>Reverse engineer, decompile, or disassemble any part of the App</li>
            <li>Remove, alter, or obscure any copyright or proprietary notices</li>
            <li>Use the App to transmit malware, viruses, or harmful code</li>
            <li>Resell, redistribute, or commercially exploit the App or its content</li>
          </ul>
        </Section>

        <Section title="6. Disclaimers">
          <SubSection title="6.1 No Professional Advice">
            <p>
              The content provided through the App is for general informational purposes only and does
              not constitute professional, legal, financial, insurance, or investment advice. You should
              consult qualified professionals before making any decisions based on information obtained
              through the App.
            </p>
          </SubSection>
          <SubSection title="6.2 Accuracy of Information">
            <p>
              While we strive to provide accurate and up-to-date information, we make no representations
              or warranties about the completeness, accuracy, reliability, suitability, or availability
              of the App or the information, products, services, or related graphics contained in the App.
              Any reliance you place on such information is strictly at your own risk.
            </p>
          </SubSection>
          <SubSection title="6.3 Third-Party Links">
            <p>
              The App may contain links to third-party websites or services. We have no control over and
              assume no responsibility for the content, privacy policies, or practices of any third-party
              sites or services. You acknowledge and agree that we shall not be responsible or liable for
              any damage or loss caused by your use of any such content, goods, or services.
            </p>
          </SubSection>
        </Section>

        <Section title="7. Limitation of Liability">
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL {COMPANY_NAME}, ITS
            AFFILIATES, DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT,
            INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED
            TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, RESULTING FROM:
          </p>
          <ul className="list-disc pl-[20px] space-y-[6px]">
            <li>Your access to or use of (or inability to access or use) the App</li>
            <li>Any conduct or content of any third party on the App</li>
            <li>Any content obtained from the App</li>
            <li>Unauthorized access, use, or alteration of your transmissions or content</li>
          </ul>
          <p className="mt-[12px]">
            IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE AMOUNT YOU PAID US,
            IF ANY, FOR ACCESS TO THE APP DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>
        </Section>

        <Section title="8. Indemnification">
          <p>
            You agree to defend, indemnify, and hold harmless {COMPANY_NAME}, its affiliates, and their
            respective officers, directors, employees, and agents from and against any claims, liabilities,
            damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any
            way connected with:
          </p>
          <ul className="list-disc pl-[20px] space-y-[6px]">
            <li>Your access to or use of the App</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights, including intellectual property rights</li>
            <li>Any claim that your use of the App caused damage to a third party</li>
          </ul>
        </Section>

        <Section title="9. Termination">
          <p>
            We may terminate or suspend your access to the App immediately, without prior notice or
            liability, for any reason, including if you breach these Terms. Upon termination, your
            right to use the App will immediately cease. All provisions of these Terms which by their
            nature should survive termination shall survive, including ownership provisions, warranty
            disclaimers, indemnity, and limitations of liability.
          </p>
        </Section>

        <Section title="10. Governing Law and Dispute Resolution">
          <SubSection title="10.1 Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State
              of Delaware, United States, without regard to its conflict of law provisions.
            </p>
          </SubSection>
          <SubSection title="10.2 Arbitration">
            <p>
              Any dispute arising from or relating to these Terms or the App shall be resolved through
              binding arbitration in accordance with the rules of the American Arbitration Association.
              The arbitration shall be conducted in English and take place in Wilmington, Delaware.
              The arbitrator's decision shall be final and binding.
            </p>
          </SubSection>
          <SubSection title="10.3 Class Action Waiver">
            <p>
              YOU AGREE THAT ANY CLAIMS MUST BE BROUGHT IN YOUR INDIVIDUAL CAPACITY AND NOT AS A
              PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.
            </p>
          </SubSection>
        </Section>

        <Section title="11. General Provisions">
          <SubSection title="11.1 Entire Agreement">
            <p>
              These Terms, together with our Privacy Policy, constitute the entire agreement between
              you and {COMPANY_NAME} regarding the App and supersede all prior agreements.
            </p>
          </SubSection>
          <SubSection title="11.2 Severability">
            <p>
              If any provision of these Terms is found to be unenforceable, the remaining provisions
              will continue in full force and effect.
            </p>
          </SubSection>
          <SubSection title="11.3 Waiver">
            <p>
              Our failure to enforce any right or provision of these Terms will not be considered a
              waiver of those rights.
            </p>
          </SubSection>
          <SubSection title="11.4 Assignment">
            <p>
              You may not assign or transfer these Terms without our prior written consent. We may
              assign our rights and obligations under these Terms without restriction.
            </p>
          </SubSection>
        </Section>

        <Section title="12. Contact Information">
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p className="mt-[8px] font-medium text-[var(--color-text-primary)]">
            {COMPANY_NAME}<br />
            Email: {CONTACT_EMAIL}
          </p>
        </Section>

        {/* Footer spacing */}
        <div className="h-[20px]" />
      </div>
    </div>
  )
}

