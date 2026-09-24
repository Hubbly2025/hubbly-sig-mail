import type { Metadata } from "next";
import { MeetingsList } from "@/components/outreach/meetings-list";

export const metadata: Metadata = { title: "Meetings | Hubbly Outreach", description: "Review booked outreach meetings by campaign, date, booking source, and attendance status." };

export default function MeetingsPage() { return <MeetingsList />; }
