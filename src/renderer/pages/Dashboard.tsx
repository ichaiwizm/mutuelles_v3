import React from 'react'

export default function Dashboard() {
  const [stats, setStats] = React.useState<{ platforms:number; profiles:number; credentials:number } | null>(null)
  React.useEffect(() => {
    const load = async () => {
      try {
        if (typeof window.api.getStats === 'function') {
          setStats(await window.api.getStats())
        } else {
          const platforms = await window.api.platforms.list()
          setStats({ platforms: platforms.length, profiles: 0, credentials: 0 })
        }
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-3 gap-3">
        <Card title="Plateformes configurées" value={String(stats?.platforms ?? '—')} />
        <Card title="Profils Chrome" value={String(stats?.profiles ?? '—')} />
        <Card title="Identifiants enregistrés" value={String(stats?.credentials ?? '—')} />
      </div>
    </section>
  )
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3">
      <div className="text-sm text-neutral-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}
