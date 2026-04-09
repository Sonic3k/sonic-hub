import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import type { MediaFileResponse } from '../types'

export default function MediaPage() {
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: () => api.get<MediaFileResponse[]>('/api/media-files').then(r => r.data),
  })

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-lg font-semibold text-slate-800 mb-6">Media Files</h1>
      {isLoading ? <p className="text-sm text-slate-400">Loading...</p> : files.length === 0 ? (
        <p className="text-sm text-slate-400">No media files yet. Upload via API or Admin.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {files.map((f: MediaFileResponse) => (
            <div key={f.id} className="bg-white rounded-lg border border-slate-100 overflow-hidden">
              <div className="aspect-square bg-slate-50 flex items-center justify-center text-xs text-slate-300">
                {f.thumbnailUrl ? <img src={f.thumbnailUrl} alt={f.fileName} className="w-full h-full object-cover" /> : <span>{f.fileType === "VIDEO" ? "🎬" : "🖼️"}</span>}
              </div>
              <div className="p-2">
                <p className="text-xs text-slate-600 truncate">{f.fileName}</p>
                {f.caption && <p className="text-xs text-slate-400 truncate">{f.caption}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
