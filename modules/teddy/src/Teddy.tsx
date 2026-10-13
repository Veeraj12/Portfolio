import React, { forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { TeddyMesh } from "./Teddy3D";
import type { TeddyController, TeddyProps } from "./Teddy.types";

function cx(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * Teddy — the guide character of Veeraj's World (v2: 3D floating
 * companion).
 *
 * This is a thin DOM wrapper: it owns a small `<Canvas>` with sensible
 * default lighting and camera, and renders `<TeddyMesh />` inside it. The
 * full public API from v1 is unchanged — same props, same ref shape, same
 * callback semantics — only the renderer behind it changed.
 *
 * If you're embedding Teddy *inside* an already-existing R3F scene (e.g.
 * the World module's own `<Canvas>`), import `{ TeddyMesh }` directly
 * instead of this component — nesting `<Canvas>` elements creates a second,
 * wasteful WebGL context. See README.md §15 "Adapter expectations".
 */
export const Teddy = forwardRef<TeddyController, TeddyProps>(function Teddy(
  {
    expression,
    action,
    talking,
    scale = 1,
    className,
    style,
    reducedMotion,
    onAnimationStart,
    onAnimationComplete,
    onActionComplete,
    onInteraction,
    id,
    "aria-label": ariaLabel = "Teddy",
    position,
    rotation,
    facing,
    animated = true,
  },
  ref
) {
  return (
    <div
      id={id}
      className={cx(className)}
      style={{ width: 200, height: 200, ...style }}
      role="img"
      aria-label={ariaLabel}
      tabIndex={onInteraction ? 0 : undefined}
      onMouseEnter={(e) => onInteraction?.("hover", e)}
      onClick={(e) => onInteraction?.("click", e)}
      onFocus={(e) => onInteraction?.("focus", e)}
      onTouchStart={(e) => onInteraction?.("touch", e)}
    >
      <Canvas
        camera={{ position: [0, 0.05, 3.7], fov: 32 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.55} color="#FFE8C2" />
        <directionalLight position={[2, 3, 2]} intensity={1.1} color="#FFD9A0" />
        <pointLight position={[-1.5, -0.5, 1.5]} intensity={0.35} color="#FF9F4D" />
        <TeddyMesh
          ref={ref}
          expression={expression}
          action={action}
          talking={talking}
          reducedMotion={reducedMotion}
          onAnimationStart={onAnimationStart}
          onAnimationComplete={onAnimationComplete}
          onActionComplete={onActionComplete}
          position={position}
          rotation={rotation}
          scale={scale}
          facing={facing}
          animated={animated}
        />
      </Canvas>
    </div>
  );
});

Teddy.displayName = "Teddy";

export default Teddy;
