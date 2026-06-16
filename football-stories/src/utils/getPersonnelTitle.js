// Generic role label derived from the is_owner/is_gm/is_coach booleans.
// We deliberately do NOT use any verbatim source title text — only these
// factual role flags drive the title bar.
export function roleLabelFromFlags(r) {
  if (!r) return null;
  const parts = [];
  if (r.is_owner) parts.push("Owner");
  if (r.is_gm) parts.push("General Manager");
  if (r.is_coach) parts.push("Head Coach");
  return parts.length ? parts.join(" / ") : null;
}

// Pick the most common boolean-derived role label across an admin segment's
// records, for the card/ribbon title bar.
export function getPersonnelTitle(adminSegment) {
  if (!adminSegment?.records?.length) return null;

  const counts = {};
  for (const r of adminSegment.records) {
    const label = roleLabelFromFlags(r);
    if (!label) continue;
    counts[label] = (counts[label] || 0) + 1;
  }

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}
