// Central place for environment-dependent URLs.
// Change the values in the .env files (not here) to point at a different backend or site:
//   frontend/.env.local        -> local development (localhost)
//   frontend/.env.development  -> `next dev` defaults
//   frontend/.env.production   -> `next build` / Vercel

const trimSlash = (value: string) => value.replace(/\/$/, "")

/** Laravel API base URL, e.g. http://127.0.0.1:8000 locally or https://aiprocess.trippinweb.com in production. */
export const apiBaseUrl = trimSlash(process.env.NEXT_PUBLIC_LARAVEL_API_URL ?? "http://127.0.0.1:8000")

/** Public URL of this Next.js site, used for auth redirect links in emails. */
export const siteUrl = trimSlash(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
