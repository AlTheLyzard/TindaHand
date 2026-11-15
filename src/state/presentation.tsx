import { createContext, useContext } from 'react';

/** Hosts publish visibility after their entrance, including retained exit trees. */
export const PresentationContext = createContext(true);
export function usePresentationVisible() { return useContext(PresentationContext); }
