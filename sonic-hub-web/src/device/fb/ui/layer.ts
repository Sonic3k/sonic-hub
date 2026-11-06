/* Where the photo viewer opens: over the window the site is shown in (inside a machine), else over the page. */
import { createContext } from 'react';

export const LayerHost = createContext<HTMLElement | null>(null);
