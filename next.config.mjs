import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // не генерировать AGENTS.md / CLAUDE.md в корне проекта
  agentRules: false,
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
