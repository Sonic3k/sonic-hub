import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button, Input, Modal } from '../components/ui'
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../hooks/useTags'
import type { Tag, TagRequest } from '../types'

const PRESET_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

function TagForm({
  tag,
  onSubmit,
  onClose,
  isLoading,
}: {
  tag?: Tag
  onSubmit: (data: TagRequest) => void
  onClose: () => void
  isLoading?: boolean
}) {
  const [name, setName] = useState(tag?.name ?? '')
  const [color, setColor] = useState(tag?.color ?? PRESET_COLORS[0])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({ name: name.trim(), color })
  }

  return (
    <Modal title={tag ? 'Edit Tag' : 'New Tag'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tag name..."
          autoFocus
          required
        />

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600">Color</label>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c,
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-slate-200"
            />
            <span className="text-xs font-mono text-slate-500">{color}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading ? 'Saving...' : tag ? 'Save Changes' : 'Create Tag'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function TagsPage() {
  const { data: tags = [], isLoading } = useTags()
  const createTag = useCreateTag()
  const deleteTag = useDeleteTag()

  const [showCreate, setShowCreate] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)

  const updateTag = useUpdateTag(editingTag?.id ?? '')

  const handleCreate = (data: TagRequest) => {
    createTag.mutate(data, { onSuccess: () => setShowCreate(false) })
  }

  const handleUpdate = (data: TagRequest) => {
    if (!editingTag) return
    updateTag.mutate(data, { onSuccess: () => setEditingTag(null) })
  }

  const handleDelete = (tag: Tag) => {
    if (confirm(`Delete tag "${tag.name}"?`)) deleteTag.mutate(tag.id)
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Tags</h1>
          <p className="text-sm text-slate-400 mt-0.5">{tags.length} tag{tags.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={14} />
          New Tag
        </Button>
      </div>

      {/* Tag list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-white rounded-lg border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">No tags yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-2 text-indigo-500 text-sm hover:underline"
          >
            Create your first tag
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="group flex items-center justify-between bg-white rounded-lg border border-slate-100 hover:border-slate-200 px-4 py-3 transition-all"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: tag.color || '#94a3b8' }}
                />
                <span className="text-sm font-medium text-slate-700">{tag.name}</span>
                <span className="text-xs font-mono text-slate-300">{tag.color}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="sm" onClick={() => setEditingTag(tag)}>
                  <Pencil size={12} />
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(tag)}>
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <TagForm
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          isLoading={createTag.isPending}
        />
      )}
      {editingTag && (
        <TagForm
          tag={editingTag}
          onSubmit={handleUpdate}
          onClose={() => setEditingTag(null)}
          isLoading={updateTag.isPending}
        />
      )}
    </div>
  )
}
