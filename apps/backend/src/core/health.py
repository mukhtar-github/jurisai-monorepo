"""
Enhanced health check module for blue-green deployments
Provides comprehensive health checks for Railway blue-green strategy
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone

try:
    import psycopg2
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

try:
    from fastapi import HTTPException
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

try:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import AsyncSession
    from .database import get_async_session
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False

try:
    from .config import settings
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False
    # Default settings
    class DefaultSettings:
        ENVIRONMENT_COLOR = "unknown"
        REDIS_URL = "redis://localhost:6379"
        EMBEDDINGS_MODEL_NAME = "unknown"
    settings = DefaultSettings()

logger = logging.getLogger(__name__)

class HealthChecker:
    """Enhanced health checker for blue-green deployments"""
    
    def __init__(self):
        self.start_time = time.time()
        self.environment_color = settings.ENVIRONMENT_COLOR or "unknown"
        
    async def check_database_health(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        if not SQLALCHEMY_AVAILABLE:
            return {
                "status": "unavailable",
                "error": "SQLAlchemy module not available",
                "response_time_ms": None
            }
            
        try:
            start_time = time.time()
            
            async with get_async_session() as session:
                # Simple connectivity check
                result = await session.execute(text("SELECT 1"))
                result.fetchone()
                
                # Check if we can access main tables
                tables_check = await session.execute(
                    text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
                )
                table_count = len(tables_check.fetchall())
                
            response_time = time.time() - start_time
            
            return {
                "status": "healthy",
                "response_time_ms": round(response_time * 1000, 2),
                "table_count": table_count,
                "connection_pool": "active"
            }
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time_ms": None
            }
    
    async def check_redis_health(self) -> Dict[str, Any]:
        """Check Redis connectivity and performance"""
        if not REDIS_AVAILABLE:
            return {
                "status": "unavailable",
                "error": "Redis module not installed",
                "response_time_ms": None
            }
            
        try:
            start_time = time.time()
            
            r = redis.from_url(settings.REDIS_URL)
            
            # Ping test
            ping_result = r.ping()
            
            # Set/Get test
            test_key = f"health_check_{int(time.time())}"
            r.set(test_key, "test_value", ex=60)
            retrieved_value = r.get(test_key)
            r.delete(test_key)
            
            response_time = time.time() - start_time
            
            return {
                "status": "healthy",
                "response_time_ms": round(response_time * 1000, 2),
                "ping": ping_result,
                "read_write": retrieved_value is not None
            }
            
        except Exception as e:
            logger.error(f"Redis health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time_ms": None
            }
    
    async def check_ai_models_health(self) -> Dict[str, Any]:
        """Check AI models availability and performance"""
        try:
            start_time = time.time()
            
            # Import here to avoid circular imports
            from ..services.ai_service import AIService
            
            ai_service = AIService()
            
            # Test embeddings generation
            test_embeddings = ai_service.get_embeddings(["health check test"])
            
            response_time = time.time() - start_time
            
            return {
                "status": "healthy",
                "response_time_ms": round(response_time * 1000, 2),
                "embeddings_model": settings.EMBEDDINGS_MODEL_NAME,
                "model_loaded": len(test_embeddings) > 0
            }
            
        except Exception as e:
            logger.error(f"AI models health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "response_time_ms": None
            }
    
    async def check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space"""
        try:
            import shutil
            
            # Check disk space in the current directory
            total, used, free = shutil.disk_usage(".")
            
            free_gb = free / (1024**3)
            total_gb = total / (1024**3)
            used_percent = (used / total) * 100
            
            status = "healthy" if free_gb > 1.0 else "warning" if free_gb > 0.5 else "unhealthy"
            
            return {
                "status": status,
                "free_gb": round(free_gb, 2),
                "total_gb": round(total_gb, 2),
                "used_percent": round(used_percent, 2)
            }
            
        except Exception as e:
            logger.error(f"Disk space check failed: {e}")
            return {
                "status": "unknown",
                "error": str(e)
            }
    
    async def check_memory_usage(self) -> Dict[str, Any]:
        """Check memory usage"""
        try:
            import psutil
            
            memory = psutil.virtual_memory()
            
            status = "healthy" if memory.percent < 80 else "warning" if memory.percent < 90 else "unhealthy"
            
            return {
                "status": status,
                "used_percent": round(memory.percent, 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "total_gb": round(memory.total / (1024**3), 2)
            }
            
        except ImportError:
            # psutil not available
            return {
                "status": "unknown",
                "error": "psutil not installed"
            }
        except Exception as e:
            logger.error(f"Memory check failed: {e}")
            return {
                "status": "unknown",
                "error": str(e)
            }
    
    async def get_comprehensive_health(self) -> Dict[str, Any]:
        """Get comprehensive health status for blue-green deployments"""
        uptime = time.time() - self.start_time
        
        # Run all health checks concurrently
        health_checks = await asyncio.gather(
            self.check_database_health(),
            self.check_redis_health(),
            self.check_ai_models_health(),
            self.check_disk_space(),
            self.check_memory_usage(),
            return_exceptions=True
        )
        
        database_health, redis_health, ai_health, disk_health, memory_health = health_checks
        
        # Determine overall status
        all_statuses = [
            database_health.get("status", "unknown"),
            redis_health.get("status", "unknown"),
            ai_health.get("status", "unknown"),
            disk_health.get("status", "unknown"),
            memory_health.get("status", "unknown")
        ]
        
        if "unhealthy" in all_statuses:
            overall_status = "unhealthy"
        elif "warning" in all_statuses:
            overall_status = "warning"
        elif all(status == "healthy" for status in all_statuses):
            overall_status = "healthy"
        else:
            overall_status = "unknown"
        
        return {
            "status": overall_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "uptime_seconds": round(uptime, 2),
            "environment": self.environment_color,
            "version": getattr(settings, 'VERSION', 'unknown'),
            "checks": {
                "database": database_health,
                "redis": redis_health,
                "ai_models": ai_health,
                "disk": disk_health,
                "memory": memory_health
            }
        }
    
    async def get_readiness_status(self) -> Dict[str, Any]:
        """Get readiness status for blue-green traffic routing"""
        health_status = await self.get_comprehensive_health()
        
        # Readiness is more strict than liveness
        is_ready = (
            health_status["status"] in ["healthy", "warning"] and
            health_status["checks"]["database"]["status"] == "healthy" and
            health_status["checks"]["redis"]["status"] == "healthy" and
            health_status["uptime_seconds"] > 30  # Ensure service has been running for at least 30s
        )
        
        return {
            "ready": is_ready,
            "status": health_status["status"],
            "timestamp": health_status["timestamp"],
            "environment": self.environment_color,
            "uptime_seconds": health_status["uptime_seconds"]
        }

# Global health checker instance
health_checker = HealthChecker()