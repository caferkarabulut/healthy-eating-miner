"""
Rate Limiter Service for AI Endpoints
Kullanıcı bazlı rate limiting - limit aşımında açıklayıcı mesaj döner.
"""

from datetime import datetime, timedelta
from typing import Dict, Tuple
from collections import defaultdict
import threading

from app.core.config import settings


class RateLimiter:
    """Thread-safe in-memory rate limiter"""
    
    def __init__(self):
        # {user_id: [(timestamp, ...], ...]}
        self._requests: Dict[int, list] = defaultdict(list)
        self._lock = threading.Lock()
    
    def _cleanup_old_requests(self, user_id: int, window_seconds: int):
        """Eski requestleri temizle"""
        cutoff = datetime.now() - timedelta(seconds=window_seconds)
        self._requests[user_id] = [
            ts for ts in self._requests[user_id] 
            if ts > cutoff
        ]
    
    def check_rate_limit(self, user_id: int) -> Tuple[bool, str]:
        """
        Rate limit kontrolü yap.
        
        Returns:
            (is_allowed, message): True ise izin var, False ise mesaj açıklayıcı
        """
        with self._lock:
            now = datetime.now()
            
            # 1 dakikalık pencere kontrolü
            self._cleanup_old_requests(user_id, 60)
            minute_count = len(self._requests[user_id])
            
            if minute_count >= settings.AI_RATE_LIMIT_PER_MINUTE:
                return False, f"AI servisi dakika limiti aşıldı ({settings.AI_RATE_LIMIT_PER_MINUTE}/dk). Lütfen bir dakika bekleyin."
            
            # 1 saatlik pencere kontrolü
            self._cleanup_old_requests(user_id, 3600)
            hour_count = len(self._requests[user_id])
            
            if hour_count >= settings.AI_RATE_LIMIT_PER_HOUR:
                return False, f"AI servisi saat limiti aşıldı ({settings.AI_RATE_LIMIT_PER_HOUR}/saat). Lütfen biraz bekleyin."
            
            # Request'i kaydet
            self._requests[user_id].append(now)
            
            return True, ""
    
    def get_remaining(self, user_id: int) -> dict:
        """Kalan limit bilgisini döndür"""
        with self._lock:
            self._cleanup_old_requests(user_id, 3600)
            hour_count = len(self._requests[user_id])
            
            self._cleanup_old_requests(user_id, 60)
            minute_count = len(self._requests[user_id])
            
            return {
                "remaining_per_minute": max(0, settings.AI_RATE_LIMIT_PER_MINUTE - minute_count),
                "remaining_per_hour": max(0, settings.AI_RATE_LIMIT_PER_HOUR - hour_count),
                "limit_per_minute": settings.AI_RATE_LIMIT_PER_MINUTE,
                "limit_per_hour": settings.AI_RATE_LIMIT_PER_HOUR
            }


# Singleton instance
ai_rate_limiter = RateLimiter()
