import type { EndoCase } from "./types.ts";

export type Specialist = {
  id: string;
  name: string;
  location: string;
  country: string;
  specialties: string[];
  bio: string;
  verified: boolean;
  website?: string;
  languages: string[];
  reviewModes: Array<"Written MRI review" | "Video consultation" | "Surgical case review">;
  responseWindow: string;
  acceptingCases: boolean;
  internationalPatients: boolean;
  yearsExperience: number;
  consultationFee: string;
  nextAvailability: string;
  clinicName: string;
  team: string[];
  verificationCriteria: string[];
};

export const specialists: Specialist[] = [
  {
    id: "SPC-001",
    name: "Dr. Ana M. Ionescu",
    location: "Bucharest, Romania",
    country: "Romania",
    specialties: ["bowel", "deep_endometriosis", "surgical_review", "documentation"],
    bio: "Experienced endometriosis surgeon with a focus on posterior compartment excision and multidisciplinary planning.",
    verified: true,
    website: "https://ifemendo.com",
    languages: ["Romanian", "English"],
    reviewModes: ["Written MRI review", "Video consultation", "Surgical case review"],
    responseWindow: "3-5 business days",
    acceptingCases: true,
    internationalPatients: true,
    yearsExperience: 16,
    consultationFee: "From €220",
    nextAvailability: "Within 2 weeks",
    clinicName: "IFEM Endometriosis Center",
    team: ["Colorectal surgeon", "Urologist", "Pelvic physiotherapist"],
    verificationCriteria: ["Medical registration reviewed", "Clinic affiliation reviewed", "Endometriosis focus confirmed"],
  },
  {
    id: "SPC-002",
    name: "Prof. Laura Bennett",
    location: "Dublin, Ireland",
    country: "Ireland",
    specialties: ["bladder", "deep_endometriosis", "surgical_review"],
    bio: "Specialist in urinary tract and retroperitoneal endometriosis with staged excision protocols.",
    verified: true,
    languages: ["English"],
    reviewModes: ["Video consultation", "Surgical case review"],
    responseWindow: "5-7 business days",
    acceptingCases: true,
    internationalPatients: true,
    yearsExperience: 19,
    consultationFee: "From €280",
    nextAvailability: "Within 3 weeks",
    clinicName: "Dublin Pelvic Care",
    team: ["Urologist", "Radiologist", "Pain specialist"],
    verificationCriteria: ["Medical registration reviewed", "Clinic affiliation reviewed", "Complex-case experience confirmed"],
  },
  {
    id: "SPC-003",
    name: "Dr. Sophie Delacroix",
    location: "Paris, France",
    country: "France",
    specialties: ["bowel", "documentation", "second_opinion"],
    bio: "Endometriosis specialist offering second-opinion review and referral support for complex cases.",
    verified: false,
    languages: ["French", "English"],
    reviewModes: ["Written MRI review", "Video consultation"],
    responseWindow: "7-10 business days",
    acceptingCases: false,
    internationalPatients: true,
    yearsExperience: 14,
    consultationFee: "From €240",
    nextAvailability: "Waitlist",
    clinicName: "Paris Endometriosis Review",
    team: ["Radiologist", "Fertility specialist"],
    verificationCriteria: ["Verification in progress"],
  },
  {
    id: "SPC-004",
    name: "Dr. Nadia Petrescu",
    location: "Cluj-Napoca, Romania",
    country: "Romania",
    specialties: ["bladder", "surgical_review", "documentation"],
    bio: "Focuses on advanced bladder disease and operative completeness verification for recurrent cases.",
    verified: false,
    languages: ["Romanian", "English"],
    reviewModes: ["Written MRI review", "Surgical case review"],
    responseWindow: "5-7 business days",
    acceptingCases: true,
    internationalPatients: false,
    yearsExperience: 12,
    consultationFee: "From €180",
    nextAvailability: "Within 4 weeks",
    clinicName: "Transylvania Pelvic Center",
    team: ["Urologist", "Pelvic physiotherapist"],
    verificationCriteria: ["Verification in progress"],
  },
];

export const specialtyLabels: Record<string, string> = {
  bladder: "Bladder and urinary tract",
  bowel: "Bowel endometriosis",
  deep_endometriosis: "Deep endometriosis",
  documentation: "Records and documentation",
  second_opinion: "Second opinion",
  surgical_review: "Surgical case review",
};

export function getSpecialtyLabel(value: string) {
  return specialtyLabels[value] ?? value.replaceAll("_", " ");
}

export function matchSpecialists(item: EndoCase) {
  const interestTags = new Set<string>();

  if (item.diseaseMap.bowel === "likely" || item.diseaseMap.bowel === "suspected") {
    interestTags.add("bowel");
  }
  if (item.diseaseMap.bladder === "likely" || item.diseaseMap.bladder === "suspected") {
    interestTags.add("bladder");
  }
  if (item.diseaseMap.uterosacral === "likely" || item.diseaseMap.uterosacral === "suspected") {
    interestTags.add("deep_endometriosis");
  }
  if (item.surgeries.length > 0) {
    interestTags.add("surgical_review");
  }
  if (item.missingInfo.length > 0 || item.uncertaintyFlags.length > 0) {
    interestTags.add("documentation");
    interestTags.add("second_opinion");
  }

  return specialists
    .map((specialist) => {
      const score = specialist.specialties.reduce((sum, specialty) => {
        return sum + (interestTags.has(specialty) ? 10 : 0);
      }, 0) + (specialist.verified ? 3 : 0);

      return { specialist, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.specialist);
}

export function getSpecialistById(id: string) {
  return specialists.find((specialist) => specialist.id === id);
}
