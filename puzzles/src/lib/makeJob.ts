// The draft being written for this player, kept in this browser so the wait picks up on return (BUILD_PLAN set 6a).
// Only the job's id and the topic: the server holds the rest, and answers the id to its owner only.

import { storage } from './storage';

const KEY = 'gazecraft-make-job';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type MakeJob = { id: string; topic: string };

export function loadMakeJob(): MakeJob | null {
  const v = storage.getJSON<{ id?: unknown; topic?: unknown }>(KEY);
  return v && typeof v.id === 'string' && UUID.test(v.id) && typeof v.topic === 'string' ? { id: v.id, topic: v.topic.slice(0, 60) } : null;
}

export const saveMakeJob = (job: MakeJob): void => void storage.setJSON(KEY, job);
export const clearMakeJob = (): void => storage.remove(KEY);
