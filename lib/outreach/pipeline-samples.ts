import type { Pipeline } from "./types";

export const samplePipeline: Pipeline = {
  goal: { label: "Q4 meetings booked", target: 60, current: 41 },
  open_value_monthly: 12400, won_value_monthly: 3600, won_count: 4, assignees: ["Vince", "Paul"],
  stages: [
    { key: "interested", name: "Interested", count: 10, value_monthly: 4200, deals: [
      { id: "p1", company: "Brightline Dental", person: "Dana Ortiz", owner_initials: "VR", value_label: "$450/mo", source: "reply", next_step: "Share available demo times" },
      { id: "p2", company: "Northpoint Roofing", person: "Marcus Hale", owner_initials: "P", value_label: "$600/mo", source: "email", next_step: "Follow up on pricing question" },
      { id: "p3", company: "Lumen Studio", person: "Priya Nair", owner_initials: "VR", value_label: "$300/mo", source: "reply", next_step: "Send partner overview" },
    ] },
    { key: "booked", name: "Meeting booked", count: 6, value_monthly: 3200, deals: [
      { id: "p4", company: "Becker Print Co.", person: "Tom Becker", owner_initials: "P", value_label: "$700/mo", source: "reply", next_step: "Discovery call · Sep 25" },
      { id: "p5", company: "Peak Plumbing", person: "Lena Wu", owner_initials: "VR", value_label: "$450/mo", source: "email", next_step: "Prepare visitor report" },
    ] },
    { key: "held", name: "Meeting held", count: 4, value_monthly: 2100, deals: [
      { id: "p6", company: "Harbor Fitness", person: "Aaron Tran", owner_initials: "P", value_label: "$600/mo", source: "reply", next_step: "Send recap and next steps" },
      { id: "p7", company: "Mendel Law Group", person: "Kim Mendel", owner_initials: "VR", value_label: "$500/mo", source: "email", next_step: "Confirm rollout scope" },
    ] },
    { key: "proposal", name: "Proposal sent", count: 3, value_monthly: 2900, deals: [
      { id: "p8", company: "Atlas Windows", person: "Chris Lowe", owner_initials: "VR", value_label: "$1,200/mo", source: "reply", next_step: "Review proposal · Sep 28" },
      { id: "p9", company: "Summit HVAC", person: "Ray Whitaker", owner_initials: "P", value_label: "$900/mo", source: "email", next_step: "Confirm decision timeline" },
    ] },
    { key: "won", name: "Won", count: 4, value_monthly: 3600, deals: [
      { id: "p10", company: "Cedar Creek Vet", person: "Nora Kim", owner_initials: "P", value_label: "$900/mo", source: "reply", next_step: "Schedule onboarding" },
      { id: "p11", company: "Bluebonnet Builders", person: "Omar Reyes", owner_initials: "VR", value_label: "$1,200/mo", source: "email", next_step: "Install visitor tracking" },
    ] },
  ],
};
