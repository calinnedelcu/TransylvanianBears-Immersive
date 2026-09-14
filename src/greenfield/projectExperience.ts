export const PROJECT_EXPERIENCE: Record<string, { anchor: string; is3D: boolean }> = {
  'project-nexus': { anchor: 'mf-lens', is3D: true },
  aegis: { anchor: 'mf-access', is3D: true },
  schoolmate: { anchor: 'mf-schoolmate', is3D: true },
  'the-buried-hands': { anchor: 'mf-descent', is3D: true },
  'economy-news': { anchor: 'rc-economy', is3D: false },
  'automation-risk': { anchor: 'rc-automation', is3D: false },
  'infect-exe': { anchor: 'mf-infect', is3D: false },
};

export function projectExperienceUrl(slug: string) {
  const entry = PROJECT_EXPERIENCE[slug];
  return entry ? `/?project=${encodeURIComponent(slug)}#${entry.anchor}` : undefined;
}
