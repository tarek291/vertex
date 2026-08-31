import {PlayIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const lesson = defineType({
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  icon: PlayIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'video', title: 'Video'},
    {name: 'notes', title: 'Notes & resources'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'freePreview',
      title: 'Free preview',
      type: 'boolean',
      group: 'content',
      description: 'Show a "Free preview" label. This is a label only — it does not grant access.',
      initialValue: false,
    }),
    defineField({
      name: 'studentCount',
      title: 'Student count',
      type: 'number',
      group: 'content',
      description: 'Display-only count shown in the UI.',
      initialValue: 0,
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      group: 'video',
      description: 'Embed URL for a YouTube, Vimeo, or Bunny video. Played on the lesson page.',
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'poster',
      title: 'Poster / thumbnail',
      type: 'image',
      group: 'video',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'duration',
      title: 'Duration (seconds)',
      type: 'number',
      group: 'video',
      description: 'Length of the lesson video in seconds. The frontend formats this for display.',
      validation: (rule) => rule.required().min(0),
    }),
    defineField({
      name: 'keyPoints',
      title: 'Key points',
      type: 'array',
      group: 'notes',
      of: [defineArrayMember({type: 'string'})],
      description: 'The "In this lesson you will…" list.',
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'array',
      group: 'notes',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
              {title: 'Code', value: 'code'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    title: 'URL',
                    validation: (rule) => rule.uri({scheme: ['http', 'https', 'mailto']}),
                  }),
                ],
              },
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alternative text',
              type: 'string',
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'proTip',
      title: 'Pro tip',
      type: 'text',
      group: 'notes',
      rows: 3,
      description: 'Optional highlighted tip shown on the lesson page.',
    }),
    defineField({
      name: 'resources',
      title: 'Resources',
      type: 'array',
      group: 'notes',
      of: [defineArrayMember({type: 'resource'})],
    }),
  ],
  preview: {
    select: {title: 'title', media: 'poster', duration: 'duration'},
    prepare({title, media, duration}) {
      const secs = typeof duration === 'number' ? duration : 0
      const mm = Math.floor(secs / 60)
      const ss = String(secs % 60).padStart(2, '0')
      return {
        title: title || 'Untitled lesson',
        subtitle: secs ? `${mm}m ${ss}s` : 'No duration set',
        media,
      }
    },
  },
})
