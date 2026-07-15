export const JOURNEY_CHAPTERS = [
  { id: 'threshold', index: '01', label: 'Threshold', tone: 'mineral' },
  { id: 'field', index: '02', label: 'Synthetic field', tone: 'cyan' },
  { id: 'lens', index: '03', label: 'Lens knot', tone: 'cyan' },
  { id: 'proof', index: '04', label: 'Evidence', tone: 'paper' },
  { id: 'passage', index: '05', label: 'Aegis passage', tone: 'brass' },
  { id: 'access', index: '06', label: 'Access trace', tone: 'cyan' },
  { id: 'schoolmate', index: '07', label: 'School products', tone: 'moss' },
  { id: 'descent', index: '08', label: 'Rule descent', tone: 'mercury' },
  { id: 'lamp', index: '09', label: 'Lamp chamber', tone: 'mercury' },
  { id: 'build', index: '10', label: 'Build proof', tone: 'mercury' },
  { id: 'infect', index: '11', label: '1-bit breach', tone: 'vermilion' },
  { id: 'research', index: '12', label: 'Research crossing', tone: 'paper' },
  { id: 'evidence-weave', index: '13', label: 'Evidence weave', tone: 'brass' },
  { id: 'final-return', index: '14', label: 'Final return', tone: 'mineral' },
  { id: 'open-paths', index: '15', label: 'Open paths', tone: 'cyan' },
  { id: 'dawn', index: '16', label: 'Dawn', tone: 'dawn' },
] as const;

export type JourneyChapter = (typeof JOURNEY_CHAPTERS)[number]['id'];
export type JourneyTone = (typeof JOURNEY_CHAPTERS)[number]['tone'];

export const FIRST_CHAPTER: JourneyChapter = JOURNEY_CHAPTERS[0].id;

export function isJourneyChapter(value: string | undefined): value is JourneyChapter {
  return JOURNEY_CHAPTERS.some((chapter) => chapter.id === value);
}

export function chapterIndex(chapter: JourneyChapter): number {
  return JOURNEY_CHAPTERS.findIndex((candidate) => candidate.id === chapter);
}

export function chapterTone(chapter: JourneyChapter): JourneyTone {
  return JOURNEY_CHAPTERS.find((candidate) => candidate.id === chapter)?.tone ?? 'mineral';
}

