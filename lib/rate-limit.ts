interface RateLimitConfig {
  windowMs: number
  max: number
}

const stores = new Map<string, Map<string, number[]>>()

function getStore(name: string): Map<string, number[]> {
  let store = stores.get(name)
  if (!store) {
    store = new Map()
    stores.set(name, store)
  }
  return store
}

export function rateLimit(name: string, config: RateLimitConfig) {
  const store = getStore(name)

  return {
    check(key: string): { success: boolean; remaining: number } {
      const now = Date.now()
      const windowStart = now - config.windowMs

      let timestamps = store.get(key)
      if (!timestamps) {
        timestamps = []
        store.set(key, timestamps)
      }

      // Remove expired timestamps
      const valid = timestamps.filter(t => t > windowStart)
      store.set(key, valid)

      const remaining = Math.max(0, config.max - valid.length)

      if (valid.length >= config.max) {
        return { success: false, remaining }
      }

      valid.push(now)
      return { success: true, remaining }
    },
    reset(key: string) {
      store.delete(key)
    },
  }
}
