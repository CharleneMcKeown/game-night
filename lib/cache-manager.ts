"use client"

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface CollectionCacheData {
  games: any[]
  lastUpdated: number
  username: string
}

class CacheManager {
  private static instance: CacheManager
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 30 * 60 * 1000 // 30 minutes
  private readonly COLLECTION_TTL = 60 * 60 * 1000 // 1 hour for collections

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  private constructor() {
    // Load cache from localStorage on initialization
    this.loadFromStorage()

    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 5 * 60 * 1000) // Cleanup every 5 minutes
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now()
    const expiresAt = now + (ttl || this.DEFAULT_TTL)

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
    })

    // Persist to localStorage for collections
    if (key.startsWith("collection:")) {
      this.saveToStorage(key, { data, timestamp: now, expiresAt })
    }
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      // Try to load from localStorage
      const stored = this.loadFromStorage(key)
      if (stored) {
        this.cache.set(key, stored)
        return stored.data as T
      }
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.removeFromStorage(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): void {
    this.cache.delete(key)
    this.removeFromStorage(key)
  }

  clear(): void {
    this.cache.clear()
    if (typeof window !== "undefined") {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("bgg-cache:")) {
          localStorage.removeItem(key)
        }
      })
    }
  }

  getCollectionAge(username: string): number | null {
    const entry = this.cache.get(`collection:${username}`)
    if (!entry) return null
    return Date.now() - entry.timestamp
  }

  isCollectionStale(username: string, maxAge: number = this.COLLECTION_TTL): boolean {
    const age = this.getCollectionAge(username)
    return age === null || age > maxAge
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach((key) => {
      this.cache.delete(key)
      this.removeFromStorage(key)
    })
  }

  private saveToStorage(key: string, entry: CacheEntry<any>): void {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(`bgg-cache:${key}`, JSON.stringify(entry))
    } catch (error) {
      console.warn("Failed to save to localStorage:", error)
    }
  }

  private loadFromStorage(key?: string): CacheEntry<any> | null {
    if (typeof window === "undefined") return null

    try {
      if (key) {
        const stored = localStorage.getItem(`bgg-cache:${key}`)
        if (stored) {
          const entry = JSON.parse(stored)
          if (Date.now() <= entry.expiresAt) {
            return entry
          } else {
            localStorage.removeItem(`bgg-cache:${key}`)
          }
        }
        return null
      }

      // Load all cache entries
      Object.keys(localStorage).forEach((storageKey) => {
        if (storageKey.startsWith("bgg-cache:")) {
          const cacheKey = storageKey.replace("bgg-cache:", "")
          const stored = localStorage.getItem(storageKey)
          if (stored) {
            try {
              const entry = JSON.parse(stored)
              if (Date.now() <= entry.expiresAt) {
                this.cache.set(cacheKey, entry)
              } else {
                localStorage.removeItem(storageKey)
              }
            } catch (error) {
              localStorage.removeItem(storageKey)
            }
          }
        }
      })
    } catch (error) {
      console.warn("Failed to load from localStorage:", error)
    }

    return null
  }

  private removeFromStorage(key: string): void {
    if (typeof window === "undefined") return

    try {
      localStorage.removeItem(`bgg-cache:${key}`)
    } catch (error) {
      console.warn("Failed to remove from localStorage:", error)
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    let totalEntries = 0
    let expiredEntries = 0
    let collectionEntries = 0

    this.cache.forEach((entry, key) => {
      totalEntries++
      if (now > entry.expiresAt) expiredEntries++
      if (key.startsWith("collection:")) collectionEntries++
    })

    return {
      totalEntries,
      expiredEntries,
      collectionEntries,
      hitRate: this.cache.size > 0 ? (((this.cache.size - expiredEntries) / this.cache.size) * 100).toFixed(1) : "0",
    }
  }
}

export const cacheManager = CacheManager.getInstance()
