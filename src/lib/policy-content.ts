// Default public content; existing CMS overrides are preserved.
export const POLICY_VERSION = "2026-10-16";
export const requiredPurchasePolicies = ["terms", "payment", "refunds", "delivery", "privacy"] as const;
export const contentPages: Record<string, { title: string; body: string }> = {
  "about": {
    title: "About ParrotRehome",
    body: `## Connecting People with Parrots

ParrotRehome is a business based in Oregon that helps customers find parrots through a network of independent breeders across the United States. Birds featured on this website may be located with partner breeders in different states; not every bird is housed at our business correspondence address.

## Our Mission

We aim to make finding and purchasing a parrot clear, responsible and convenient through accurate listing information, responsive support and transparent purchase and delivery arrangements.

## Working with Independent Breeders

We coordinate with independent breeders offering birds for sale. Each listing should identify the bird's current location, species, age or estimated age, availability and known characteristics. Photographs, health information and documentation should relate to the individual bird. Ask us to clarify any missing information before paying.

## Our Commitment

Before payment we explain the total price, payment arrangements, available documentation, delivery or pickup options and applicable policies. We remain your point of contact for the purchase you make through ParrotRehome. Our coordination with a breeder does not remove responsibilities we have under applicable law.

Responsible animal care and applicable animal-sale and transportation requirements matter throughout this process. No availability, shipment, permit or health certification should be treated as confirmed until our team has verified it for the particular bird and route.

## Contact Us

Contact {{supportEmail}} using the verified details on our [Contact page](/contact). Please read our [policies](/policies) before purchasing. Thank you for considering ParrotRehome.`,
  },
  "how-it-works": {
    title: "How It Works",
    body: `ParrotRehome coordinates purchases with independent breeders in different US states.

## 1. Browse Available Parrots

Review the individual listing, photographs, current location, species, asking price and age. Ages may be approximate; young birds are described in weeks or months. Ask about feeding, care requirements and available documentation.

## 2. Confirm Availability

Our team confirms availability with the breeder and clarifies the bird's location, known characteristics and documentation. A listing or submitted request alone does not guarantee availability or confirm a sale.

## 3. Review Your Order

Before payment we provide the applicable purchase terms, total price, delivery or pickup arrangements, estimated timeline and any additional charges. Review the [Terms](/cms/terms), [Payment Policy](/cms/payment), [Delivery Policy](/cms/delivery) and [Refund Policy](/cms/refunds). Ask questions before proceeding.

## 4. Payment and Breeder Coordination

Select an active payment method when submitting your request. You receive an acknowledgement with the items, contact details and payment preference. Our team reviews the request and emails the payment details and their validity period directly to you. Pay ParrotRehome through the agreed method, using only the current verified details. After payment, send your confirmation reference to {{supportEmail}}. A reference or screenshot alone is not proof that payment has settled; our team verifies it with the provider.

## 5. Delivery Arrangements

After availability, payment and transportation requirements have been confirmed, we coordinate the agreed next steps with the breeder. Estimated delivery depends on location, transport availability, weather, animal welfare and applicable requirements. We do not describe a shipment as booked until verified.

## 6. Customer Support

Use [My Requests](/my-requests) or email {{supportEmail}} with your reference for updates, documentation questions, cancellation or refund requests. See the [Refund Policy](/cms/refunds) for the steps and processing times.`,
  },
  "delivery": {
    title: "Bird Locations and Delivery Policy",
    body: `## Bird Locations

ParrotRehome is based in Oregon and works with independent breeders in different US states. Our correspondence address does not necessarily represent the location of a listed bird. The listing should identify the bird's current location; confirm it and availability before purchasing. Do not travel to any address without an agreed appointment.

## Availability and Costs

Delivery depends on the bird's location, destination, species, age and care needs, suitable transportation and federal, state and local requirements. We confirm available options before finalizing the order. The written quote must separate the bird or product price, delivery charges and other applicable charges. Undisclosed fees are not automatically payable. Any later change requires an explanation and your agreement; contact support if unexpected payment demands arise.

## Estimated Times and Changes

Unless expressly guaranteed in writing, delivery dates are estimates. Weather, carrier schedules, permit requirements or animal welfare concerns may require a change. We will communicate material changes and revised options when reasonably possible. If we cannot fulfill the agreed delivery arrangements, we will offer a revised arrangement for your agreement or cancellation/refund as described in the [Refund Policy](/cms/refunds), subject to applicable rights.

## Animal Welfare and Documentation

We review the species, route, age-related feeding and care requirements, suitable handling, ventilation and temperature conditions with the relevant parties. Transportation must be lawful and suitable for the individual bird. We do not represent transport, health certificates or permits as confirmed until the required arrangements are verified. Do not assume every species can be delivered to every state or exported internationally.

## Pickup and Arrival

Pickup may be available by prior agreement with the breeder. Confirm the location, identity of the bird, documentation and handover time before traveling. At delivery, review the agreed documentation and apparent condition. For an urgent health concern, seek an avian veterinarian promptly and notify support; do not delay urgent care while awaiting an email response. Do not return or transport a bird without coordinating safe arrangements.

## Questions

Contact {{supportEmail}} before purchasing about locations, lawful routes, delivery costs, care requirements or estimated arrival.`,
  },
  "refunds": {
    title: "Refund and Cancellation Policy",
    body: `## 1. Scope and Your Rights

This policy covers purchases arranged through ParrotRehome, including birds, supplies and avian advice appointments. Read the written quote and any purchase-specific terms before paying. Those terms must disclose any cancellation cost in advance. Nothing here excludes mandatory consumer rights, remedies for misdescription or defects, or your right to raise a lawful payment dispute. Applicable legal requirements take priority over conflicting terms.

## 2. Before Acceptance or Payment

Submitting a request does not itself confirm availability, charge a payment method or finalize a purchase. You may cancel an unpaid request without a cancellation charge. Use the cancellation action in [My Requests](/my-requests), where available, or email support. If money was received before the order was accepted or arrangements confirmed, we will return it in full unless a different, lawful arrangement was clearly disclosed and expressly agreed before payment.

## 3. Customer Cancellation After Acceptance

Contact us in writing as soon as possible. Before dispatch or handover, we assess the stage of the transaction and any lawful, specifically disclosed costs that have actually become non-recoverable. We do not apply an automatic blanket forfeiture, undisclosed restocking fee or undisclosed non-refundable deposit. Any proposed deduction must be explained with its basis and itemized amount; all remaining refundable funds will be returned. A dispute over a deduction does not remove your statutory rights.

Canceling a request in the interface does not itself transfer funds back. If you already paid, include the payment reference so our team can verify and process the refund.

## 4. Unavailable Bird or Order We Cannot Fulfill

If the advertised bird or product becomes unavailable, or we cannot fulfill the agreed purchase, we will tell you promptly. You may choose an expressly agreed alternative or a full refund of payments for the unfulfilled purchase, including charges for delivery not provided. We will not substitute another bird or force store credit without your agreement.

## 5. Delivery Delays

We will communicate significant delays and the revised arrangements. If a promised delivery commitment cannot be met or you do not accept a material change, contact support to review cancellation and refund options. We do not use an estimated date to exclude remedies required by law. Any deduction must satisfy the advance-disclosure and lawful-cost rules above.

## 6. Supplies and Accessories

For a change of mind about an accessory, request a return within 14 calendar days of delivery. Unless otherwise agreed, return authorization will give the address and a further 14 calendar days to send the item. Change-of-mind items should be unused, complete and suitably packaged. We will disclose return shipping responsibility before authorization; ordinarily the customer pays change-of-mind return shipping. For an incorrect, defective or materially misdescribed item, contact us for an appropriate remedy and reasonable return arrangements at our expense where required. Packaging requirements do not remove mandatory defect-related rights. Do not send an item to the correspondence address without return instructions.

## 7. Live Birds and Health Concerns

A live bird must not be shipped back like a parcel. If there is an apparent injury, illness or material difference from the agreed description, seek appropriate avian veterinary advice promptly and notify {{supportEmail}} as soon as possible, ideally within 24 hours of discovery. This is a request for timely reporting, not an automatic deadline that cancels legal rights. Provide your order reference, dates and available photographs or records. We will review the facts, applicable purchase terms and law, and agree a lawful remedy and safe handling arrangements. Do not delay urgent veterinary care or arrange an unsolicited return shipment. A change-of-mind return after handover requires case-specific agreement and must respect animal welfare and applicable rights.

## 8. Advice Appointments

Notify us at least 24 hours before the agreed appointment to request cancellation or rescheduling. We will refund an unused appointment canceled in that period. Later cancellations are assessed against any lawful fee expressly disclosed before booking and actual non-recoverable costs; no automatic fee applies where none was disclosed. If we cancel and cannot offer a mutually acceptable alternative, the unused appointment will be refunded.

## 9. How to Request a Refund

1. Email **{{supportEmail}}** with the subject **Refund request — [your order reference]**. You can also reply to the order email.
2. Include your name, order reference, items concerned, payment date/method/reference, the reason for cancellation or refund, and relevant supporting information. Never send a bank login, full card number or password.
3. We aim to acknowledge your request within **2 business days**. If information or an authorized return is needed, we will explain what is required.
4. We aim to issue a written decision within **5 business days after receiving the information and, where reasonably necessary, returned goods needed to assess the request**. A complex case may take longer; we will explain the reason and expected next update. Mandatory legal deadlines still apply.
5. Approval will state the refundable amount, any itemized lawful deduction, the payment method and the refund initiation date. If a request is refused or partly approved, we will explain why and how to ask for a review.

## 10. Refund Timing and Method

For an approved refund, **ParrotRehome will initiate the refund within 5 business days of approval**, or sooner where law requires. Refunds are normally returned through the original payment method to the original payer. If that is not technically possible, we will agree a secure, lawful alternative with the payer; we do not redirect funds solely on an unauthenticated request.

After initiation, allow an **indicative further 3–10 business days** for the bank or payment provider to make the credit visible. This is a provider estimate, not an additional period during which we can postpone initiation. Some methods may take a different time; we will communicate the expected timing and available reference. Contact support if the credit is not visible within the communicated window so we can trace it. There is no fee to merely request a refund.

Business days are Monday–Friday, excluding US public/banking holidays. The account itself remains accessible during cancellation or refund review.

## 11. Contact and Review

Contact {{supportEmail}} with your reference if any part of the process is unclear or you disagree with a decision. Asking for a review does not prevent you from exercising applicable consumer or payment-provider rights.`,
  },
  "payment": {
    title: "Payment Policy",
    body: `## Review Before Paying

A request acknowledgement is not a payment confirmation or a guarantee that a bird is available. Before payment, review the individual bird/product, current location, agreed price, delivery or pickup charges, applicable taxes or other disclosed charges, documentation, estimated arrangements and the [Terms](/cms/terms), [Delivery](/cms/delivery) and [Refund Policy](/cms/refunds). Ask our team to clarify any missing item.

## Available Methods

Only methods marked active in the system are offered at checkout. The method selected in your request is a preference, not a payment. Our team confirms availability and emails the verified payment details, amount, reference and validity period. Pay the agreed recipient through the chosen provider. We do not collect card numbers, banking credentials or provider passwords in the request form.

## Direct Instructions and Expiry

Payment coordinates appear directly in the payment email; a payment link is not required to view them. Check the method, recipient, amount and reference. If details unexpectedly change, confirm through {{supportEmail}} before paying. After the stated expiry, do not use the old coordinates; ask for current instructions. Expiry does not delete the email, reverse a payment already made or close your account.

## Verification

After paying, send the transaction reference to support or submit it in My Requests. A screenshot, reference or email is not by itself proof that funds have settled. An authorized team member verifies receipt with the provider before confirming payment. If you have already paid, do not send a duplicate payment while verification is pending.

## Extra Charges and Refunds

We will not treat an undisclosed charge as automatically mandatory. Material changes to the quote or arrangements require your agreement. Approved refunds follow the [Refund Policy](/cms/refunds); the application does not automatically move money when an order is canceled. Contact the provider promptly for an unauthorized transaction and notify support. Nothing here limits lawful disputes or mandatory rights.

## Help

Email {{supportEmail}} with the order reference. Never send passwords, full card details or online banking credentials.`,
  },
  "terms": {
    title: "Terms of Service and Acceptable Use",
    body: `## 1. Who We Are and Scope

ParrotRehome operates from Oregon and coordinates parrot purchases with independent breeders across the United States, along with supplies and avian advice services. The business correspondence address may differ from each bird's location. Use the verified [contact details](/contact) and obtain the seller's legal identity and correspondence details in your written purchase terms before payment. These terms govern website use and requests; mandatory applicable law takes priority.

## 2. Eligibility and Responsible Ownership

You must be at least 18 and legally able to enter the purchase agreement to place an order. You are responsible for accurate contact information and for confirming that you can lawfully keep the relevant species at the destination. Discuss suitable housing, feeding, veterinary care and any permits with our team before purchase. We may decline a request that cannot be fulfilled lawfully or responsibly.

## 3. Listings and Independent Breeders

A listing is an invitation to inquire, not a guarantee of availability. We aim to describe the individual bird accurately using information available from the breeder. Ages may be estimates; location, identity, feeding status, health information and available documentation should be confirmed before payment. We do not claim a license, permit, certification or health guarantee solely because a bird is listed. Our use of a partner breeder does not remove obligations ParrotRehome has to its customer under applicable law.

## 4. Requests and Purchase Agreement

Submitting a request records your interest and sends an acknowledgement. A purchase is finalized only after availability, the written quote, applicable terms and arrangements have been confirmed and accepted. Before paying, review the total price and disclosed charges, method, delivery or pickup arrangements and documentation. We will correct a material error and obtain your agreement to revised terms rather than impose a new charge after payment. See the [Payment Policy](/cms/payment).

## 5. Delivery, Cancellation and Refunds

The [Delivery Policy](/cms/delivery) and [Refund and Cancellation Policy](/cms/refunds) form part of these terms. They describe safe transport, estimated dates, cancellation steps, returns, health concerns and refund timing. Specific agreed terms must be supplied before payment and cannot remove mandatory rights. No clause here excludes rights concerning defects, misdescription or services not supplied.

## 6. Advice Services

Avian advice supports care decisions but is not a substitute for emergency treatment or an examination by a qualified veterinarian. Contact a qualified avian veterinarian promptly for urgent concerns. Do not rely on website content or an unscheduled message for emergency diagnosis.

## 7. Accounts and Acceptable Use

Keep your password private, use accurate information and notify support of suspected unauthorized access. Use only accounts and order information you are entitled to access. Do not impersonate others, submit fraudulent payment claims, send threats or unlawful content, upload material you lack permission to use, distribute malware or attempt to bypass security controls. We may restrict misuse while preserving applicable purchase rights and providing a contact route for an affected customer. You may change your own password in My account.

## 8. Content and Reviews

Website branding and original materials are protected by applicable intellectual property law. You may use website information for a personal purchase inquiry; do not misrepresent our listings as your own. If you submit a review or content, it should be truthful and lawful. You retain applicable rights in your content and permit us to display it for the purpose for which it was submitted, subject to our moderation and privacy practices.

## 9. Service Availability and Responsibility

We aim to keep the website available and information current, but technical interruptions can occur. Contact support if an interruption affects your purchase or a deadline. Nothing in these terms excludes liability or remedies that cannot lawfully be excluded, or creates a blanket waiver for fraud, misrepresentation, defective goods or unfulfilled purchases.

## 10. Privacy and Cookies

See the [Privacy Policy](/cms/privacy) and [Cookie Policy](/cms/cookies). Necessary storage supports accounts, security, cart and preferences. Optional analytics and advertising tracking are disabled unless permitted through cookie preferences.

## 11. Questions, Disputes and Updates

Contact {{supportEmail}} with your order reference so we can investigate and propose a resolution. This does not require you to waive access to courts, regulators or lawful payment disputes. Relevant law and mandatory consumer protections apply according to the transaction; no exclusive forum or forced arbitration is imposed by these website terms. Updates are dated and apply prospectively; we will not use a later policy to remove rights attached to an existing purchase.`,
  },
  "privacy": {
    title: "Privacy Policy",
    body: `## Information We Process

We process information you provide in accounts, order requests and support messages: name, email, phone, delivery address/state, selected items, payment preference/reference, care questionnaire answers, photographs or documents you submit, and communications. We also process technical information needed for security and operation, including sign-in history, audit events and rate-limit information. Passwords are stored as hashes; the request form does not ask for banking passwords or full card details.

## Purposes

We use information to respond to inquiries, review suitability and availability, prepare quotes and instructions, coordinate breeders and delivery, verify payment references, manage accounts, handle refunds, maintain security and meet applicable recordkeeping obligations. Optional newsletter subscriptions are separate from ordering. Optional analytics/advertising is subject to cookie preferences where configured. Do not include unnecessary sensitive personal information in free-text messages.

## Who Receives Information

Relevant staff and service providers receive information needed for their role. This may include partner breeders, transport providers, hosting/infrastructure providers, Resend for transactional email, the support mailbox provider (such as Zoho or a configured email forwarder), and payment providers involved in your chosen method. We share the minimum relevant information for the transaction and lawful requests. If optional tracking is enabled and accepted, Google may receive event and device/cookie information under its own terms. Such advertising uses may be treated as sharing under some laws; you can refuse them in cookie preferences. We do not sell customer records for money.

## Storage, Transfers and Retention

Information may be processed in the United States and other countries where our providers operate. We retain order, payment-verification and communications records as reasonably needed for fulfillment, refunds, disputes and applicable accounting or legal duties; account information is retained while needed for the account or those duties. We review deletion requests against these needs rather than promising immediate deletion of records we must lawfully keep. Optional cookie preferences expire after six months and can be changed sooner.

## Security

We use password hashing, role-based access checks, session controls and operational security measures. No transmission or storage system is guaranteed risk-free. Use a unique password, keep your account secure and report suspected unauthorized access promptly. Do not email passwords, full card numbers or bank login details.

## Your Choices and Requests

You can update your own password in My account, unsubscribe from optional newsletters, and refuse or change optional tracking through Cookie preferences. Depending on applicable law, you may have rights to request access, correction, deletion, a copy, restriction or objection, or to opt out of certain uses. Email {{supportEmail}} with the request. We may reasonably verify identity and will respond within the time required by applicable law. We do not charge a fee merely for making a request; we will explain any lawful limitation or refusal and available review options. Requesting deletion does not prevent us from preserving records needed for a legal obligation or an existing dispute.

## Children and External Services

Ordering is intended for adults aged 18 or over. If you believe a child has provided personal information without appropriate authorization, contact support. External websites and payment or video services have their own privacy practices. Site fonts may be loaded from Google's font delivery service, which receives technical connection information; this is distinct from optional analytics cookies.

## Contact and Changes

Contact {{supportEmail}} for privacy questions or complaints. We will cooperate with applicable rights and regulatory processes. Material changes will be dated and communicated where required. See also the [Cookie Policy](/cms/cookies).`,
  },
  "cookies": {
    title: "Cookie and Local Storage Policy",
    body: `## Necessary Storage

The website uses necessary cookies and browser storage for sign-in sessions, request security, cart/favorites and remembering your cookie choice. These support the functions you request and are not used as a basis to claim permission for advertising. Cart/favorite data may remain in local browser storage until cleared. Sign-in cookies are subject to session expiry; administrative access expires after eight hours. You can clear browser data, but doing so may sign you out or clear your cart.

## Optional Analytics and Advertising

If configured, Google Analytics and Google Ads tags are loaded only after you allow optional tracking. Before a choice, and after Refuse, the site does not initialize those tracking tags or emit conversion events through them. Allowing optional tracking may send page/event information, device or cookie identifiers and order event references to Google. You can decline optional tracking without losing the ability to browse or submit a request. Necessary font and infrastructure requests are separate from these tracking tags.

## Change Your Choice

Use **Cookie preferences** in the footer to accept or refuse optional tracking. Your choice is stored for six months. You can change it sooner; withdrawing permission stops future site tracking events and reloads the page to stop previously initialized tags. The site also honors a browser Global Privacy Control signal by declining optional tracking. Removing accessible optional cookies is best effort; your browser can clear remaining cookies and local storage.

## Site Visitor Statistics

With optional tracking permission, the site records a pseudonymous browser identifier and visit source category to count browsers that remain on visible pages for more than five seconds. Time can accumulate across public pages; background tabs do not add time. Sources distinguish Google search, Google Ads, external links, other tagged campaigns and direct/unknown visits. A browser counts once per reporting period. Referrer blocking, different devices, cleared storage and refused consent limit accuracy; these are estimates, not identified people. We retain visit records for up to 90 days (older records are removed when new visits are recorded). The browser identifier expires after 90 days. We do not store IP addresses, full referring URLs or search terms in these visit records. Refusing tracking prevents this measurement. This measurement is separate from Google tags.

## More Information

See our [Privacy Policy](/cms/privacy), or contact {{supportEmail}}.`,
  }
};
