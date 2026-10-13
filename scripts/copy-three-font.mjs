// Self-hosts the WELCOME / HELLO 3D typeface instead of loading it from a
// third-party CDN at runtime (see World module README, "Fonts"). Runs from
// package.json's postinstall so /public/fonts/helvetiker_bold.typeface.json
// always exists locally after `npm install`.
import { copyFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const src = path.join(root, "node_modules", "three", "examples", "fonts", "helvetiker_bold.typeface.json");
const destDir = path.join(root, "public", "fonts");
const dest = path.join(destDir, "helvetiker_bold.typeface.json");

async function main() {
  try {
    await access(src);
  } catch {
    console.warn(
      "[copy-three-font] three's bundled font was not found at:\n  " +
        src +
        "\nWorld will fall back to loading it from the threejs.org CDN at runtime. Run `npm install` if this is unexpected."
    );
    return;
  }
  await mkdir(destDir, { recursive: true });
  await copyFile(src, dest);
  console.log("[copy-three-font] copied helvetiker_bold.typeface.json -> public/fonts/");
}

main();
