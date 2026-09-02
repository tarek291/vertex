import posthog from 'posthog-js'

import {
  ANALYTICS_EVENTS,
  clampQuery,
  urlHost,
  type AnalyticsEventProperties,
} from './events'

/**
 * Client-side analytics helpers. Import these from `"use client"` components
 * instead of calling `posthog.capture("...")` with a string literal, so event
 * names and property shapes stay checked against `./events`.
 *
 * `posthog-js` is browser-only — never import this file server-side. Every
 * helper is a no-op until `posthog.init()` has run (guarded by `__loaded`), so
 * a missing PostHog config never throws in the UI.
 */

function capture<E extends keyof AnalyticsEventProperties>(
  event: E,
  properties: AnalyticsEventProperties[E],
): void {
  if (typeof window === 'undefined') return
  if (!posthog.__loaded) return
  posthog.capture(event, properties)
}

export const analytics = {
  videoPlayed(props: AnalyticsEventProperties['video_played']) {
    capture(ANALYTICS_EVENTS.VIDEO_PLAYED, props)
  },
  videoResumed(props: AnalyticsEventProperties['video_resumed']) {
    capture(ANALYTICS_EVENTS.VIDEO_RESUMED, props)
  },
  videoWatchProgressed(
    props: AnalyticsEventProperties['video_watch_progressed'],
  ) {
    capture(ANALYTICS_EVENTS.VIDEO_WATCH_PROGRESSED, props)
  },
  videoPlayFailed(props: AnalyticsEventProperties['video_play_failed']) {
    capture(ANALYTICS_EVENTS.VIDEO_PLAY_FAILED, props)
  },
  lessonCompleted(props: AnalyticsEventProperties['lesson_completed']) {
    capture(ANALYTICS_EVENTS.LESSON_COMPLETED, props)
  },

  lessonViewed(props: AnalyticsEventProperties['lesson_viewed']) {
    capture(ANALYTICS_EVENTS.LESSON_VIEWED, props)
  },
  lessonTabSelected(props: AnalyticsEventProperties['lesson_tab_selected']) {
    capture(ANALYTICS_EVENTS.LESSON_TAB_SELECTED, props)
  },
  lessonResourceClicked(
    props: AnalyticsEventProperties['lesson_resource_clicked'],
  ) {
    capture(ANALYTICS_EVENTS.LESSON_RESOURCE_CLICKED, props)
  },
  lessonBookmarkClicked(
    props: AnalyticsEventProperties['lesson_bookmark_clicked'],
  ) {
    capture(ANALYTICS_EVENTS.LESSON_BOOKMARK_CLICKED, props)
  },
  lessonClicked(props: AnalyticsEventProperties['lesson_clicked']) {
    capture(ANALYTICS_EVENTS.LESSON_CLICKED, props)
  },

  /**
   * Search events. No call sites yet — the `search-results-page` prompt wires
   * these into the results UI. `query` is capped by `clampQuery` before send.
   */
  searchPerformed(
    props: Omit<
      AnalyticsEventProperties['search_performed'],
      'query' | 'query_length'
    > & {query: string},
  ) {
    const query = clampQuery(props.query)
    capture(ANALYTICS_EVENTS.SEARCH_PERFORMED, {
      ...props,
      query,
      query_length: query.length,
    })
  },
  searchResultsSorted(
    props: Omit<AnalyticsEventProperties['search_results_sorted'], 'query'> & {
      query: string
    },
  ) {
    capture(ANALYTICS_EVENTS.SEARCH_RESULTS_SORTED, {
      ...props,
      query: clampQuery(props.query),
    })
  },
  searchResultOpened(
    props: Omit<AnalyticsEventProperties['search_result_opened'], 'query'> & {
      query: string
    },
  ) {
    capture(ANALYTICS_EVENTS.SEARCH_RESULT_OPENED, {
      ...props,
      query: clampQuery(props.query),
    })
  },
  searchNoResults(
    props: Omit<
      AnalyticsEventProperties['search_no_results'],
      'query' | 'query_length'
    > & {query: string},
  ) {
    const query = clampQuery(props.query)
    capture(ANALYTICS_EVENTS.SEARCH_NO_RESULTS, {
      ...props,
      query,
      query_length: query.length,
    })
  },
}

export {ANALYTICS_EVENTS, clampQuery, urlHost}
