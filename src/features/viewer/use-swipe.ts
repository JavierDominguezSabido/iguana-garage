import { useRef } from "react";
import type { PointerEvent } from "react";
import { swipeDirection } from "./swipe";

// Deslizar con el dedo cambia de foto en los dos visores. El ratón no desliza; con touch-action: pan-y en el
// escenario, el scroll vertical y los toques nunca lo disparan (la lógica de umbrales está en swipe.ts).
export function useSwipe(onSwipe: (direction: 1 | -1) => void, enabled: boolean) {
  const start = useRef<{ pointer: number; x: number; y: number } | null>(null);
  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!enabled || event.pointerType === "mouse") return;
      start.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const origin = start.current; start.current = null;
      if (!origin || origin.pointer !== event.pointerId) return;
      const direction = swipeDirection(event.clientX - origin.x, event.clientY - origin.y);
      if (direction) onSwipe(direction);
    },
    onPointerCancel() { start.current = null; },
  };
}
