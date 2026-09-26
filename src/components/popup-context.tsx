'use client';
import { createContext, useContext } from 'react';

export const PopupCloseContext = createContext<(() => void) | null>(null);

export function usePopupClose() {
  return useContext(PopupCloseContext);
}
