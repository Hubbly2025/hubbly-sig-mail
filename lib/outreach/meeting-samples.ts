import type { BookedMeeting } from "./types";

export const sampleMeetings: BookedMeeting[] = [
  { id: "meeting_1", lead: "Olivia Chen", company: "Northstar Studio", campaign_id: "c_pricing", campaign_name: "Pricing-page visitors — 48h follow-up", starts_at: "2026-09-25T15:00:00Z", source: "booking_link", status: "upcoming" },
  { id: "meeting_2", lead: "Marcus Reed", company: "Fieldwork", campaign_id: "c_agencies", campaign_name: "Agencies — partner program", starts_at: "2026-09-24T18:30:00Z", source: "calendar", status: "upcoming" },
  { id: "meeting_3", lead: "Sarah Patel", company: "Brightside", campaign_id: "c_pricing", campaign_name: "Pricing-page visitors — 48h follow-up", starts_at: "2026-09-22T16:00:00Z", source: "booking_link", status: "held" },
  { id: "meeting_4", lead: "Daniel Park", company: "Paper & Co", campaign_id: "c_print", campaign_name: "Print houses — referral channel", starts_at: "2026-09-21T14:00:00Z", source: "calendar", status: "no_show" },
  { id: "meeting_5", lead: "Emma Wilson", company: "Common Ground", campaign_id: "c_agencies", campaign_name: "Agencies — partner program", starts_at: "2026-09-18T17:00:00Z", source: "calendar", status: "held" },
];
