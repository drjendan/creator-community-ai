export type LegalDocumentType = "terms" | "privacy" | "cookies" | "acceptable_use" | "refund";

export const legalDocumentLabels: Record<LegalDocumentType, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  cookies: "Cookie Policy",
  acceptable_use: "Acceptable Use Policy",
  refund: "Refund Policy"
};

export const legalDocumentPaths: Record<Exclude<LegalDocumentType, "refund">, string> = {
  terms: "/terms",
  privacy: "/privacy",
  cookies: "/cookies",
  acceptable_use: "/acceptable-use"
};

export const defaultLegalVersion = "2026.07";

export const defaultLegalContent: Record<LegalDocumentType, string> = {
  terms: `Using UpNexx

These Terms of Service govern access to the UpNexx platform operated by Nexx Jenn Technologies. By creating an account or using UpNexx, you agree to these terms and the Privacy Policy.

Accounts and organizations

You must provide accurate account information, keep credentials secure, and promptly notify us of unauthorized access. Organization owners are responsible for activity performed by their administrators, team members, and configured integrations.

Subscriptions and payments

Paid platform subscriptions renew according to the selected billing interval until canceled. Fees and applicable taxes are disclosed before purchase. Tenant businesses separately control their own member offerings, refund terms, and customer relationships.

Content and licenses

You retain ownership of content you submit. You grant UpNexx a limited license to host, process, display, and transmit that content solely to operate and improve the services. You must have the rights required to upload or distribute your content.

Service use

You may not misuse the platform, interfere with service operation, bypass access controls, or use UpNexx in violation of the Acceptable Use Policy. We may suspend access when reasonably necessary to protect users, the service, or third parties.

Availability and changes

We work to keep UpNexx reliable but do not guarantee uninterrupted availability. Features may change as the platform evolves. Material changes to these terms will be published with a new version and effective date.

Disclaimers and liability

UpNexx is provided on an as-available basis to the extent permitted by law. Nexx Jenn Technologies is not responsible for tenant-created content or independent tenant transactions. Liability is limited to the fullest extent permitted by applicable law.

Contact

Questions about these terms may be sent through the official UpNexx support channel.`,
  privacy: `Information we collect

UpNexx collects account information, organization details, content you submit, product usage records, device and browser information, and support communications. Payment processors and connected providers may process additional information under their own notices.

How we use information

We use information to provide and secure the platform, authenticate users, process requested operations, communicate service updates, troubleshoot issues, improve features, comply with law, and prevent fraud or abuse.

Tenant responsibilities

Tenant organizations control the member and contact information they add to their workspace. Each tenant is responsible for providing appropriate notices and obtaining any consent required for its communications, content, and membership programs.

Sharing and processors

We share information with service providers only as needed to operate UpNexx, including hosting, authentication, email delivery, analytics, and payment services. We may disclose information when required by law or to protect rights and safety.

Retention and security

We retain information for as long as needed for the purposes described here, contractual obligations, dispute resolution, security, and legal requirements. We use technical and organizational safeguards, but no system can guarantee absolute security.

Your choices

Depending on your location, you may have rights to access, correct, delete, restrict, or export personal information. You may manage communication preferences through available account controls or contact support.

International processing

Information may be processed where UpNexx and its service providers operate. Appropriate contractual and technical safeguards are used where required.

Policy updates

Material updates are published as a new version with an effective date. Continued use after the effective date is subject to the updated policy.`,
  cookies: `Cookie overview

UpNexx uses cookies and similar storage technologies to operate secure sessions, remember preferences, understand product performance, and protect the service.

Essential cookies

Essential cookies support authentication, tenant routing, security, fraud prevention, and core application functionality. The platform cannot operate correctly without them.

Preference and analytics technologies

Where enabled, preference technologies remember interface choices. Analytics technologies help us understand aggregate usage and improve reliability. We do not use cookies to sell personal information.

Managing cookies

Browser settings can block or delete cookies. Blocking essential cookies may prevent sign-in or other platform features from working. Additional consent controls will be shown where required by applicable law.

Updates

This policy may change as our technology and service providers change. The published version and effective date identify the current policy.`,
  acceptable_use: `Respectful and lawful use

You may use UpNexx only for lawful purposes and must respect the rights, privacy, and safety of others.

Prohibited content and conduct

Do not use UpNexx for unlawful, fraudulent, deceptive, harassing, hateful, exploitative, or violent activity. Do not distribute malware, phishing, spam, illegal sexual content, content that exploits minors, or material that infringes intellectual-property or privacy rights.

Platform integrity

Do not probe or bypass security controls, scrape the service without authorization, overload infrastructure, impersonate others, manipulate delivery metrics, or use credentials or data obtained without permission.

Communications

Tenant communications must identify the sender, honor applicable consent and unsubscribe requirements, and avoid purchased, harvested, or unlawfully obtained recipient lists.

Enforcement

We may investigate suspected violations and restrict or suspend accounts when reasonably necessary. Serious or repeated violations may result in termination and may be reported when legally required.

Reporting concerns

Report suspected abuse through the official UpNexx support channel with enough detail for us to investigate safely.`,
  refund: `Refund eligibility

Refund eligibility, timing, and method are determined by the tenant organization that sold the membership, course, event, or digital product.

How to request a refund

Contact the tenant using the support email shown on its site or receipt. Include the purchase date, item, and account email. UpNexx provides platform technology but does not automatically approve refunds for independent tenant transactions.

Processing

Approved refunds are returned through the original payment method when possible. Processing times may vary by payment provider and financial institution.`
};
