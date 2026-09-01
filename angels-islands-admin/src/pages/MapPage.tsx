import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { MapPin } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import api from '../api/client'
import { Lightbox, fmtDate } from '../components/media'
import CollectionPicker from '../components/CollectionPicker'
import { mediaApi } from '../api/collections'
import type { MediaFileResponse } from '../types'

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useMemo(() => {
    if (points.length === 0) return
    if (points.length === 1) map.setView(points[0], 13)
    else map.fitBounds(points, { padding: [40, 40] })
  }, [points, map])
  return null
}

export default function MapPage() {
  const [selectedMedia, setSelectedMedia] = useState<MediaFileResponse | null>(null)
  const [picker, setPicker] = useState<string[] | null>(null)
  const qc = useQueryClient()

  const { data: items = [], isLoading } = useQuery<MediaFileResponse[]>({
    queryKey: ['media', 'geotagged'],
    queryFn: () => api.get<MediaFileResponse[]>('/api/media-files/geotagged', { params: { inclDetails: true, inclPersons: true } }).then(r => r.data),
  })

  const points = useMemo(() =>
    items.map(m => [m.latitude!, m.longitude!] as [number, number]), [items])

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['media', 'geotagged'] }); qc.invalidateQueries({ queryKey: ['library'] }) }

  const handleAddTo = async (targetId: string) => {
    if (!picker) return
    await mediaApi.addToCollectionBatch(targetId, picker)
    setPicker(null)
  }

  return (
    <div className="p-3 md:p-6 lg:p-8 flex flex-col h-[calc(100dvh-56px)] md:h-dvh">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-lg md:text-xl font-semibold text-slate-800">Map</h1>
        <span className="text-[11px] text-slate-400">{items.length} geotagged</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <MapPin size={36} className="mx-auto text-slate-200 mb-2" strokeWidth={1} />
          <p className="text-sm text-slate-400">No geotagged photos yet</p>
        </div>
      ) : (
        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 min-h-[300px]">
          <MapContainer center={[16.0, 106.0]} zoom={6} className="w-full h-full" scrollWheelZoom>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
            <FitBounds points={points} />
            {items.map(m => (
              <CircleMarker key={m.id} center={[m.latitude!, m.longitude!]}
                radius={7} pathOptions={{ color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.75, weight: 1.5 }}>
                <Popup>
                  <div className="w-40">
                    {(m.thumbnailUrl || m.cdnUrl) && (
                      <img src={m.thumbnailUrl || m.cdnUrl} alt={m.fileName}
                        onClick={() => setSelectedMedia(m)}
                        className="w-full h-28 object-cover rounded-lg cursor-pointer mb-1.5" />
                    )}
                    <p className="text-[11px] text-slate-600 leading-snug">{fmtDate(m.dateTaken || m.effectiveDate)}</p>
                    {m.displayedAddress && <p className="text-[10px] text-slate-400 leading-snug mt-0.5">{m.displayedAddress}</p>}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      {picker && (
        <CollectionPicker title="Add to..." confirmLabel="Add"
          onSelect={handleAddTo} onClose={() => setPicker(null)} />
      )}

      {selectedMedia && (
        <Lightbox media={selectedMedia} allMedia={items} collectionId={null}
          onClose={() => setSelectedMedia(null)}
          onNavigate={m => setSelectedMedia(m)}
          onChanged={m => { setSelectedMedia(m); invalidate() }}
          onAddTo={id => setPicker([id])} />
      )}
    </div>
  )
}
