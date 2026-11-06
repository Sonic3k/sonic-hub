/* Photos handed to the viewer: a window's argument stays small (a set name and an index) while the set lives here. */
export interface ViewerPhoto { id: string; url: string; thumb?: string; caption?: string | null; at?: string | null }
const SETS = new Map<string, ViewerPhoto[]>();
export function putSet(name: string, photos: ViewerPhoto[]): ViewerPhoto[] { SETS.set(name, photos); return photos; }
export const getSet = (name: string) => SETS.get(name) ?? [];
