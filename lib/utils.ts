import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
