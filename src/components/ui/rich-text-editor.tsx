'use client'

import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { useRef } from 'react'
import type { PartialBlock } from '@blocknote/core'

function parseContent(raw?: string): PartialBlock[] | undefined {
  if (!raw?.trim()) return undefined
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as PartialBlock[]
  } catch {}
  // Plain text → paragraph blocks
  return raw
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => ({
      type: 'paragraph' as const,
      content: [{ type: 'text' as const, text: line, styles: {} }],
    }))
}

interface Props {
  initialContent?: string
  onSave: (json: string) => void
}

export default function RichTextEditor({ initialContent, onSave }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const parsed = parseContent(initialContent)
  const editor = useCreateBlockNote(
    parsed ? { initialContent: parsed } : {}
  )

  return (
    <div className="bn-container rounded-lg border border-border">
      <BlockNoteView
        editor={editor}
        theme="light"

        onChange={() => {
          clearTimeout(timer.current)
          timer.current = setTimeout(() => {
            onSave(JSON.stringify(editor.document))
          }, 600)
        }}
      />
    </div>
  )
}
