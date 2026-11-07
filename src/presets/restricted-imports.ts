// `no-restricted-imports` options replace each other across presets instead of merging,
// so presets that add patterns must repeat the ones from lower layers.
export const distImports = {
  // Some packages document CSS imports from `dist/`, e.g. `@xyflow/react/dist/style.css`.
  group: ["**/dist", "**/dist/**", "!**/dist/**/*.css"],
  message:
    "Import from the package's public entry point (`pkg` or a documented subpath like `pkg/feature`) instead of its `dist/` folder. Files under `dist/` are build output and can move in any release.",
};
