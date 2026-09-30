"use client";

import { useCallback, useRef, useState } from "react";

const LIMIT = 60;

/**
 * Undo/redo with explicit checkpoints. Call `checkpoint()` once when a gesture starts (drag, stroke, pinch)
 * and `update()` as it progresses, so a whole gesture is a single undo step. `commit()` = checkpoint + update.
 */
export function useHistory<T>(initial: T) {
  const [present, setPresent] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const presentRef = useRef(present);
  // Stack sizes mirrored into state so render never reads refs.
  const [depth, setDepth] = useState({ past: 0, future: 0 });
  const sync = () => setDepth({ past: past.current.length, future: future.current.length });

  const update = useCallback((next: T | ((prev: T) => T)) => {
    setPresent((prev) => {
      const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      presentRef.current = value;
      return value;
    });
  }, []);

  const checkpoint = useCallback(() => {
    past.current = [...past.current.slice(-(LIMIT - 1)), presentRef.current];
    future.current = [];
    sync();
  }, []);

  const commit = useCallback((next: T | ((prev: T) => T)) => {
    checkpoint();
    update(next);
  }, [checkpoint, update]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current = [presentRef.current, ...future.current];
    presentRef.current = prev;
    setPresent(prev);
    sync();
  }, []);

  const redo = useCallback(() => {
    const [next, ...rest] = future.current;
    if (next === undefined) return;
    past.current = [...past.current, presentRef.current];
    future.current = rest;
    presentRef.current = next;
    setPresent(next);
    sync();
  }, []);

  const reset = useCallback((value: T) => {
    past.current = [];
    future.current = [];
    presentRef.current = value;
    setPresent(value);
    sync();
  }, []);

  return { state: present, update, checkpoint, commit, undo, redo, reset, canUndo: depth.past > 0, canRedo: depth.future > 0 };
}
