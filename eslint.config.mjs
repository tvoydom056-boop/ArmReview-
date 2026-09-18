import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ['.next/', 'payload-types.ts', 'src/app/(payload)/', 'src/migrations/'],
  },
]

export default eslintConfig
