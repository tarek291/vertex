import { defineQuery } from 'next-sanity'

import { categoryRefFragment, courseCardFragment } from './fragments'

// All categories, for filters and the category index.
export const CATEGORIES_QUERY = defineQuery(/* groq */ `
  *[_type == "category" && defined(slug.current)] | order(title asc) {
    ${categoryRefFragment}
  }
`)

// Category detail by slug, incl. the courses in it (reverse reference).
export const CATEGORY_BY_SLUG_QUERY = defineQuery(/* groq */ `
  *[_type == "category" && slug.current == $slug][0] {
    ${categoryRefFragment},
    "courses": *[_type == "course" && references(^._id)]
      | order(popular desc, _createdAt desc) {
      ${courseCardFragment}
    }
  }
`)
