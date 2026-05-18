import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — Pulse` : 'Pulse — Gestão de Ministérios';
    return () => {
      document.title = 'Pulse — Gestão de Ministérios';
    };
  }, [title]);
}
