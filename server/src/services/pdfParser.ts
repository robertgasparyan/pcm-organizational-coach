import Anthropic from '@anthropic-ai/sdk'
import { v4 as uuidv4 } from 'uuid'
import type { PCMProfile } from '../types/pcm'

export async function parsePDF(buffer: Buffer, filename: string): Promise<PCMProfile> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const base64 = buffer.toString('base64')

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `Extract the PCM (Process Communication Model) assessment data from this PDF and return it as JSON matching exactly this TypeScript interface:

{
  name: string,
  base: 'thinker' | 'persister' | 'harmonizer' | 'imaginer' | 'rebel' | 'promoter',
  phase: 'thinker' | 'persister' | 'harmonizer' | 'imaginer' | 'rebel' | 'promoter',
  floors: Array<{
    type: 'thinker' | 'persister' | 'harmonizer' | 'imaginer' | 'rebel' | 'promoter',
    percentage: number,
    isBase: boolean,
    isPhase: boolean,
    traits: string[]
  }>,
  phaseStress: { degree1: string, degree2: string, degree3: string, failurePattern: string },
  baseStress: { degree1: string, degree2: string, degree3: string, failurePattern: string },
  perceptionFilters: { opinions: number, reactions: number, imagination: number, actions: number, sensations: number, thoughts: number },
  interactionStyles: { democratic: number, benevolent: number, autocratic: number, free: number },
  personalityParts: { computer: number, comforter: number, director: number, emoter: number },
  communicationChannels: { requestive: number, nurturative: number, directive: number, emotive: number },
  preferredEnvironment: { inGroup: number, aloneOrPairs: number, variousGroups: number, alone: number },
  psychologicalNeeds: Array<{ rank: number, label: string, percentage: number }>
}

Type mapping (Russian → English):
- Логик = thinker
- Упорный = persister
- Душевный = harmonizer
- Мечтатель = imaginer
- Бунтарь = rebel
- Деятель = promoter

- База = base
- Фаза = phase

Perception filter mapping:
- Мнения (Opinions) → persister → opinions
- Реакции (Reactions) → rebel → reactions
- Воображение (Imagination) → imaginer → imagination
- Действия (Actions) → promoter → actions
- Ощущения (Sensations) → harmonizer → sensations
- Мысли (Thoughts) → thinker → thoughts

Interaction styles mapping:
- Демократический → democratic
- Доброжелательный → benevolent
- Автократический → autocratic
- Свободный → free

Personality parts:
- Компьютер → computer
- Комфортер → comforter
- Директор → director
- Эмотер → emoter

Communication channels:
- Вопросительный → requestive
- Заботливый → nurturative
- Директивный → directive
- Эмоциональный → emotive

Preferred environment:
- В группе → inGroup
- В одиночку или вдвоём → aloneOrPairs
- Различные группы → variousGroups
- В одиночку → alone

Stress sequences: translate the Russian text to English.
Floors should be ordered from lowest percentage (top of building) to highest (base, bottom).
Translate trait descriptions to English.

Return ONLY valid JSON, no markdown fences, no explanation.`,
          },
        ],
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const parsed = JSON.parse(text)

  const now = new Date().toISOString()
  return {
    id: uuidv4(),
    ...parsed,
    createdAt: now,
    updatedAt: now,
    rawPdfName: filename,
  } as PCMProfile
}
