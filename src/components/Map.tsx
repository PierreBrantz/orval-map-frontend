// TypeScript ne résout pas automatiquement les suffixes React Native.
// Metro choisit Map.native.tsx ou Map.web.tsx au moment du bundle.
export { default } from "./Map.native";
export type { MapProps } from "./Map.native";
