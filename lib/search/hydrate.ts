import 'server-only'

import {cache} from 'react'

import type {LessonResult} from './contract'
import {serverClient} from '@/sanity/lib/client'

/**
 * Turn the LLM's list of lesson ids into fully-grounded lesson result cards.
 *
 * The model only picks lessons (see `lib/search/prompt.ts`); every field a card
 * renders — title, slug, key points, duration, owning course, and the derived
 * `Module X` / `Lesson X.Y` labels — comes from Sanity here, via the same
 * reverse-reference + array-order derivation as `sanity/lib/api.ts`
 * `getLessonBySlug`. Ids that don't resolve to a real lesson are dropped: that
 * is the anti-hallucination guard (AGENTS §7, §11).
 *
 * Server-only. Reads the private dataset through the tokened `serverClient`.
 */

const fetchOptions = {perspective: 'published', stega: false} as const

type RawModule = {lessonIds: (string | null)[] | null}

type RawLesson = {
  _id: string
  lessonSlug: string | null
  lessonTitle: string | null
  keyPoints: string[] | null
  durationSeconds: number | null
  course: {
    _id: string
    courseTitle: string | null
    courseSlug: string | null
    modules: RawModule[] | null
  } | null
}

const HYDRATE_QUERY = /* groq */ `
  *[_type == "lesson" && _id in $ids]{
    _id,
    "lessonSlug": slug.current,
    "lessonTitle": title,
    keyPoints,
    "durationSeconds": duration,
    "course": *[_type == "course" && references(^._id)][0]{
      _id,
      "courseTitle": title,
      "courseSlug": slug.current,
      modules[]{ "lessonIds": lessons[]._ref }
    }
  }
`

/** e.g. `{ moduleLabel: "Module 5", lessonLabel: "Lesson 5.1" }` from array order. */
function deriveLabels(
  lessonId: string,
  modules: RawModule[] | null,
): {moduleLabel: string | null; lessonLabel: string | null} {
  const mods = modules ?? []
  for (let m = 0; m < mods.length; m += 1) {
    const lessonIndex = (mods[m].lessonIds ?? []).indexOf(lessonId)
    if (lessonIndex !== -1) {
      return {
        moduleLabel: `Module ${m + 1}`,
        lessonLabel: `Lesson ${m + 1}.${lessonIndex + 1}`,
      }
    }
  }
  return {moduleLabel: null, lessonLabel: null}
}

/** Fields hydration owns — everything on a lesson card except `description`. */
export type HydratedLesson = Omit<LessonResult, 'kind' | 'description'>

/**
 * Fetch + shape the given lesson ids. Order is NOT preserved — the caller
 * re-orders to the model's ranking. Unknown/unpublished/course-less ids are
 * silently omitted. A lesson with no owning course is kept with null labels.
 */
export const hydrateLessons = cache(
  async (ids: string[]): Promise<Map<string, HydratedLesson>> => {
    const unique = [...new Set(ids)].filter(Boolean)
    if (unique.length === 0) return new Map()

    const rows = (await serverClient.fetch(
      HYDRATE_QUERY,
      {ids: unique},
      fetchOptions,
    )) as RawLesson[]

    const out = new Map<string, HydratedLesson>()
    for (const row of rows) {
      if (!row.lessonSlug || !row.lessonTitle) continue
      const course = row.course
      const {moduleLabel, lessonLabel} = deriveLabels(
        row._id,
        course?.modules ?? null,
      )
      out.set(row._id, {
        lessonId: row._id,
        lessonSlug: row.lessonSlug,
        lessonTitle: row.lessonTitle,
        courseId: course?._id ?? '',
        courseTitle: course?.courseTitle ?? '',
        courseSlug: course?.courseSlug ?? '',
        moduleLabel,
        lessonLabel,
        keyPoints: (row.keyPoints ?? []).filter(
          (k): k is string => typeof k === 'string',
        ),
        durationSeconds:
          typeof row.durationSeconds === 'number' ? row.durationSeconds : null,
      })
    }
    return out
  },
)
