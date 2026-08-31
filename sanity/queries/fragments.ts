// Reusable GROQ fragments for consistent field selection across queries.

export const imageFragment = /* groq */ `
  asset->{
    _id,
    url,
    metadata { lqip, dimensions }
  },
  "alt": coalesce(alt, "")
`

export const instructorRefFragment = /* groq */ `
  _id,
  name,
  "slug": slug.current,
  "photo": photo{ ${imageFragment} },
  expertise
`

export const categoryRefFragment = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  description
`

// A lesson as it appears inside a course's curriculum or a search result card.
export const lessonCardFragment = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  duration,
  freePreview,
  studentCount,
  "poster": poster{ ${imageFragment} },
  keyPoints
`

// A course as it appears in listings (catalog, instructor page, category page).
export const courseCardFragment = /* groq */ `
  _id,
  title,
  "slug": slug.current,
  summary,
  level,
  price,
  popular,
  studentCount,
  "coverImage": coverImage{ ${imageFragment} },
  "instructor": instructor->{ _id, name, "slug": slug.current },
  "category": category->{ _id, title, "slug": slug.current },
  "moduleCount": count(modules),
  "lessonCount": count(modules[].lessons[]),
  "totalDurationSeconds": math::sum(modules[].lessons[]->duration)
`
