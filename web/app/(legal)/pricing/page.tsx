import { getCanonicalDoctorProfile } from "~backend/people/doctor";

export const metadata = { title: "Pricing — MediFlow" };

export default async function PricingPage() {
  const doctor = await getCanonicalDoctorProfile();
  const feeInPaise = doctor?.feeInPaise ?? 50000;
  const carePlanPriceInPaise = doctor?.carePlanPriceInPaise ?? 49900;
  const slotMinutes = doctor?.slotMinutes ?? 20;

  return (
    <>
      <h1>Pricing &amp; Services</h1>
      <p>Last updated: 31 August 2026</p>

      <h2>1. Video consultation</h2>
      <p>
        A {slotMinutes}-minute video consultation with the doctor costs{" "}
        <strong className="font-mono text-foreground">
          ₹{(feeInPaise / 100).toFixed(2)}
        </strong>
        , paid at the time of booking. This includes the live video visit, consultation
        notes, and a prescription if one is issued.
      </p>

      <h2>2. MediFlow Care subscription</h2>
      <p>
        MediFlow Care is an optional monthly subscription priced at{" "}
        <strong className="font-mono text-foreground">
          ₹{(carePlanPriceInPaise / 100).toFixed(2)}
        </strong>{" "}
        per month. It unlocks ongoing messaging with your doctor between visits, a
        monthly async follow-up credit, and medicine reminders. It does not replace paid
        video consultations, which are billed separately as above.
      </p>

      <h2>3. Payment</h2>
      <p>
        All payments are processed securely through Razorpay. We do not store your card
        or bank details. See our <a href="/refund-cancellation">Refund &amp; Cancellation
        Policy</a> for cancellation and refund terms.
      </p>

      <h2>4. Currency and taxes</h2>
      <p>
        All prices are listed in Indian Rupees (INR) and are inclusive of applicable
        taxes unless stated otherwise at checkout.
      </p>
    </>
  );
}
