// Ambient module declarations for static image imports (e.g. `import logo from "./logo.png"`).
// The admin (bluebellschool) project gets these for free via tsconfig.json -> next-env.d.ts ->
// next/image-types/global, but this project is configured with jsconfig.json only, so
// TypeScript has no idea how to type `.png`/`.jpg` imports without this file.
declare module "*.png" {
  const src: string;
  export default src;
}

declare module "*.jpg" {
  const src: string;
  export default src;
}

declare module "*.jpeg" {
  const src: string;
  export default src;
}

declare module "*.gif" {
  const src: string;
  export default src;
}

declare module "*.svg" {
  const src: string;
  export default src;
}

declare module "*.webp" {
  const src: string;
  export default src;
}

declare module "*.avif" {
  const src: string;
  export default src;
}
