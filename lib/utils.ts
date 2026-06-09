import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { PrizeCondition } from './supabase/types'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function generateCardNumbers(): number[] {
  const pool = Array.from({ length: 75 }, (_, i) => i + 1)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 25)
}

export function checkWinCondition(
  numbers: number[],
  marked: number[],
  condition: string
): boolean {
  const grid = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => marked.includes(numbers[row * 5 + col]))
  )

  if (condition === 'full_card') {
    return grid.flat().every(Boolean)
  }
  if (condition === 'line') {
    return grid.some(row => row.every(Boolean))
  }
  if (condition === 'column') {
    return Array.from({ length: 5 }, (_, col) =>
      grid.every(row => row[col])
    ).some(Boolean)
  }
  if (condition === 'diagonal') {
    const main = grid.every((row, i) => row[i])
    const anti = grid.every((row, i) => row[4 - i])
    return main || anti
  }
  return false
}

// Verifica quais condições de prêmio foram atingidas por uma cartela
// Retorna array com as conditions que foram atingidas e ainda não têm vencedor
export function checkMultipleWinConditions(
  numbers: number[],
  drawnNumbers: number[],
  conditions: PrizeCondition[]
): string[] {
  return conditions
    .filter(c => c.won_at === null && checkWinCondition(numbers, drawnNumbers, c.condition))
    .map(c => c.condition)
}

// Gera código alfanumérico a partir do número sequencial (1-based)
// A1..A10, B1..B10 ... Z1..Z10 = 260 cartelas (bloco 1)
// A11..A20, B11..B20 ... Z11..Z20 = mais 260 (bloco 2)
// Padrão: letra (A-Z) + número (1-10 por bloco, por letra)
export function generateAlphanumericCode(sequenceNumber: number): string {
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' // 26 letras
  const PER_BLOCK = 260 // 26 letras × 10 números
  const PER_LETTER = 10

  const zeroIndexed = sequenceNumber - 1
  const blockIndex = Math.floor(zeroIndexed / PER_BLOCK) // bloco 0 → 1-10, bloco 1 → 11-20
  const posInBlock = zeroIndexed % PER_BLOCK
  const letterIndex = Math.floor(posInBlock / PER_LETTER)
  const numInLetter = (posInBlock % PER_LETTER) + 1 + blockIndex * 10

  return `${LETTERS[letterIndex]}${numInLetter}`
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
