import { useSyncExternalStore } from 'react';
import { sync } from './sync';

export function useSync() {
  return useSyncExternalStore(sync.subscribe, sync.getInfo);
}
