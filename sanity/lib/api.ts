import 'server-only'

import { cache } from 'react'

import {
  CATEGORIES_QUERY,
  CATEGORY_BY_SLUG_QUERY,
  COURSE_BY_SLUG_QUERY,
  COURSE_SLUGS_QUERY,
  COURSES_QUERY,
  FEATURED_COURSES_QUERY,
  INSTRUCTOR_BY_SLUG_QUERY,
  INSTRUCTORS_QUERY,
  LESSON_BY_SLUG_QUERY,
  LESSON_SLUGS_QUERY,
} from '../queries'
import { serverClient } from './client'
import type {
  CATEGORIES_QUERY_RESULT,
  CATEGORY_BY_SLUG_QUERY_RESULT,
  COURSE_BY_SLUG_QUERY_RESULT,
  COURSE_SLUGS_QUERY_RESULT,
  COURSES_QUERY_RESULT,
  FEATURED_COURSES_QUERY_RESULT,
  INSTRUCTOR_BY_SLUG_QUERY_RESULT,
  INSTRUCTORS_QUERY_RESULT,
  LESSON_BY_SLUG_QUERY_RESULT,
  LESSON_SLUGS_QUERY_RESULT,
} from '@/sanity.types'

/**
 * Server-only data access layer. Pages call these instead of touching the
 * Sanity client directly.
 *
 * All reads go through the tokened, no-CDN `serverClient` with the published
 * perspective and stega disabled. The dataset is private, so a token is
 * required even for published content — `next-sanity`'s Live `sanityFetch()`
 * only attaches the token for draft perspectives, so it cannot read this
 * dataset and is not used here. `<SanityLive />` in the root layout still
 * drives client-side revalidation on published-content changes.
 *
 * TypeGen currently emits the per-query `*_RESULT` types but not the
 * `@sanity/client` `SanityQueries` augmentation, so `client.fetch` infers
 * `unknown`; each result is cast to its generated type.
 */

const fetchOptions = { perspective: 'published', stega: false } as const

const query = cache(
  async <T>(groqQuery: string, params: Record<string, unknown> = {}) => {
    return serverClient.fetch(groqQuery, params, fetchOptions) as Promise<T>
  }
)

export const getCourses = cache(() =>
  query<COURSES_QUERY_RESULT>(COURSES_QUERY)
)

export const getFeaturedCourses = cache(() =>
  query<FEATURED_COURSES_QUERY_RESULT>(FEATURED_COURSES_QUERY)
)

export const getCourseBySlug = cache((slug: string) =>
  query<COURSE_BY_SLUG_QUERY_RESULT>(COURSE_BY_SLUG_QUERY, { slug })
)

export const getInstructors = cache(() =>
  query<INSTRUCTORS_QUERY_RESULT>(INSTRUCTORS_QUERY)
)

export const getInstructorBySlug = cache((slug: string) =>
  query<INSTRUCTOR_BY_SLUG_QUERY_RESULT>(INSTRUCTOR_BY_SLUG_QUERY, { slug })
)

export const getCategories = cache(() =>
  query<CATEGORIES_QUERY_RESULT>(CATEGORIES_QUERY)
)

export const getCategoryBySlug = cache((slug: string) =>
  query<CATEGORY_BY_SLUG_QUERY_RESULT>(CATEGORY_BY_SLUG_QUERY, { slug })
)

type LessonCurriculumModule = {
  _key: string
  title: string | null
  lessonIds: string[] | null
}

/**
 * Lesson detail with the derived curriculum context a lesson does not store:
 * the owning course, the module that lists it, and 1-based `Module X` /
 * `Lesson X.Y` numbers computed from array order.
 */
export const getLessonBySlug = cache(async (slug: string) => {
  const lesson = await query<LESSON_BY_SLUG_QUERY_RESULT>(LESSON_BY_SLUG_QUERY, {
    slug,
  })
  if (!lesson) return null

  const course = lesson.course
  const modules = (course?.modules ?? []) as LessonCurriculumModule[]

  let moduleNumber: number | null = null
  let lessonNumber: number | null = null
  let moduleTitle: string | null = null

  modules.forEach((mod, moduleIndex) => {
    const lessonIndex = (mod.lessonIds ?? []).indexOf(lesson._id)
    if (lessonIndex !== -1) {
      moduleNumber = moduleIndex + 1
      lessonNumber = lessonIndex + 1
      moduleTitle = mod.title
    }
  })

  return {
    ...lesson,
    course: course
      ? {
          _id: course._id,
          title: course.title,
          slug: course.slug,
          instructor: course.instructor,
          moduleTitle,
          moduleNumber,
          lessonNumber,
          // e.g. "5.1" — null when no course references this lesson.
          label:
            moduleNumber && lessonNumber
              ? `${moduleNumber}.${lessonNumber}`
              : null,
        }
      : null,
  }
})

export const getCourseSlugs = cache(() =>
  query<COURSE_SLUGS_QUERY_RESULT>(COURSE_SLUGS_QUERY)
)

export const getLessonSlugs = cache(() =>
  query<LESSON_SLUGS_QUERY_RESULT>(LESSON_SLUGS_QUERY)
)
