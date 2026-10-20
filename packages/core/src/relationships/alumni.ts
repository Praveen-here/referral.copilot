// Alumni matching (plan §5.2 institutions). Profiles spell schools many ways, so
// names are compared through alias groups. Later these move to the
// institution/institution_alias tables; this seed list covers the common cases.

import { normalizeName } from "../text";

const ALIAS_GROUPS: readonly (readonly string[])[] = [
  [
    // Most common spellings first: search queries use the first few.
    "PES University",
    "PES Institute of Technology",
    "PESIT",
    "PESU",
    "PES",
    "PES University EC Campus",
    "PES University Electronic City Campus",
    "PES University RR Campus",
    "PESIT South Campus",
    "PESIT Bangalore South Campus",
    "PES University Bangalore",
    "PES University Bengaluru",
  ],
];

const canonicalByAlias = new Map<string, string>();
for (const group of ALIAS_GROUPS) {
  for (const alias of group) canonicalByAlias.set(normalizeName(alias), normalizeName(group[0]!));
}

/** Canonical key for an institution name: known aliases collapse to one key. */
export function institutionKey(name: string): string {
  const normalized = normalizeName(name);
  return canonicalByAlias.get(normalized) ?? normalized;
}

/** All known spellings of a school, the given name first. Unknown schools return just the name. */
export function institutionAliases(name: string): string[] {
  const key = institutionKey(name);
  const group = ALIAS_GROUPS.find((g) => normalizeName(g[0]!) === key);
  // Very short aliases ("PES") match too much on a search engine; leave them out.
  const rest = (group ?? []).filter((a) => normalizeName(a) !== normalizeName(name) && a.length > 3 && !/campus|bangalore|bengaluru/i.test(a));
  return [name.trim(), ...rest];
}

export function isSameInstitution(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return institutionKey(a) === institutionKey(b);
}
