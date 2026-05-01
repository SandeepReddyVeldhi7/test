'use client';

import { UiProvider } from './context/UiContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <UiProvider>{children}</UiProvider>;
}
