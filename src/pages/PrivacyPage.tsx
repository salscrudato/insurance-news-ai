/**
 * Privacy Policy Page
 * Comprehensive privacy policy for The Brief mobile application
 */

import { ChevronLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { hapticLight } from "@/lib/haptics"

const EFFECTIVE_DATE = "February 10, 2026"
const COMPANY_NAME = "The Brief"
const APP_NAME = "The Brief"
const CONTACT_EMAIL = "privacy@pcbrief.app"

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

export function PrivacyPage() {
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
            Privacy Policy
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-[20px] py-[24px]" style={{ paddingBottom: "calc(24px + var(--safe-area-inset-bottom))" }}>
        {/* Last Updated */}
        <p className="mb-[24px] text-[13px] tracking-[-0.08px] text-[var(--color-text-tertiary)]">
          Effective Date: {EFFECTIVE_DATE}
        </p>

        <Section title="1. Introduction">
          <p>
            {COMPANY_NAME} ("Company," "we," "us," or "our") is committed to protecting your privacy. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
            when you use our {APP_NAME} mobile application ("App").
          </p>
          <p>
            Please read this Privacy Policy carefully. By using the App, you consent to the practices 
            described in this policy. If you do not agree with the terms of this Privacy Policy, 
            please do not access or use the App.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <SubSection title="2.1 Information Collected Automatically">
            <p>When you use the App, we may automatically collect:</p>
            <ul className="list-disc pl-[20px] space-y-[6px]">
              <li><strong>Device Information:</strong> Device type, operating system version, unique device identifiers, and mobile network information</li>
              <li><strong>Usage Data:</strong> App features accessed, articles viewed, time spent in the App, and interaction patterns</li>
              <li><strong>Log Data:</strong> IP address, browser type, access times, pages viewed, and referring URLs</li>
              <li><strong>Analytics Data:</strong> Aggregated usage statistics to improve App performance and user experience</li>
            </ul>
          </SubSection>
          <SubSection title="2.2 Information You Provide">
            <p>We may collect information you voluntarily provide:</p>
            <ul className="list-disc pl-[20px] space-y-[6px]">
              <li><strong>Preferences:</strong> Notification settings, topic preferences, and reading preferences</li>
              <li><strong>Bookmarks:</strong> Articles you save for later reading</li>
              <li><strong>Feedback:</strong> Any feedback, suggestions, or communications you send to us</li>
            </ul>
          </SubSection>
          <SubSection title="2.3 Anonymous Authentication">
            <p>
              The App uses anonymous authentication provided by Firebase. This means we do not require 
              you to create an account with personal information such as your name, email address, or 
              phone number. Your preferences and bookmarks are associated with an anonymous identifier 
              that is not linked to your personal identity.
            </p>
          </SubSection>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-[20px] space-y-[6px]">
            <li>Provide, maintain, and improve the App's functionality</li>
            <li>Personalize your experience and deliver relevant content</li>
            <li>Send push notifications (with your consent) about daily briefings</li>
            <li>Analyze usage patterns to enhance App performance</li>
            <li>Detect, prevent, and address technical issues and security threats</li>
            <li>Comply with legal obligations and enforce our Terms of Service</li>
          </ul>
        </Section>

        <Section title="4. Third-Party Services">
          <p>
            We use third-party services that may collect information about you. These services have
            their own privacy policies governing the use of your information:
          </p>
          <SubSection title="4.1 Firebase (Google)">
            <p>
              We use Firebase for authentication, database services, and analytics. Firebase may collect
              device identifiers, usage data, and crash reports. For more information, see
              Google's Privacy Policy at privacy.google.com.
            </p>
          </SubSection>
          <SubSection title="4.2 OpenAI">
            <p>
              We use OpenAI's API to generate AI-powered summaries and analysis. Article content may be
              processed by OpenAI's systems. OpenAI's use of data is governed by their privacy policy
              at openai.com/privacy.
            </p>
          </SubSection>
          <SubSection title="4.3 Apple App Store">
            <p>
              If you download the App from the Apple App Store, Apple may collect certain information
              as described in Apple's Privacy Policy at apple.com/privacy.
            </p>
          </SubSection>
        </Section>

        <Section title="5. Data Sharing and Disclosure">
          <p>We may share your information in the following circumstances:</p>
          <ul className="list-disc pl-[20px] space-y-[6px]">
            <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf (hosting, analytics, AI processing)</li>
            <li><strong>Legal Requirements:</strong> When required by law, court order, or governmental authority</li>
            <li><strong>Protection of Rights:</strong> To protect our rights, privacy, safety, or property, or that of our users or others</li>
            <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            <li><strong>Aggregated Data:</strong> We may share aggregated, non-identifiable information for research or analysis</li>
          </ul>
          <p className="mt-[12px]">
            We do not sell your personal information to third parties.
          </p>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain your information for as long as necessary to provide the App's services and
            fulfill the purposes described in this Privacy Policy. Specifically:
          </p>
          <ul className="list-disc pl-[20px] space-y-[6px]">
            <li><strong>Anonymous User Data:</strong> Retained until you sign out or the anonymous session expires</li>
            <li><strong>Usage Analytics:</strong> Retained in aggregated form for up to 26 months</li>
            <li><strong>Log Data:</strong> Retained for up to 90 days for security and debugging purposes</li>
          </ul>
          <p className="mt-[12px]">
            When you sign out of the App, your bookmarks and preferences are permanently deleted and
            cannot be recovered.
          </p>
        </Section>

        <Section title="7. Data Security">
          <p>
            We implement appropriate technical and organizational security measures to protect your
            information, including:
          </p>
          <ul className="list-disc pl-[20px] space-y-[6px]">
            <li>Encryption of data in transit using TLS/SSL</li>
            <li>Secure cloud infrastructure with access controls</li>
            <li>Regular security assessments and monitoring</li>
            <li>Limited access to personal data by authorized personnel only</li>
          </ul>
          <p className="mt-[12px]">
            However, no method of transmission over the Internet or electronic storage is 100% secure.
            While we strive to protect your information, we cannot guarantee its absolute security.
          </p>
        </Section>

        <Section title="8. Your Rights and Choices">
          <SubSection title="8.1 Push Notifications">
            <p>
              You can opt out of push notifications at any time through the App's settings or your
              device's notification settings.
            </p>
          </SubSection>
          <SubSection title="8.2 Data Deletion">
            <p>
              You can delete your data by signing out of the App. This will permanently remove your
              bookmarks and preferences. For additional data deletion requests, contact us at {CONTACT_EMAIL}.
            </p>
          </SubSection>
          <SubSection title="8.3 Access and Portability">
            <p>
              You may request access to or a copy of your data by contacting us. We will respond to
              your request within 30 days.
            </p>
          </SubSection>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            The App is not intended for children under the age of 13. We do not knowingly collect
            personal information from children under 13. If we become aware that we have collected
            personal information from a child under 13, we will take steps to delete such information
            promptly. If you believe we have collected information from a child under 13, please
            contact us at {CONTACT_EMAIL}.
          </p>
        </Section>

        <Section title="10. International Data Transfers">
          <p>
            Your information may be transferred to and processed in countries other than your country
            of residence, including the United States. These countries may have data protection laws
            that differ from those in your country. By using the App, you consent to the transfer of
            your information to these countries.
          </p>
          <p>
            We take appropriate safeguards to ensure that your information remains protected in
            accordance with this Privacy Policy when transferred internationally.
          </p>
        </Section>

        <Section title="11. California Privacy Rights (CCPA)">
          <p>
            If you are a California resident, you have additional rights under the California Consumer
            Privacy Act (CCPA):
          </p>
          <ul className="list-disc pl-[20px] space-y-[6px]">
            <li><strong>Right to Know:</strong> You can request information about the categories and specific pieces of personal information we have collected</li>
            <li><strong>Right to Delete:</strong> You can request deletion of your personal information</li>
            <li><strong>Right to Opt-Out:</strong> You can opt out of the sale of your personal information (we do not sell personal information)</li>
            <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights</li>
          </ul>
          <p className="mt-[12px]">
            To exercise these rights, contact us at {CONTACT_EMAIL}.
          </p>
        </Section>

        <Section title="12. European Privacy Rights (GDPR)">
          <p>
            If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland,
            you have additional rights under the General Data Protection Regulation (GDPR):
          </p>
          <ul className="list-disc pl-[20px] space-y-[6px]">
            <li><strong>Right of Access:</strong> Request access to your personal data</li>
            <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
            <li><strong>Right to Erasure:</strong> Request deletion of your personal data</li>
            <li><strong>Right to Restrict Processing:</strong> Request limitation of processing</li>
            <li><strong>Right to Data Portability:</strong> Request transfer of your data</li>
            <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
            <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
          </ul>
          <p className="mt-[12px]">
            Our legal basis for processing your information includes: consent, performance of a
            contract, compliance with legal obligations, and legitimate interests.
          </p>
        </Section>

        <Section title="13. Changes to This Privacy Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material
            changes by posting the new Privacy Policy in the App and updating the "Effective Date"
            at the top. Your continued use of the App after any changes constitutes acceptance of
            the updated Privacy Policy.
          </p>
          <p>
            We encourage you to review this Privacy Policy periodically for any changes.
          </p>
        </Section>

        <Section title="14. Contact Us">
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our
            data practices, please contact us at:
          </p>
          <p className="mt-[8px] font-medium text-[var(--color-text-primary)]">
            {COMPANY_NAME}<br />
            Email: {CONTACT_EMAIL}
          </p>
          <p className="mt-[12px]">
            For data protection inquiries in the European Union, you may also contact your local
            data protection authority.
          </p>
        </Section>

        {/* Footer spacing */}
        <div className="h-[20px]" />
      </div>
    </div>
  )
}

