/**
 * CVCVC Word Trie
 *
 * Loads available CVCVC words from combo CSV files into a trie
 * for fast lookup and guided walking.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// ─── Types ──────────────────────────────────────────────

export type TrieNode = {
  children: Map<string, TrieNode>
  isWord: boolean
  tier: number
}

// ─── Trie Operations ────────────────────────────────────

export function createTrie(): TrieNode {
  return { children: new Map(), isWord: false, tier: 0 }
}

export function insertWord(root: TrieNode, word: string, tier: number) {
  let node = root
  for (const ch of word) {
    if (!node.children.has(ch)) {
      node.children.set(ch, createTrie())
    }
    node = node.children.get(ch)!
  }
  node.isWord = true
  node.tier = tier
}

export function hasWord(root: TrieNode, word: string): boolean {
  let node = root
  for (const ch of word) {
    const child = node.children.get(ch)
    if (!child) return false
    node = child
  }
  return node.isWord
}

export function getTier(root: TrieNode, word: string): number {
  let node = root
  for (const ch of word) {
    const child = node.children.get(ch)
    if (!child) return 0
    node = child
  }
  return node.isWord ? node.tier : 0
}

// ─── Load Combo Files ───────────────────────────────────

export function loadComboTrie(dataDir: string): {
  trie: TrieNode
  count: number
} {
  const trie = createTrie()
  let count = 0

  for (let tier = 1; tier <= 4; tier++) {
    const path = resolve(dataDir, `combo-${tier}/5.csv`)
    try {
      const lines = readFileSync(path, 'utf-8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length === 5)

      for (const word of lines) {
        if (!hasWord(trie, word)) {
          insertWord(trie, word, tier)
          count++
        }
      }
    } catch {
      /** File might not exist. */
    }
  }

  return { trie, count }
}
