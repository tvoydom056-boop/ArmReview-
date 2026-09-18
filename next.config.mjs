import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // не генерировать AGENTS.md / CLAUDE.md в корне проекта
  agentRules: false,
  // Шрифты для OG-картинок читаются с диска (lib/ogFont.ts) — на Vercel их надо явно положить в сборку функции
  outputFileTracingIncludes: { '/**/*': ['./src/assets/fonts/**/*'] },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
