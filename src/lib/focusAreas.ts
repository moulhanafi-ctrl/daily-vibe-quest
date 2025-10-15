// Mapping between internal focus area IDs, slugs, and display titles
// Keep this single source of truth for routing and DB lookups

export type FocusAreaKey =
  | "anxiety-support"
  | "depression-recovery"
  | "relationship-guidance"
  | "parenting"
  | "addiction-recovery"
  | "self-esteem"
  | "grief-loss"
  | "stress-management"
  | "loneliness"
  | "school-work-pressure"
  | "sleep-rest"
  | "motivation-purpose";

export type FocusAreaId =
  | "anxiety"
  | "depression"
  | "relationships"
  | "family"
  | "addiction"
  | "self-esteem"
  | "grief"
  | "stress"
  | "loneliness"
  | "pressure"
  | "sleep"
  | "motivation";

export interface FocusAreaMapping {
  id: FocusAreaId;        // DB focus_area
  slug: FocusAreaKey;     // URL slug
  title: string;          // Human title
}

export const FOCUS_AREA_MAPPINGS: FocusAreaMapping[] = [
  { id: "anxiety",       slug: "anxiety-support",        title: "Anxiety Support" },
  { id: "depression",    slug: "depression-recovery",    title: "Depression Recovery" },
  { id: "relationships", slug: "relationship-guidance",  title: "Relationship Guidance" },
  { id: "family",        slug: "parenting",              title: "Parenting" },
  { id: "addiction",     slug: "addiction-recovery",     title: "Addiction Recovery" },
  { id: "self-esteem",   slug: "self-esteem",            title: "Self-Esteem" },
  { id: "grief",         slug: "grief-loss",             title: "Grief & Loss" },
  { id: "stress",        slug: "stress-management",      title: "Stress Management" },
  { id: "loneliness",    slug: "loneliness",             title: "Loneliness" },
  { id: "pressure",      slug: "school-work-pressure",   title: "School & Work Pressure" },
  { id: "sleep",         slug: "sleep-rest",             title: "Sleep & Rest" },
  { id: "motivation",    slug: "motivation-purpose",     title: "Motivation & Purpose" },
];

export const getById = (id: string | undefined) =>
  FOCUS_AREA_MAPPINGS.find(m => m.id === (id as FocusAreaId));

export const getBySlug = (slug: string | undefined) =>
  FOCUS_AREA_MAPPINGS.find(m => m.slug === (slug as FocusAreaKey));

export const slugForId = (id: string) => getById(id)?.slug || id;
export const titleForId = (id: string) => getById(id)?.title || id;
