import config from '@payload-config'
import { getPayload } from 'payload'

// Единая точка входа в данные для страниц и сценариев (STRUCTURE.md § 1)
export const getPayloadClient = () => getPayload({ config })
