export interface Project {
  id: string
  name: string
  color: string
  icon?: string
  statuses: Status[]
  _count?: { tasks: number }
  createdAt: string
  updatedAt: string
}

export interface Status {
  id: string
  name: string
  color: string
  order: number
  isDone: boolean
  projectId: string
}

export interface Task {
  id: string
  title: string
  description?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  deadline?: string
  order: number
  projectId: string
  project?: Project
  statusId: string
  status?: Status
  parentId?: string
  subtasks?: Task[]
  labels?: { label: Label }[]
  tags?: { tag: Tag }[]
  attachments?: Attachment[]
  comments?: Comment[]
  timeLogs?: TimeLog[]
  estimatedPomodoros?: number
  _count?: { subtasks: number; attachments: number }
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface Tag {
  id: string
  name: string
  color: string
  projectId: string
}

export interface Attachment {
  id: string
  filename: string
  size: number
  mimeType: string
  url: string
  taskId: string
  createdAt: string
}

export interface Comment {
  id: string
  content: string
  taskId: string
  createdAt: string
  updatedAt: string
}

export interface TimeLog {
  id: string
  startTime: string
  endTime?: string
  duration?: number
  taskId: string
  task?: { id: string; title: string; projectId: string }
}
