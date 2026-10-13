/**
 * Named spatial anchor registry.
 *
 * Anchors are plain Object3D refs positioned inside the world. Other
 * modules (bricks, board, portal) are not imported here — they simply need
 * to know where WELCOME_ANCHOR, TEDDY_ANCHOR, DESTINATION_AREA and
 * PORTAL_ANCHOR live in world space. This module only promises the
 * anchors exist and stay stable; it never hardcodes what gets placed
 * there beyond WELCOME/Teddy.
 */

import {
  createContext,
  createElement,
  useContext,
  useRef,
  useCallback,
  type ReactNode,
  type RefObject,
} from "react";
import type { Object3D } from "three";
import type { AnchorId, AnchorRegistry } from "./types";

interface AnchorContextValue {
  registry: RefObject<AnchorRegistry>;
  register: (id: AnchorId, obj: Object3D | null) => void;
  get: (id: AnchorId) => Object3D | null;
}

const AnchorContext = createContext<AnchorContextValue | null>(null);

export function AnchorProvider({ children }: { children: ReactNode }) {
  const registry = useRef<AnchorRegistry>({});

  const register = useCallback((id: AnchorId, obj: Object3D | null) => {
    registry.current[id] = obj;
  }, []);

  const get = useCallback((id: AnchorId) => registry.current[id] ?? null, []);

  return createElement(
    AnchorContext.Provider,
    { value: { registry, register, get } },
    children,
  );
}

function useAnchorContext(): AnchorContextValue {
  const ctx = useContext(AnchorContext);
  if (!ctx) {
    throw new Error(
      "Anchor hooks must be used within <AnchorProvider> (rendered by <World />).",
    );
  }
  return ctx;
}

/**
 * Attach to a Three.js object's `ref` prop to register it under `id`.
 *
 *   <group ref={useAnchorRef("WELCOME_ANCHOR")} />
 */
export function useAnchorRef(id: AnchorId) {
  const { register } = useAnchorContext();
  return useCallback(
    (obj: Object3D | null) => register(id, obj),
    [register, id],
  );
}

/** Read an anchor's live Object3D (or null if not yet mounted). */
export function useAnchor(id: AnchorId): Object3D | null {
  const { get } = useAnchorContext();
  return get(id);
}

export function useAnchorGetter() {
  const { get } = useAnchorContext();
  return get;
}
