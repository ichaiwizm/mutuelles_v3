import React, { useState } from 'react'
import Tabs from '../components/Tabs'
import PlatformsContent from '../components/config/PlatformsContent'
import ProfileContent from '../components/config/ProfileContent'
import CredentialsContent from '../components/config/CredentialsContent'

export default function Config() {
  const [activeTab, setActiveTab] = useState<'platforms' | 'profile' | 'credentials'>('platforms')

  const tabs = [
    { key: 'platforms', label: 'Plateformes' },
    { key: 'profile', label: 'Profil' },
    { key: 'credentials', label: 'Identifiants' }
  ]

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Configuration</h1>

      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(key) => setActiveTab(key as any)} />

      <div className="pt-4">
        {activeTab === 'platforms' && <PlatformsContent />}
        {activeTab === 'profile' && <ProfileContent />}
        {activeTab === 'credentials' && <CredentialsContent />}
      </div>
    </section>
  )
}
