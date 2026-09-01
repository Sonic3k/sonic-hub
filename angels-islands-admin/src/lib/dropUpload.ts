// Read files (incl. whole folder trees) from a drag-drop DataTransfer.

export interface DroppedFile {
  file: File
  /** e.g. "MyTrip/day-1/img.jpg" for folder drops, "img.jpg" for loose files */
  relativePath: string
}

const isMedia = (f: File) => f.type.startsWith('image/') || f.type.startsWith('video/')

/** Chrome returns readEntries in batches of ≤100 — loop until empty. */
async function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = []
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej))
    if (!batch.length) break
    all.push(...batch)
  }
  return all
}

function entryFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((res, rej) => entry.file(res, rej))
}

async function walkEntry(entry: FileSystemEntry, path: string, out: DroppedFile[]): Promise<void> {
  if (entry.isFile) {
    const file = await entryFile(entry as FileSystemFileEntry)
    if (isMedia(file)) out.push({ file, relativePath: path + file.name })
  } else if (entry.isDirectory) {
    const entries = await readAllEntries((entry as FileSystemDirectoryEntry).createReader())
    for (const child of entries) await walkEntry(child, path + entry.name + '/', out)
  }
}

/** Collect all media files from a drop, preserving folder structure when present. */
export async function collectDroppedFiles(dt: DataTransfer): Promise<DroppedFile[]> {
  const out: DroppedFile[] = []
  const items = Array.from(dt.items || [])
  const entries = items
    .map(i => (typeof i.webkitGetAsEntry === 'function' ? i.webkitGetAsEntry() : null))
    .filter((e): e is FileSystemEntry => !!e)

  if (entries.length) {
    // Snapshot entries first — DataTransfer becomes invalid after the first await
    for (const entry of entries) await walkEntry(entry, '', out)
  } else {
    for (const f of Array.from(dt.files || [])) {
      if (isMedia(f)) out.push({ file: f, relativePath: f.name })
    }
  }
  return out
}

export interface FolderGroup {
  rootName: string
  /** deepest inner folder paths relative to root, e.g. ["day-1", "day-1/morning"] */
  innerFolders: string[]
  /** files with their inner folder ("" = directly under root) */
  files: { file: File; folder: string }[]
}

export interface GroupedDrop {
  folders: FolderGroup[]
  loose: File[]
}

/** Split a drop into folder trees and loose files. */
export function groupDropped(dropped: DroppedFile[]): GroupedDrop {
  const folderMap = new Map<string, FolderGroup>()
  const loose: File[] = []

  for (const d of dropped) {
    const parts = d.relativePath.split('/')
    if (parts.length === 1) {
      loose.push(d.file)
      continue
    }
    const rootName = parts[0]
    const folder = parts.slice(1, -1).join('/')
    let g = folderMap.get(rootName)
    if (!g) {
      g = { rootName, innerFolders: [], files: [] }
      folderMap.set(rootName, g)
    }
    if (folder && !g.innerFolders.includes(folder)) g.innerFolders.push(folder)
    g.files.push({ file: d.file, folder })
  }
  return { folders: [...folderMap.values()], loose }
}
