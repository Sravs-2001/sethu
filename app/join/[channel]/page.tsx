import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ channel: string }>
}

export default async function JoinPage({ params }: Props) {
  const { channel } = await params
  redirect(`/dashboard?join=${encodeURIComponent(channel)}`)
}
