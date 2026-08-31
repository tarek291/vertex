import { defineQuery } from 'next-sanity'

import { courseCardFragment, imageFragment, instructorRefFragment } from './fragments'

// All instructors, for the instructor index.
export const INSTRUCTORS_QUERY = defineQuery(/* groq */ `
  *[_type == "instructor" && defined(slug.current)] | order(name asc) {
    _id,
    name,
    "slug": slug.current,
    "photo": photo{ ${imageFragment} },
    expertise
  }
`)

// Instructor detail by slug, incl. the courses they teach (reverse reference).
export const INSTRUCTOR_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "instructor" && slug.current == $slug][0] {
    ${instructorRefFragment},
    bio,
    "courses": *[_type == "course" && references(^._id)]
      | order(popular desc, _createdAt desc) {
      ${courseCardFragment}
    }
  }
`)
