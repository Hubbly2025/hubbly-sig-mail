import type { LeadList, ListLead, Verification } from "./types";

const makeList = (id: string, name: string, source: LeadList["source"], count: number, counts: number[]): LeadList => ({
  id, name, source, count, is_live: source === "signal", meta: source === "signal" ? "Updates as visitors are identified" : "Imported Sep 21, 2026",
  verification: { valid: counts[0], catch_all_verified: counts[1], risky: counts[2], invalid: counts[3], duplicate: counts[4], ready_to_send: counts[0] + counts[1] },
});
export const sampleLists: LeadList[] = [
  makeList("l_trials", "Q4 reactivation — past trials", "csv", 1960, [1512, 188, 94, 121, 45]),
  makeList("l_pricing", "Pricing-page visitors", "signal", 1284, [1020, 110, 74, 60, 20]),
  makeList("l_agencies", "Marketing agencies, US", "csv", 4812, [3900, 420, 210, 190, 92]),
  makeList("l_printers", "Commercial printers", "csv", 1206, [900, 120, 86, 70, 30]),
  makeList("l_returning", "Returning visitors, no demo", "signal", 388, [300, 40, 25, 18, 5]),
];
const states: Verification[] = ["valid", "catch_all_verified", "risky", "invalid", "duplicate", "valid", "catch_all_verified"];
const reasons = ["Mailbox verified", "Catch-all mailbox verified", "Mailbox could not be confirmed", "Mailbox does not exist", "Address already in this list", "Mailbox verified", "Catch-all mailbox verified"];
const names = ["Dana Ortiz", "Marcus Hale", "Priya Nair", "Tom Becker", "Lena Wu", "Aaron Tran", "Kim Mendel"];
export const sampleListLeads: Record<string, ListLead[]> = Object.fromEntries(sampleLists.map((list) => [list.id, names.map((name, i) => ({
  id: `${list.id}_${i}`, name, company: i === 2 ? null : ["Brightline Dental", "Northpoint Roofing", "Lumen Studio", "Becker Print Co.", "Peak Plumbing", "Harbor Fitness", "Mendel Law Group"][i],
  email: i === 2 ? "priya.nair@example.com" : `${name.toLowerCase().replace(" ", ".")}@company${i + 1}.example`,
  email_type: i === 2 ? "personal" as const : "business" as const, verification: states[i], reason: reasons[i], last_activity: `Sep ${23 - i}, 2026`,
}))]));
