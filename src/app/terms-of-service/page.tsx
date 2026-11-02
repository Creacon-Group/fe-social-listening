import type { Metadata } from "next";
import { COMPANY, ContactBlock, LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service — Social Listening by Creacon" };

const P = "Social Listening by Creacon";

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement",
    body: (
      <>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern access to and use of {P} (&quot;the Platform&quot;), operated by {COMPANY.name}, a
          company incorporated under the laws of the Republic of Indonesia (&quot;Creacon&quot;, &quot;we&quot;, &quot;us&quot;), with its registered office at
          AD PREMIER 17th Floor, Suite 04 B, Jl. TB. Simatupang No. 5, Ragunan, Pasar Minggu, South Jakarta 12550, Indonesia.
        </p>
        <p>
          By accessing the Platform, signing in to an account, or entering into an order form or service agreement that references these Terms,
          you (&quot;Client&quot;, &quot;you&quot;) agree to be bound by them. If you are accepting on behalf of an organisation, you confirm you have
          authority to bind that organisation.
        </p>
      </>
    ),
  },
  {
    id: "definitions",
    title: "Definitions",
    body: (
      <ul>
        <li>
          <strong>Platform</strong> — the {P} web application, dashboards, reports, AI Brand Assistant, and related services.
        </li>
        <li>
          <strong>Listening Data</strong> — mentions, posts, comments, articles, and related metadata collected from social media and online
          news sources, including author handles, content, links, engagement figures, channel, and sentiment labels.
        </li>
        <li>
          <strong>Client Data</strong> — data you or we upload to or generate within the Platform on your behalf, including Listening Data,
          project settings, reports, and AI Assistant conversations.
        </li>
        <li>
          <strong>Authorised User</strong> — an individual to whom an account on the Platform has been issued for your organisation.
        </li>
      </ul>
    ),
  },
  {
    id: "service",
    title: "The Service",
    body: (
      <>
        <p>The Platform provides brand monitoring and competitor analysis based on social listening data, including:</p>
        <ul>
          <li>Ingesting Listening Data through file upload or data integrations</li>
          <li>Dashboards for mention volume, sentiment, and share of voice across channels</li>
          <li>Competitor analysis, including share of voice and net sentiment score</li>
          <li>Mention browsing, filtering, and reporting</li>
          <li>An AI Brand Assistant that answers questions based on your project&apos;s Listening Data, subject to usage credits</li>
        </ul>
        <p>The scope, data volume, usage credits, and commercial terms applicable to your account are set out in your order form or service agreement.</p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts",
    body: (
      <p>
        Accounts are issued by us or by your organisation&apos;s administrator. You must keep account information accurate and current. You are
        responsible for all activity under your accounts and for safeguarding credentials. Notify us promptly at {COMPANY.email} if you suspect
        unauthorised access. Accounts may not be shared between individuals or organisations.
      </p>
    ),
  },
  {
    id: "responsibilities",
    title: "Your Responsibilities",
    body: (
      <>
        <h3>Lawful data</h3>
        <p>
          You are responsible for ensuring that any data you provide to the Platform was collected lawfully and that you have the rights and a lawful
          basis to process it, including under the terms of the social media platforms and data providers it originates from.
        </p>
        <h3>Use of insights</h3>
        <p>
          You are responsible for how you use dashboards, reports, and AI Assistant answers. Sentiment labels and AI-generated answers are produced
          automatically or from source data and may be inaccurate; you should verify them before relying on them for important decisions.
        </p>
        <h3>Authorised Users</h3>
        <p>You are responsible for ensuring your Authorised Users comply with these Terms.</p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use",
    body: (
      <>
        <p>You may not use the Platform to:</p>
        <ul>
          <li>Harass, profile for unlawful purposes, or target individuals identified in Listening Data</li>
          <li>Upload unlawful, fraudulent, defamatory, or infringing content, or data you have no right to process</li>
          <li>Infringe intellectual property or privacy rights of any person</li>
          <li>Distribute malware or attempt to gain unauthorised access to the Platform or any connected system</li>
          <li>Circumvent usage limits, AI Assistant credits, or access controls</li>
          <li>Resell or provide the Platform to third parties without our written consent</li>
          <li>Conduct load testing, scraping, or automated access outside documented interfaces without prior approval</li>
        </ul>
        <p>We may suspend access immediately where we reasonably believe continued use poses a risk to the Platform, to other clients, or to us.</p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third-Party Services",
    body: (
      <p>
        The Platform depends on services operated by third parties, including hosting, database, file storage, social listening data, and AI model
        providers. Their availability, policies, pricing, and technical behaviour are outside our control. We are not liable for interruptions,
        changes, or losses arising from those services, including changes in data availability from source platforms or in AI model behaviour.
      </p>
    ),
  },
  {
    id: "fees",
    title: "Fees and Payment",
    body: (
      <p>
        Fees are set out in your order form. Invoices are payable within [NUMBER] days. Late payment may result in suspension after written notice.
        All fees are exclusive of applicable taxes, which you are responsible for.
      </p>
    ),
  },
  {
    id: "client-data",
    title: "Client Data and Data Protection",
    body: (
      <p>
        You retain all rights in Client Data. You grant us a limited licence to process it solely to provide the Platform to you. We process personal
        data contained in Client Data as your processor, on your documented instructions, as described in our Privacy Policy and any data processing
        agreement between us. You are responsible for ensuring you have a lawful basis for the data you provide to us.
      </p>
    ),
  },
  {
    id: "ip",
    title: "Intellectual Property",
    body: (
      <p>
        The Platform, including its software, interface, and documentation, remains the property of {COMPANY.name} and its licensors. These Terms
        grant you a non-exclusive, non-transferable right to use the Platform during the term, and no other rights. You may not copy, modify,
        reverse-engineer, or create derivative works from the Platform.
      </p>
    ),
  },
  {
    id: "confidentiality",
    title: "Confidentiality",
    body: (
      <p>
        Each party will protect the other&apos;s confidential information with at least reasonable care, use it only for purposes of the agreement, and
        disclose it only to personnel who need it and are bound by comparable obligations. This does not apply to information that is public,
        independently developed, or required to be disclosed by law.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Service Availability",
    body: (
      <>
        <p>
          We aim to keep the Platform available but do not warrant uninterrupted operation. Planned maintenance will be notified in advance where
          practicable. Any service level commitments apply only if expressly stated in your order form.
        </p>
        <p>
          Support requests, configuration changes, and change requests submitted to {COMPANY.email} are handled within 7 business days of receipt,
          unless a different timeframe is agreed in writing.
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "Disclaimer",
    body: (
      <p>
        Except as expressly stated in these Terms, the Platform is provided &quot;as is&quot; and &quot;as available&quot;. To the fullest extent permitted by
        law, we disclaim all implied warranties, including merchantability, fitness for a particular purpose, and non-infringement. We do not warrant
        that Listening Data is complete, that sentiment labels are accurate, or that AI Assistant answers are correct.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    body: (
      <>
        <p>
          To the fullest extent permitted by law, neither party is liable for indirect, incidental, special, consequential, or punitive damages, or
          for lost profits, revenue, or data.
        </p>
        <p>
          Our total aggregate liability arising out of or relating to these Terms will not exceed the total fees paid by you to us in the [NUMBER]
          months preceding the event giving rise to the claim.
        </p>
        <p>Nothing in these Terms limits liability that cannot be limited under applicable law.</p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <p>
        You will indemnify and hold us harmless against claims, damages, and reasonable costs arising from data you provide to the Platform, your use
        of insights produced by the Platform, your breach of these Terms, or your violation of applicable law or third-party platform terms.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Term and Termination",
    body: (
      <>
        <p>
          These Terms remain in effect while your account is active. Either party may terminate for material breach that remains uncured [NUMBER] days
          after written notice. We may terminate immediately where required by law.
        </p>
        <p>
          On termination, your access ends and we will make Client Data available for export for [NUMBER] days, after which it will be deleted in
          accordance with our Privacy Policy. Provisions that by their nature should survive — including confidentiality, intellectual property,
          limitation of liability, and indemnity — will survive.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to These Terms",
    body: (
      <p>
        We may amend these Terms. Material changes will be notified at least 30 days before they take effect. Continued use after the effective date
        constitutes acceptance. If you do not accept a material change, you may terminate before it takes effect.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing Law and Disputes",
    body: (
      <p>
        These Terms are governed by the laws of the Republic of Indonesia. The parties will first attempt to resolve any dispute through good-faith
        discussion. Failing that, disputes will be submitted to [the District Court of South Jakarta, or BANI arbitration in Jakarta].
      </p>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <p>
        These Terms, together with your order form and our Privacy Policy, form the entire agreement between the parties on this subject. If any
        provision is held unenforceable, the remainder stays in effect. Failure to enforce a provision is not a waiver. You may not assign these
        Terms without our written consent.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: <ContactBlock extra={<span className="block">Standard turnaround for support and change requests: 7 business days</span>} />,
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="November 2, 2026"
      sections={sections}
      other={{ href: "/privacy-policy", label: "Privacy Policy" }}
    />
  );
}
