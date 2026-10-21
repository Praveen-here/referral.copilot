// Job facts that are safe to put in a message.

/** LinkedIn's posting number from a job URL (…/jobs/view/<slug->4471337817 or ?currentJobId=…). */
export function linkedinPostingId(url: string | null | undefined): string | null {
  if (!url || !/linkedin\.com/i.test(url)) return null;
  return url.match(/[?&]currentJobId=(\d{6,})/)?.[1] ?? url.match(/\/jobs\/view\/(?:[^/?#]*?-)?(\d{6,})/)?.[1] ?? null;
}

/**
 * The company's own job/requisition ID, or null. A LinkedIn posting number is not the
 * company's job ID (the referral portal won't recognise it), so messages link to the
 * posting instead of quoting it as an ID.
 */
export function companyJobId(job: { externalJobId: string | null; url: string | null }): string | null {
  const id = job.externalJobId?.trim();
  if (!id) return null;
  return id === linkedinPostingId(job.url) ? null : id;
}
