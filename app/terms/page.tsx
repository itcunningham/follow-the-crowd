"use client";

import Link from "next/link";
import LegalPageShell, {
  LegalList,
  LegalSection,
} from "@/app/components/legal/LegalPageShell";
import { LEGAL_CONTACT_EMAIL, LEGAL_LAST_UPDATED, LEGAL_OPERATOR } from "@/lib/legal";

/**
 * Terms for the Follow The Crowd private beta.
 *
 * Written against what the product actually does, per the data audit: no
 * payments, no enabled AI, coordination only. Do not add clauses describing
 * features that do not exist.
 */
export default function TermsPage() {
  return (
    <LegalPageShell title="Terms & Conditions" lastUpdated={LEGAL_LAST_UPDATED}>
      <p>
        These terms apply when you use Follow The Crowd (&ldquo;FTC&rdquo;). FTC is operated
        by {LEGAL_OPERATOR}. It is not a registered company. By creating an account you agree
        to these terms.
      </p>

      <LegalSection title="Who can use FTC">
        <p>
          You must be 18 or older to create an account. FTC is built around nightlife and
          live events, and accounts are currently offered by invitation during a private
          beta.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You are responsible for your account and for keeping your password secure. Give
          accurate information when you set up your profile, and keep it up to date. Tell us
          if you believe someone else has accessed your account.
        </p>
      </LegalSection>

      <LegalSection title="What FTC does, and what it does not do">
        <p>
          FTC is a coordination tool. It helps promoters and DJs find each other, send and
          respond to booking requests, agree details, and talk through direct messages and
          Crew Chat.
        </p>
        <p className="font-semibold text-ftc-text">
          FTC is not a party to any agreement between a promoter and a DJ.
        </p>
        <LegalList
          items={[
            "FTC does not process payments. No money moves through FTC.",
            "A fee recorded against a booking is a note between you and the other person. FTC does not hold, transfer, collect or guarantee it.",
            "FTC does not verify that anyone will turn up, perform, pay, or hold any licence or insurance.",
            "Any dispute about a booking, a fee or a performance is between the people involved.",
          ]}
        />
      </LegalSection>

      <LegalSection title="Bookings">
        <p>
          Sending, accepting or declining a booking request through FTC is a way of recording
          what you have agreed. Whether that creates a binding arrangement between you and
          the other person is a matter between you, and depends on what you agreed and the
          law that applies to you.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You keep ownership of what you post — your profile, events, messages, images and
          anything else you upload. To run the service, you give FTC permission to store your
          content and show it to the people the product is designed to show it to: other FTC
          users for profile information, and the people in a conversation, booking or event
          for content posted there. That permission exists so the app can work, and ends when
          the content is deleted, except where it remains as described in the{" "}
          <Link href="/privacy" className="font-semibold text-ftc-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p>
          Only post content you have the right to post, and do not post anything unlawful,
          misleading, abusive, or that infringes someone else&rsquo;s rights.
        </p>
      </LegalSection>

      <LegalSection title="Behaviour on FTC">
        <p>
          Treat other people the way you would at a venue you want to be invited back to.
          You can block another user, and you can report a user or a message. Reports are
          reviewed by {LEGAL_OPERATOR}. Accounts that harass others, misrepresent who they
          are, or use FTC unlawfully may be suspended or removed.
        </p>
      </LegalSection>

      <LegalSection title="Availability">
        <p>
          FTC is in private beta. Features may change, break, or be removed, and the service
          may be unavailable at times. Keep your own record of anything you would be unhappy
          to lose.
        </p>
      </LegalSection>

      <LegalSection title="Ending your account">
        <p>
          You can request deletion of your account from Settings. What happens to your data
          is described in the{" "}
          <Link href="/privacy" className="font-semibold text-ftc-primary hover:underline">
            Privacy Policy
          </Link>{" "}
          — in short, your profile is anonymised, and messages and booking history involving
          other people remain so their records stay intact.
        </p>
      </LegalSection>

      <LegalSection title="Your rights under Australian Consumer Law">
        <p>
          Nothing in these terms excludes, restricts or modifies any guarantee, right or
          remedy you have under the Australian Consumer Law or any other law that cannot be
          excluded. Where those laws allow a liability to be limited, our liability is limited
          to resupplying the service.
        </p>
        <p>
          Beyond that, and to the extent the law allows, FTC is provided as it is, and{" "}
          {LEGAL_OPERATOR} is not liable for loss arising from a booking, a cancellation,
          another user&rsquo;s conduct, or the service being unavailable.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          These terms may change as FTC develops. The date at the top shows when they last
          changed. If you keep using FTC after a change, the updated terms apply.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These terms are governed by the laws of Victoria, Australia, and the courts there
          have jurisdiction.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about these terms:{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="font-semibold text-ftc-primary hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
