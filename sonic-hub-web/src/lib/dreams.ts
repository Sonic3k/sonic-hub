/* Dreams as the other pages link to them (the pages themselves are in pages/Dreams). */
export const dreamHref = (d: { id: string }) => `/dreams/${d.id}`;
/** the morning of a dream: "23/11/2026" */
export const dreamDay = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
/** what a list says of a dream: its title, else its opening */
export const dreamName = (d: { title?: string | null; lead?: string | null }) => d.title || d.lead || 'Giấc mơ';
