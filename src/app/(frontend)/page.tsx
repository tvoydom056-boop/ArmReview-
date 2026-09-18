import { redirect } from 'next/navigation'

// Срез 1 заменит это страницей последнего турнира
export default function HomePage() {
  redirect('/athletes')
}
