/** Initials from the username, skipping common prefixes like "eng_" or "dr.". */
export function initials(handle: string) {
  const core = handle.replace(/^(eng|engr|dr|mr|ms)[._]?/i, '') || handle;
  const letters = core.replace(/[^A-Za-z]/g, '');
  return (letters || handle).slice(0, 2).toUpperCase();
}
