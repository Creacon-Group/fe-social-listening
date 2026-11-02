import type { Metadata } from "next";
import { COMPANY, ContactBlock, LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy Policy — Social Listening by Creacon" };

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who We Are",
    body: (
      <>
        <p>
          Social Listening by Creacon (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;) is a brand monitoring and competitor analysis platform
          operated by {COMPANY.name}, a company incorporated under the laws of the Republic of Indonesia, with its registered office at AD PREMIER
          17th Floor, Suite 04 B, Jl. TB. Simatupang No. 5, Ragunan, Pasar Minggu, South Jakarta 12550, Indonesia.
        </p>
        <p>
          The Platform helps businesses understand what is said about their brands and competitors on social media and online news, through
          dashboards, reports, and an AI Brand Assistant.
        </p>
      </>
    ),
  },
  {
    id: "scope",
    title: "Scope and Our Role",
    body: (
      <>
        <p>This policy explains how we handle personal data in two distinct roles.</p>
        <h3>As a data controller</h3>
        <p>
          We act as a controller for personal data belonging to our business clients and their Authorised Users — the people who sign in to the
          Platform. We determine how that data is used to provide, secure, and improve the service.
        </p>
        <h3>As a data processor</h3>
        <p>
          We act as a processor for personal data contained in Listening Data — for example, the public handles and posts of people who mention a
          brand online. Our client determines why and how that data is processed; we process it only on their documented instructions. If you
          believe your content appears in the Platform and wish to exercise your rights, contact us using the details in Section 13 and we will
          work with the relevant client to respond.
        </p>
      </>
    ),
  },
  {
    id: "data",
    title: "Personal Data We Process",
    body: (
      <>
        <h3>Business client data</h3>
        <ul>
          <li>Account details: name, work email address, role, and account credentials</li>
          <li>Business details: company name and billing contact</li>
          <li>Usage data: sign-in records, actions taken in the Platform, AI Assistant questions and answers, and credit usage</li>
          <li>Technical data: IP address, browser type, device information, and session identifiers</li>
        </ul>
        <h3>Listening Data</h3>
        <p>Processed on behalf of our clients from social media and online news sources:</p>
        <ul>
          <li>Author username, display name, and profile link as published on the source platform</li>
          <li>Post, comment, or article content and its link</li>
          <li>Metadata: channel, publication time, time zone, and engagement figures such as likes, comments, shares, or views</li>
          <li>Analysis attributes: brand, sentiment label, and topic or category tags</li>
        </ul>
        <p>
          Listening Data is limited to content that was publicly available at the time it was collected by our client&apos;s social listening
          provider. We do not collect private messages.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "How and Why We Use Personal Data",
    body: (
      <>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-semibold">Purpose</th>
                <th className="py-2 pr-4 font-semibold">Data used</th>
                <th className="py-2 font-semibold">Legal basis</th>
              </tr>
            </thead>
            <tbody className="[&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_tr]:border-b [&_tr]:border-line">
              <tr>
                <td>Providing dashboards, competitor analysis, and reports</td>
                <td>Listening Data</td>
                <td>Processing on the client&apos;s instructions</td>
              </tr>
              <tr>
                <td>Answering questions through the AI Brand Assistant</td>
                <td>Listening Data, AI Assistant questions</td>
                <td>Processing on the client&apos;s instructions</td>
              </tr>
              <tr>
                <td>Account management, support, credits, and billing</td>
                <td>Business client data</td>
                <td>Performance of a contract</td>
              </tr>
              <tr>
                <td>Security, fraud prevention, and abuse monitoring</td>
                <td>Usage and technical data</td>
                <td>Legitimate interest</td>
              </tr>
              <tr>
                <td>Meeting legal and regulatory obligations</td>
                <td>As required</td>
                <td>Legal obligation</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          We do not sell personal data. We do not use Client Data to train our own models, and we do not use it for any purpose other than delivering
          the service to the client on whose behalf it was collected.
        </p>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI Brand Assistant",
    body: (
      <p>
        When an Authorised User asks the AI Brand Assistant a question, the question and relevant excerpts of the project&apos;s Listening Data are sent
        to third-party AI model providers to generate an answer. Answers are produced automatically and may be inaccurate. Users should not enter
        sensitive personal data into the Assistant.
      </p>
    ),
  },
  {
    id: "providers",
    title: "Service Providers and Disclosure",
    body: (
      <>
        <p>We share personal data only with parties that help us operate the Platform, and only to the extent necessary:</p>
        <ul>
          <li>Application hosting and file storage providers</li>
          <li>Managed database providers</li>
          <li>AI model providers, for the AI Brand Assistant</li>
          <li>Social listening data providers engaged by or for our client</li>
        </ul>
        <p>
          We may also disclose personal data where required by law, court order, or a valid request from a competent public authority, and in
          connection with a merger, acquisition, or sale of assets — in which case we will notify affected clients in advance.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "International Transfers",
    body: (
      <p>
        Some of our service providers process data outside Indonesia. Where this occurs, we rely on contractual safeguards with those providers
        requiring a level of protection consistent with Indonesian data protection law.
      </p>
    ),
  },
  {
    id: "retention",
    title: "Retention",
    body: (
      <>
        <p>
          Listening Data is retained for as long as our client&apos;s agreement with us remains in effect, or for the retention period specified by that
          client, whichever is shorter. On termination, we delete or return it within 30 days, except where retention is required by law.
        </p>
        <p>Business client account data is retained for the duration of the account and for 1 year afterwards to meet legal, tax, and audit obligations.</p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        We maintain technical and organisational measures appropriate to the risk, including encryption of data in transit, role-based access
        controls, audit logging, and regular review of our security practices. No system can be guaranteed completely secure, and we encourage clients
        to protect their own account credentials.
      </p>
    ),
  },
  {
    id: "rights",
    title: "Your Rights",
    body: (
      <>
        <p>Subject to applicable law, individuals have the right to:</p>
        <ul>
          <li>Access the personal data we hold about them</li>
          <li>Request correction of inaccurate or incomplete data</li>
          <li>Request deletion of their data</li>
          <li>Object to or restrict certain processing</li>
          <li>Request a copy of their data in a portable format</li>
          <li>Withdraw consent, where processing is based on consent</li>
        </ul>
        <p>Contact us using the details in Section 13.</p>
      </>
    ),
  },
  {
    id: "deletion",
    title: "Data Deletion",
    body: (
      <p>
        To request deletion of personal data held in the Platform, email {COMPANY.email} with the subject line &quot;Data Deletion Request&quot;,
        including the account, username, or content link concerned. We will acknowledge and complete verified requests within 7 business days, unless
        we are legally required to retain the data.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        The Platform is a business tool and is not directed at children. We do not knowingly collect personal data from anyone under the age of 18 as
        an Authorised User. If we become aware that we hold such data, we will delete it.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact Us",
    body: <ContactBlock extra={<span className="block">Response time for privacy requests: 7 business days</span>} />,
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    body: (
      <p>
        We may update this policy from time to time. Material changes will be notified to business clients by email or through the Platform at least
        30 days before taking effect. The date at the top of this page shows when it was last revised.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="November 2, 2026"
      sections={sections}
      other={{ href: "/terms-of-service", label: "Terms of Service" }}
    />
  );
}
