// Local copy of the copy rules, used ONLY in sample-data mode.
// In live mode the rules panel calls POST outreach/lint so the builder,
// the approval inbox and the send-time check can never disagree.

import type { LintIssue, LintReport } from "./types";

const HYPE = ["revolutionary", "game-changing", "best-in-class", "cutting-edge", "synergy", "guarantee", "act now", "limited time", "free!!!"];
const ADJ_HINTS = /\b(\w+(ful|ous|ive|able|ible|al|less|ic))\b/gi;

function words(s: string) {
  return s.trim().split(/\s+/).filter(Boolean);
}
function sentences(s: string) {
  return s
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter((x) => words(x).length > 0);
}
function syllables(w: string) {
  const m = w.toLowerCase().replace(/[^a-z]/g, "").match(/[aeiouy]+/g);
  return Math.max(1, m ? m.length : 1);
}

export function lintEmail(subject: string, body: string, isFirst: boolean): LintReport {
  const problems: LintIssue[] = [];
  const suggestions: LintIssue[] = [];
  const w = words(body);
  const sents = sentences(body);
  const target: [number, number] = isFirst ? [40, 90] : [20, 60];

  if (!subject.trim()) problems.push({ text: "Subject is empty", where: "subject" });
  if (subject.length > 60) problems.push({ text: "Subject is longer than 60 characters", where: "subject" });
  if (/[A-Z]{4,}/.test(subject)) problems.push({ text: "Subject has words in capitals", where: "subject" });
  if (/!/.test(subject)) suggestions.push({ text: "Exclamation marks in subjects read as marketing", where: "subject" });

  if (w.length < target[0]) suggestions.push({ text: `Short for a ${isFirst ? "first email" : "follow-up"} (${target[0]}–${target[1]} words works best)` });
  if (w.length > target[1]) problems.push({ text: `Too long for a ${isFirst ? "first email" : "follow-up"} — aim for ${target[0]}–${target[1]} words` });
  if (/https?:\/\//i.test(body) && isFirst) problems.push({ text: "Links in a first email hurt deliverability" });
  if (/<img|\.png|\.jpg/i.test(body)) problems.push({ text: "Images in cold email hurt deliverability" });
  const lower = body.toLowerCase();
  HYPE.forEach((h) => lower.includes(h) && problems.push({ text: `"${h}" reads as hype` }));
  if (/\{[^}]*$/.test(body) || /\{\s*\}/.test(body)) problems.push({ text: "A variable is unfinished" });
  const numbers = body.match(/\b\d+(\.\d+)?%?/g) ?? [];
  if (numbers.length > 0) suggestions.push({ text: "Every number must come from the proof in your brief" });
  if (!/\?/.test(body)) suggestions.push({ text: "End with a question so replying is easy" });
  if (sents.some((s) => words(s).length > 28)) suggestions.push({ text: "One sentence runs over 28 words" });
  if (/\bI\b/.test(body) && (body.match(/\bI\b/g) ?? []).length > 4) suggestions.push({ text: "Lots of “I” — make it about them" });

  const lens = sents.map((s) => words(s).length);
  const mean = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, lens.length));
  const variety = sd >= 6 ? "High" : sd >= 3 ? "Good" : "Low";
  if (variety === "Low" && sents.length > 2) suggestions.push({ text: "Sentences are all a similar length" });

  const syl = w.reduce((a, x) => a + syllables(x), 0);
  const grade = Math.max(1, Math.round(0.39 * (w.length / Math.max(1, sents.length)) + 11.8 * (syl / Math.max(1, w.length)) - 15.59));
  if (grade > 9) suggestions.push({ text: `Reading grade ${grade} — simpler words read faster` });

  const adjectives = (body.match(ADJ_HINTS) ?? []).length;
  const paragraphs = body.split(/\n\s*\n/).filter((p) => p.trim()).length;

  return {
    problems,
    suggestions,
    figures: {
      sentence_variety: variety,
      reading_grade: grade,
      contractions: (body.match(/\b\w+'(s|t|re|ll|ve|d|m)\b/gi) ?? []).length,
      adjectives_per_sentence: Math.round((adjectives / Math.max(1, sents.length)) * 10) / 10,
      questions: (body.match(/\?/g) ?? []).length,
      paragraphs,
    },
    word_count: w.length,
    word_target: target,
  };
}
