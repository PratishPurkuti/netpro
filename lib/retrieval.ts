import { z } from "zod";
import type { Contact } from "./schema";
export const fields = [
  "name",
  "location",
  "occupation",
  "organization",
  "skills",
  "interests",
  "met",
  "relationship",
  "shared",
  "tags",
  "notes",
  "lastInteraction",
  "interactionNotes",
] as const;
export type Field = (typeof fields)[number];
export type Match = { contact: Contact; evidence: Field[]; tentative: boolean };
const stop = new Set(
  "i want to explore do know anyone who knows about in the a an is are my me and for with her him them their how did we meet any someone people can help please find know what near".split(
    " ",
  ),
);
export function tokens(query: string) {
  return query
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((v) => v.length > 1 && !stop.has(v))
    .map(
      (v) =>
        ({
          painting: "art",
          paintings: "art",
          artist: "art",
          artists: "art",
          artwork: "art",
          coding: "programming",
          developer: "programming",
          software: "programming",
          galleries: "gallery",
        })[v] || v,
    );
}
export function retrieve(
  all: Contact[],
  query: string,
  previousQuery = "",
  previousIds: string[] = [],
): Match[] {
  const follow =
    /\b(her|him|them|their|she|he|how.*know|anyone in|what about)\b/i.test(
      query,
    );
  const terms = tokens((follow ? previousQuery + " " : "") + query);
  const location = /(?:\bin|\bnear)\s+([\w -]+?)(?:[?.!,]|$)/i
    .exec(query)?.[1]
    ?.trim()
    .toLowerCase();
  const scored = all
    .map((contact) => {
      const evidence = fields.filter((f) =>
        tokens(contact[f]).some((t) => terms.includes(t)),
      );
      const hits = new Set(
        tokens(
          [contact.name, ...evidence.map((f) => contact[f])].join(" "),
        ).filter((t) => terms.includes(t)),
      ).size;
      const locationFits =
        !location || contact.location.toLowerCase().includes(location);
      const contextual = follow && previousIds.includes(contact.id);
      const named = tokens(contact.name).some((t) => tokens(query).includes(t));
      const direct = evidence.some((f) =>
        ["name", "skills", "occupation", "organization"].includes(f),
      );
      const topicTerms = terms.filter(
        (t) => !tokens(location || "").includes(t),
      );
      const topicFits =
        !topicTerms.length ||
        tokens(
          fields
            .filter((f) => f !== "location")
            .map((f) => contact[f])
            .join(" "),
        ).some((t) => topicTerms.includes(t));
      const relationshipQuery =
        (contextual || named) && /how.*know/i.test(query);
      const tentative =
        !relationshipQuery &&
        (!locationFits ||
          !topicFits ||
          (!direct &&
            evidence.some((f) => ["interests", "notes", "tags"].includes(f))));
      return {
        contact,
        evidence:
          (contextual || named) && /how.*know/i.test(query)
            ? fields.filter(
                (f) =>
                  ["met", "relationship", "shared"].includes(f) && contact[f],
              )
            : evidence,
        tentative,
        meaningful: topicFits || relationshipQuery,
        score:
          hits +
          (contextual ? 2 : 0) +
          (direct ? 2 : 0) +
          (location && locationFits ? 2 : 0),
      };
    })
    .filter((m) => m.meaningful && m.evidence.length > 0 && m.score > 0);
  return scored
    .sort(
      (a, b) =>
        Number(a.tentative) - Number(b.tentative) ||
        b.score - a.score ||
        a.contact.name.localeCompare(b.contact.name),
    )
    .slice(0, 12)
    .map(({ contact, evidence, tentative }) => ({
      contact,
      evidence,
      tentative,
    }));
}
export const modelSchema = z
  .object({
    matches: z
      .array(
        z
          .object({
            id: z.string(),
            evidence: z.array(z.enum(fields)).min(1).max(6),
          })
          .strict(),
      )
      .max(12),
  })
  .strict();
export function validateModel(output: unknown, candidates: Match[]) {
  const parsed = modelSchema.parse(output);
  if (new Set(parsed.matches.map((m) => m.id)).size !== parsed.matches.length)
    throw new Error("Duplicate AI IDs");
  return parsed.matches
    .map((m) => {
      const saved = candidates.find((c) => c.contact.id === m.id);
      if (
        !saved ||
        m.evidence.some((f) => !saved.evidence.includes(f) || !saved.contact[f])
      )
        throw new Error("Unsupported AI evidence");
      return { ...saved, evidence: m.evidence };
    })
    .sort((a, b) => Number(a.tentative) - Number(b.tentative));
}
export function redact(value: string, all: Contact[]) {
  let result = value;
  for (const c of all)
    for (const m of c.methods)
      result = result.replaceAll(m.value, "[contact method omitted]");
  return result
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email omitted]")
    .replace(/https?:\/\/\S+/gi, "[link omitted]")
    .replace(/\+?\d[\d ()-]{6,}\d/g, "[phone omitted]");
}
export function duplicateWarnings(contact: Contact, all: Contact[]) {
  const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  return all
    .filter(
      (c) =>
        c.id !== contact.id &&
        (normalize(c.name) === normalize(contact.name) ||
          c.methods.some((m) =>
            contact.methods.some(
              (n) => normalize(m.value) === normalize(n.value),
            ),
          )),
    )
    .map((c) => ({ id: c.id, name: c.name }));
}
