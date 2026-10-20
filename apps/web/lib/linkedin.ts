// Links the user opens in their own browser. The app never fetches LinkedIn (plan §12).

export function profileLink(person: { fullName: string; linkedinUrl: string | null }, companyName?: string) {
  if (person.linkedinUrl) return person.linkedinUrl;
  const query = [person.fullName, companyName].filter(Boolean).join(" ");
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`;
}

export function openInNewTab(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
