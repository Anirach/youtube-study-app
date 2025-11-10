const NodeCache = require('node-cache');

// Create cache instance with default TTL of 10 minutes
const cache = new NodeCache({ 
  stdTTL: 600,
  checkperiod: 120,
  useClones: false
});

/**
 * Cache middleware factory
 * @param {number} duration - Cache duration in seconds
 * @returns {Function} Express middleware
 */
function cacheMiddleware(duration = 600) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.originalUrl || req.url}`;
    const cached = cache.get(key);

    if (cached) {
      console.log(`[Cache HIT] ${key}`);
      return res.json(cached);
    }

    console.log(`[Cache MISS] ${key}`);

    // Store original json method
    res.originalJson = res.json;

    // Override json method to cache response
    res.json = function(data) {
      cache.set(key, data, duration);
      res.originalJson(data);
    };

    next();
  };
}

/**
 * Invalidate cache by pattern
 * @param {string} pattern - URL pattern to invalidate
 */
function invalidateCache(pattern) {
  const keys = cache.keys();
  const matchedKeys = keys.filter(key => key.includes(pattern));
  
  matchedKeys.forEach(key => {
    cache.del(key);
    console.log(`[Cache INVALIDATE] ${key}`);
  });

  return matchedKeys.length;
}

/**
 * Clear all cache
 */
function clearCache() {
  cache.flushAll();
  console.log('[Cache CLEAR] All cache cleared');
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return cache.getStats();
}

module.exports = {
  cacheMiddleware,
  invalidateCache,
  clearCache,
  getCacheStats,
  cache
};

