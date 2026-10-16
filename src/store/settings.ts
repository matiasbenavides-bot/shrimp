import { create } from 'zustand'
import { DEFAULT_SETTINGS, type AppSettings } from '../lib/types'
import { loadSettings, saveSetting } from '../db/repo'

interface SettingsState {
  settings: AppSettings
  ready: boolean
  hydrate: () => Promise<void>
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  ready: false,

  hydrate: async () => {
    const settings = await loadSettings()
    set({ settings, ready: true })
  },

  update: async (key, value) => {
    const next = { ...get().settings, [key]: value } as AppSettings
    set({ settings: next })
    await saveSetting(key, value)
  },
}))
