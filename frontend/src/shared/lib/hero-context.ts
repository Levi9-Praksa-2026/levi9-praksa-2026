'use client'
import { createContext, useContext } from 'react'
import type { EnterPhase } from '@/shared/hooks/useHeroEnter'

export interface HeroState {
  phase: EnterPhase
  titleId: string
}

export const HeroContext = createContext<HeroState>({ phase: 'still', titleId: 'hero-h' })

/** The entrance phase and the h1's id, for parts inside a hero. */
export function useHero(): HeroState {
  return useContext(HeroContext)
}
