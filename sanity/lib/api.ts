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
import { sanityFetch } from './live'

/**
 * Server-only data access layer. Pages call these instead of touching the
 * Sanity client directly. Reads go through `sanityFetch` (Live Content API);
 * static-params helpers use the tokened `serverClient` with published
 * perspective and stega disabled.
 */

export const getCourses = cache(async () => {
  const { data } = await sanityFetch({ query: COURSES_QUERY })
  return data
})

export const getFeaturedCourses = cache(async () => {
  const { data } = await sanityFetch({ query: FEATURED_COURSES_QUERY })
  return data
})

export const getCourseBySlug = cache(async (slug: string) => {
  const { data } = await sanityFetch({
    query: COURSE_BY_SLUG_QUERY,
    params: { slug },
  })
  return data
})

export const getInstructors = cache(async () => {
  const { data } = await sanityFetch({ query: INSTRUCTORS_QUERY })
  return data
})

export const getInstructorBySlug = cache(async (slug: string) => {
  const { data } = await sanityFetch({
    query: INSTRUCTOR_BY_SLUG_QUERY,
    params: { slug },
  })
  return data
})

export const getCategories = cache(async () => {
  const { data } = await sanityFetch({ query: CATEGORIES_QUERY })
  return data
})

export const getCategoryBySlug = cache(async (slug: string) => {
  const { data } = await sanityFetch({
    query: CATEGORY_BY_SLUG_QUERY,
    params: { slug },
  })
  return data
})

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
  const { data: lesson } = await sanityFetch({
    query: LESSON_BY_SLUG_QUERY,
    params: { slug },
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

export const getCourseSlugs = cache(async () => {
  return serverClient.fetch(
    COURSE_SLUGS_QUERY,
    {},
    { perspective: 'published', stega: false }
  )
})

export const getLessonSlugs = cache(async () => {
  return serverClient.fetch(
    LESSON_SLUGS_QUERY,
    {},
    { perspective: 'published', stega: false }
  )
})
