/** Accent-insensitive matching: "ho tay" finds "Hồ Tây". */
export const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
export const matches = (hay: string | null | undefined, needle: string) => !!hay && fold(hay).includes(fold(needle));
