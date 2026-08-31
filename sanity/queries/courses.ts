import { defineQuery } from 'next-sanity'

import {
  courseCardFragment,
  imageFragment,
  instructorRefFragment,
  lessonCardFragment,
} from './fragments'

// All courses, popular first, for the catalog.
export const COURSES_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && defined(slug.current)]
    | order(popular desc, _createdAt desc) {
    ${courseCardFragment}
  }
`)

// Popular courses only, for the home page (limited).
export const FEATURED_COURSES_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && defined(slug.current) && popular == true]
    | order(_createdAt desc)[0...6] {
    ${courseCardFragment}
  }
`)

// Full course detail by slug, incl. expanded curriculum.
export const COURSE_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && slug.current == $slug][0] {
    _id,
    title,
    "slug": slug.current,
    summary,
    level,
    price,
    popular,
    studentCount,
    "coverImage": coverImage{ ${imageFragment} },
    "instructor": instructor->{ ${instructorRefFragment} },
    "category": category->{
      _id,
      title,
      "slug": slug.current,
      description
    },
    learningOutcomes[]{
      _key,
      icon,
      title,
      description
    },
    "moduleCount": count(modules),
    "lessonCount": count(modules[].lessons[]),
    "totalDurationSeconds": math::sum(modules[].lessons[]->duration),
    modules[]{
      _key,
      title,
      summary,
      "lessons": lessons[]->{ ${lessonCardFragment} }
    }
  }
`)

// Slugs for generateStaticParams.
export const COURSE_SLUGS_QUERY = defineQuery(/* groq */ `
  *[_type == "course" && defined(slug.current)]{ "slug": slug.current }
`)
