import { describe, expect, it } from "vitest";
import {
  canBookVideoConsultation,
  getBookingProfileMissing,
} from "@/lib/people/patient-readiness";

const completeProfile = {
  dateOfBirth: "1995-04-12",
  gender: "female",
};

describe("booking profile readiness", () => {
  it("allows booking when name, valid DOB, and gender are present", () => {
    expect(
      canBookVideoConsultation(
        { name: "Asha Mehta", email: "asha@example.com" },
        completeProfile
      )
    ).toBe(true);
  });

  it("does not accept email as the patient name", () => {
    expect(
      getBookingProfileMissing(
        { name: "asha@example.com", email: "asha@example.com" },
        completeProfile
      )
    ).toEqual(["Full name"]);
  });

  it("requires a valid DOB because age is derived from it", () => {
    expect(
      getBookingProfileMissing(
        { name: "Asha Mehta", email: "asha@example.com" },
        { dateOfBirth: "2999-01-01", gender: "female" }
      )
    ).toEqual(["Valid date of birth"]);
  });

  it("reports all missing booking identity fields", () => {
    expect(
      getBookingProfileMissing({ name: "", email: "asha@example.com" }, null)
    ).toEqual(["Full name", "Valid date of birth", "Gender"]);
  });
});
