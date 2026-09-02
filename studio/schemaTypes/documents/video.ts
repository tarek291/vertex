import {DocumentVideoIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Video intelligence document — one per unique lesson video URL, built by the
 * offline ingestion pipeline (`scripts/ingest-videos/`), never authored by hand.
 *
 * Holds the transcript split into short timestamped `chunks` and a table of
 * contents (`chapters`). Lessons link to it by video URL; search treats it as
 * an internal lookup and never surfaces it as a result (AGENTS §7–§9).
 *
 * There is deliberately no field that stores the whole transcript in one string
 * — a query must never be able to return it wholesale (AGENTS §12).
 */
export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'document',
  icon: DocumentVideoIcon,
  fields: [
    defineField({
      name: 'videoId',
      title: 'Video ID',
      type: 'string',
      readOnly: true,
      description: 'Provider-native id. The document _id is "video.<sanitised videoId>".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'provider',
      title: 'Provider',
      type: 'string',
      readOnly: true,
      options: {
        list: [
          {title: 'YouTube', value: 'youtube'},
          {title: 'Vimeo', value: 'vimeo'},
          {title: 'Bunny', value: 'bunny'},
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Source URL',
      type: 'url',
      readOnly: true,
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'For Studio readability. Sourced from the provider during ingestion.',
    }),
    defineField({
      name: 'duration',
      title: 'Duration (seconds)',
      type: 'number',
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'chaptersSource',
      title: 'Chapters source',
      type: 'string',
      readOnly: true,
      description:
        'Where the table of contents came from: the provider’s own chapters, ' +
        'synthesised from the transcript, or none available.',
      options: {
        list: [
          {title: 'Provider chapters', value: 'youtube'},
          {title: 'Synthesised from transcript', value: 'synthesized'},
          {title: 'None', value: 'none'},
        ],
      },
    }),
    defineField({
      name: 'chapters',
      title: 'Table of contents',
      type: 'array',
      description: 'Chapter markers, ascending. The first entry starts at 0.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'videoChapter',
          fields: [
            defineField({
              name: 'startSeconds',
              title: 'Start (seconds)',
              type: 'number',
              validation: (rule) => rule.required().min(0),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {title: 'label', subtitle: 'startSeconds'},
            prepare({title, subtitle}) {
              const s = typeof subtitle === 'number' ? subtitle : 0
              const mm = Math.floor(s / 60)
              const ss = String(Math.floor(s % 60)).padStart(2, '0')
              return {title: title || 'Untitled chapter', subtitle: `${mm}:${ss}`}
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'chunks',
      title: 'Transcript chunks',
      type: 'array',
      readOnly: true,
      description:
        'The transcript as many short timestamped pieces, ascending. ' +
        'Machine-authored by the ingestion pipeline.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'videoChunk',
          fields: [
            defineField({
              name: 'startSeconds',
              title: 'Start (seconds)',
              type: 'number',
              validation: (rule) => rule.required().min(0),
            }),
            defineField({
              name: 'text',
              title: 'Text',
              type: 'text',
              rows: 2,
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {title: 'text', subtitle: 'startSeconds'},
            prepare({title, subtitle}) {
              const s = typeof subtitle === 'number' ? subtitle : 0
              const mm = Math.floor(s / 60)
              const ss = String(Math.floor(s % 60)).padStart(2, '0')
              return {title: title || 'Empty chunk', subtitle: `${mm}:${ss}`}
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'ingestedAt',
      title: 'Ingested at',
      type: 'datetime',
      readOnly: true,
    }),
  ],
  preview: {
    select: {title: 'title', videoId: 'videoId', chapters: 'chapters', chunks: 'chunks'},
    prepare({title, videoId, chapters, chunks}) {
      const chapterCount = Array.isArray(chapters) ? chapters.length : 0
      const chunkCount = Array.isArray(chunks) ? chunks.length : 0
      return {
        title: title || videoId || 'Untitled video',
        subtitle: `${chapterCount} chapter${chapterCount === 1 ? '' : 's'} · ${chunkCount} chunk${
          chunkCount === 1 ? '' : 's'
        }`,
      }
    },
  },
})
