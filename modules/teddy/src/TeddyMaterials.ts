import * as THREE from "three";

/**
 * A convincing-but-cheap approximation of "matte physical object with a
 * warm light gently coming from inside", per the module spec §4-5. Real
 * subsurface scattering (THREE.MeshPhysicalMaterial transmission +
 * thickness) is a real render-pass cost — noticeable next to a full 3D
 * world — so instead this uses a moderate-roughness clearcoat material
 * with a *low, warm emissive* that reads as inner light without the
 * transmission pass. If the host world already renders bloom, this
 * emissive will pick it up "for free" (documented in README §Performance).
 */
export function createBodyMaterial(glow: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#E8A33D"),
    roughness: 0.55,
    metalness: 0,
    clearcoat: 0.18,
    clearcoatRoughness: 0.45,
    emissive: new THREE.Color("#FF8A46"),
    emissiveIntensity: 0.12 + glow * 0.38,
  });
}

export function createEyeMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#241812"),
    roughness: 0.25,
    metalness: 0.05,
  });
}

export function createEyeHighlightMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFF4E0") });
}

export function createMouthMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color("#4A2412"),
    roughness: 0.6,
    metalness: 0,
  });
}

export function createTearMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#9FDCF7"),
    roughness: 0.15,
    metalness: 0,
    transparent: true,
    opacity: 0.85,
  });
}

export function createAppendageMaterial(glow: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#E39B3A"),
    roughness: 0.6,
    metalness: 0,
    emissive: new THREE.Color("#FF8A46"),
    emissiveIntensity: 0.08 + glow * 0.2,
  });
}
