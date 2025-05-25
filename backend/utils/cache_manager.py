import os
import redis
from functools import lru_cache

class CacheManager:
    def __init__(self):
        redis_url = os.environ.get('REDIS_URL')
        self.redis = None
        if redis_url:
            try:
                self.redis = redis.from_url(redis_url)
            except Exception as e:
                print(f"Redis connection failed: {e}")

    def get(self, key):
        if self.redis:
            return self.redis.get(key)
        return None

    def set(self, key, value, ex=3600):
        if self.redis:
            self.redis.set(key, value, ex=ex)

# LRU fallback for local dev
@lru_cache(maxsize=128)
def lru_get(key):
    return None

def lru_set(key, value):
    pass
