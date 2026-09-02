import type {SchemaTypeDefinition} from 'sanity'

import {category} from './documents/category'
import {course} from './documents/course'
import {instructor} from './documents/instructor'
import {lesson} from './documents/lesson'
import {video} from './documents/video'
import {learningOutcome} from './objects/learningOutcome'
import {courseModule} from './objects/module'
import {resource} from './objects/resource'

export const schemaTypes: SchemaTypeDefinition[] = [
  // Objects (register before the documents that embed them)
  learningOutcome,
  resource,
  courseModule,

  // Documents
  category,
  instructor,
  lesson,
  course,
  video,
]
