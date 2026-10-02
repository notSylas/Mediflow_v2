export const metadata = { title: "Contact Us — MediFlow" };

// NOTE: entity name, address, and phone number below are temporary
// placeholders (MediFlow is currently a solo operation) — replace with real
// registered business details before Razorpay activation / going live.
export default function ContactPage() {
  return (
    <>
      <h1>Contact Us</h1>
      <p>Last updated: 31 August 2026</p>

      <h2>1. Business details</h2>
      <p>
        MediFlow
        <br />
        [Registered business name — to be updated]
        <br />
        [Registered address — to be updated], India
      </p>

      <h2>2. Support</h2>
      <p>
        Email:{" "}
        <a href="mailto:support@mediflow.app">support@mediflow.app</a>
        <br />
        Phone: +91 00000 00000 (temporary — to be updated)
        <br />
        Hours: Monday-Saturday, 9:00 AM - 6:00 PM IST
      </p>

      <h2>3. Grievance officer</h2>
      <p>
        In accordance with the Information Technology Act, 2000 and applicable rules,
        the grievance officer for MediFlow can be reached at:
        <br />
        [Grievance officer name — to be updated]
        <br />
        Email: <a href="mailto:support@mediflow.app">support@mediflow.app</a>
      </p>

      <h2>4. Other policies</h2>
      <p>
        See our <a href="/terms">Terms of Service</a>,{" "}
        <a href="/privacy">Privacy Policy</a>, and{" "}
        <a href="/refund-cancellation">Refund &amp; Cancellation Policy</a>.
      </p>
    </>
  );
}
