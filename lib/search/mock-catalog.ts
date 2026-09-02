import 'server-only'

import type {LessonResult} from './contract'
import type {HydratedLesson} from './hydrate'

/**
 * Hardcoded lesson/course catalog for the dev-only search fallback
 * (`lib/search/mock.ts`). Used only when the Sanity Context MCP is unavailable
 * (unset URL or no deployed Studio — AGENTS §12) and `NODE_ENV !== 'production'`,
 * so the search UI + local Ollama can be exercised before the Studio is live.
 *
 * These lessons do NOT exist in Sanity — clicking a result card will 404 on the
 * lesson page. The catalog is coherent top-to-bottom (AGENTS §7) so screenshots
 * of `/search` are meaningful.
 */

/** A card's worth of lesson data plus a plain-text `notes` blob for matching. */
export type MockLesson = HydratedLesson & {
  /** Plain-text lesson notes — used only for keyword/LLM matching, never returned. */
  notes: string
}

const NEXTJS_COURSE = {
  courseId: 'mock-course-nextjs-app-router',
  courseTitle: 'Next.js App Router in Practice',
  courseSlug: 'mock-nextjs-app-router',
}

const TS_COURSE = {
  courseId: 'mock-course-typescript-for-react',
  courseTitle: 'TypeScript for React Developers',
  courseSlug: 'mock-typescript-for-react',
}

export const MOCK_LESSONS: MockLesson[] = [
  {
    ...NEXTJS_COURSE,
    lessonId: 'mock-lesson-data-fetching',
    lessonSlug: 'mock-data-fetching-in-the-app-router',
    lessonTitle: 'Data Fetching in the App Router',
    moduleLabel: 'Module 1',
    lessonLabel: 'Lesson 1.1',
    keyPoints: [
      'Fetching in Server Components with async/await',
      'Request deduplication and the fetch cache',
      'Parallel vs. sequential data loading',
    ],
    durationSeconds: 540,
    notes:
      'This lesson covers how to fetch data directly inside Server Components using async await, how Next.js deduplicates identical fetch requests within a render, and how to choose between parallel and sequential data fetching to avoid waterfalls. It also touches passing data down to Client Components as props.',
  },
  {
    ...NEXTJS_COURSE,
    lessonId: 'mock-lesson-caching-revalidation',
    lessonSlug: 'mock-caching-and-revalidation',
    lessonTitle: 'Caching and Revalidation Strategies',
    moduleLabel: 'Module 1',
    lessonLabel: 'Lesson 1.2',
    keyPoints: [
      'Time-based revalidation with the revalidate option',
      'On-demand revalidation with revalidateTag and revalidatePath',
      'Opting out of caching for dynamic data',
    ],
    durationSeconds: 720,
    notes:
      'A tour of the Next.js caching layers: the fetch data cache, the full route cache, and the router cache. Learn time-based revalidation, on-demand revalidation with tags and paths, and how to force a route to be fully dynamic when caching is not appropriate.',
  },
  {
    ...NEXTJS_COURSE,
    lessonId: 'mock-lesson-server-client-components',
    lessonSlug: 'mock-server-and-client-components',
    lessonTitle: 'Server and Client Components',
    moduleLabel: 'Module 2',
    lessonLabel: 'Lesson 2.1',
    keyPoints: [
      'The "use client" boundary and where to place it',
      'What can and cannot cross the server/client boundary',
      'Composing Server Components inside Client Components',
    ],
    durationSeconds: 480,
    notes:
      'Explains the mental model behind React Server Components in Next.js: what renders on the server, what ships to the browser, and how the "use client" directive marks the boundary. Covers passing serializable props, interleaving server and client trees, and common boundary mistakes.',
  },
  {
    ...NEXTJS_COURSE,
    lessonId: 'mock-lesson-dynamic-routing',
    lessonSlug: 'mock-dynamic-routes-and-params',
    lessonTitle: 'Dynamic Routes and Route Params',
    moduleLabel: 'Module 2',
    lessonLabel: 'Lesson 2.2',
    keyPoints: [
      'Dynamic segments and catch-all routes',
      'Reading params and searchParams in a page',
      'generateStaticParams for pre-rendering',
    ],
    durationSeconds: 420,
    notes:
      'Covers file-system based dynamic routing in the App Router: single dynamic segments, catch-all and optional catch-all routes, reading the params and searchParams props, and pre-rendering known paths with generateStaticParams.',
  },
  {
    ...NEXTJS_COURSE,
    lessonId: 'mock-lesson-streaming-suspense',
    lessonSlug: 'mock-streaming-with-suspense',
    lessonTitle: 'Streaming UI with Suspense',
    moduleLabel: 'Module 3',
    lessonLabel: 'Lesson 3.1',
    keyPoints: [
      'Wrapping slow data in Suspense boundaries',
      'loading.tsx and route-level streaming',
      'Designing meaningful skeleton states',
    ],
    durationSeconds: 600,
    notes:
      'Shows how to stream parts of a page as their data resolves using React Suspense, the special loading.tsx file for route-level fallbacks, and how to design skeletons that match the final layout so streaming does not cause layout shift.',
  },
  {
    ...TS_COURSE,
    lessonId: 'mock-lesson-types-vs-interfaces',
    lessonSlug: 'mock-types-vs-interfaces',
    lessonTitle: 'Types vs. Interfaces',
    moduleLabel: 'Module 1',
    lessonLabel: 'Lesson 1.1',
    keyPoints: [
      'When declaration merging matters',
      'Unions and intersections with type aliases',
      'A practical default for React props',
    ],
    durationSeconds: 300,
    notes:
      'Compares type aliases and interfaces in TypeScript: what each can express, when interface declaration merging is useful, why unions need a type alias, and a simple default rule for typing React component props.',
  },
  {
    ...TS_COURSE,
    lessonId: 'mock-lesson-generics',
    lessonSlug: 'mock-generics-in-practice',
    lessonTitle: 'Generics in Practice',
    moduleLabel: 'Module 2',
    lessonLabel: 'Lesson 2.1',
    keyPoints: [
      'Writing a generic hook',
      'Constraining type parameters with extends',
      'Letting inference do the work',
    ],
    durationSeconds: 660,
    notes:
      'A hands-on look at generics: building a reusable generic custom hook, constraining type parameters with extends, providing sensible defaults, and structuring signatures so TypeScript infers the type arguments instead of forcing callers to annotate.',
  },
  {
    ...TS_COURSE,
    lessonId: 'mock-lesson-narrowing',
    lessonSlug: 'mock-narrowing-and-type-guards',
    lessonTitle: 'Narrowing and Type Guards',
    moduleLabel: 'Module 2',
    lessonLabel: 'Lesson 2.2',
    keyPoints: [
      'typeof, in, and instanceof narrowing',
      'User-defined type guard functions',
      'Discriminated unions for state',
    ],
    durationSeconds: 510,
    notes:
      'Explains control-flow narrowing in TypeScript with typeof, the in operator, and instanceof, how to write user-defined type guards that return a type predicate, and how discriminated unions model component and request state safely.',
  },
]

const LESSON_BY_ID = new Map(MOCK_LESSONS.map((l) => [l.lessonId, l]))
const LESSON_BY_SLUG = new Map(MOCK_LESSONS.map((l) => [l.lessonSlug, l]))

/** Look up a mock lesson by its id (used to ground LLM-selected ids). */
export function getMockLesson(id: string): MockLesson | undefined {
  return LESSON_BY_ID.get(id)
}

/**
 * Look up a mock lesson by its slug. Used by the lesson page to render a
 * placeholder (instead of a 404) when a dev-only mock search result is clicked
 * before real content is in Sanity.
 */
export function getMockLessonBySlug(slug: string): MockLesson | undefined {
  return LESSON_BY_SLUG.get(slug)
}

export type MockMatch = {
  lesson: MockLesson
  matchedOn: 'title' | 'keyPoints' | 'notes'
  relevance: number
}

/**
 * Token-based keyword match over the mock catalog (AGENTS §11 — per-token
 * substring, never the whole query as one pattern). Ranks title hits above
 * keyPoints above notes, nudged by how many distinct query tokens hit. Returns
 * best-first; empty query or no hits → `[]`.
 */
export function keywordFilterMockLessons(query: string): MockMatch[] {
  const tokens = [
    ...new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 2),
    ),
  ]
  if (tokens.length === 0) return []

  const matches: MockMatch[] = []
  for (const lesson of MOCK_LESSONS) {
    const title = lesson.lessonTitle.toLowerCase()
    const keyPoints = lesson.keyPoints.join(' • ').toLowerCase()
    const notes = lesson.notes.toLowerCase()

    let titleHits = 0
    let keyPointHits = 0
    let noteHits = 0
    for (const token of tokens) {
      if (title.includes(token)) titleHits += 1
      else if (keyPoints.includes(token)) keyPointHits += 1
      else if (notes.includes(token)) noteHits += 1
    }

    const totalHits = titleHits + keyPointHits + noteHits
    if (totalHits === 0) continue

    const coverage = totalHits / tokens.length
    let matchedOn: MockMatch['matchedOn']
    let base: number
    if (titleHits > 0) {
      matchedOn = 'title'
      base = 0.9
    } else if (keyPointHits > 0) {
      matchedOn = 'keyPoints'
      base = 0.6
    } else {
      matchedOn = 'notes'
      base = 0.4
    }

    matches.push({
      lesson,
      matchedOn,
      relevance: Math.min(1, Number((base * (0.6 + 0.4 * coverage)).toFixed(3))),
    })
  }

  return matches.sort((a, b) => b.relevance - a.relevance)
}

/** Shape a mock lesson into a `lesson` result card with the given description. */
export function toLessonResult(
  lesson: MockLesson,
  description: string,
): LessonResult {
  return {
    kind: 'lesson',
    lessonId: lesson.lessonId,
    lessonSlug: lesson.lessonSlug,
    lessonTitle: lesson.lessonTitle,
    courseId: lesson.courseId,
    courseTitle: lesson.courseTitle,
    courseSlug: lesson.courseSlug,
    moduleLabel: lesson.moduleLabel,
    lessonLabel: lesson.lessonLabel,
    keyPoints: lesson.keyPoints,
    durationSeconds: lesson.durationSeconds,
    description,
  }
}
