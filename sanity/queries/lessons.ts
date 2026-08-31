import { defineQuery } from 'next-sanity'

import { imageFragment } from './fragments'

// Full lesson detail by slug. Also resolves the owning course (reverse
// reference) plus that course's module layout, so the data layer can derive
// the "Lesson X.Y" label. A lesson does not store its parent course.
export const LESSON_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "lesson" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    videoUrl,
    duration,
    freePreview,
    studentCount,
    "poster": poster{ ${imageFragment} },
    keyPoints,
    proTip,
    notes[]{
      ...,
      _type == "image" => { ${imageFragment} }
    },
    resources[]{
      _key,
      type,
      title,
      description,
      url
    },
    "course": *[_type == "course" && references(^._id)][0]{
      _id,
      title,
      "slug": slug.current,
      "instructor": instructor->{ _id, name, "slug": slug.current },
      modules[]{
        _key,
        title,
        "lessonIds": lessons[]._ref
      }
    }
  }
`)

// Slugs for generateStaticParams.
export const LESSON_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "lesson" && defined(slug.current)]{ "slug": slug.current }
`)
