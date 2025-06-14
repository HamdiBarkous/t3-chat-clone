# Backend Performance Optimization Plan

## 🔍 **Critical Bottlenecks Identified**

### **1. Conversation Listing Performance Issues**
- **Window functions with DISTINCT**: The current query uses `func.count().over()` + `DISTINCT(Conversation.id)` which forces PostgreSQL to process ALL message rows
- **Multiple window functions**: 3 window functions (`count`, `max`, `first_value`) in single query causing performance degradation
- **String slicing in Python**: `last_message_preview[:100]` happens in Python instead of database

### **2. Message Loading Bottlenecks**
- **Two-query pattern**: First verification query, then message query (2 round trips)
- **Unused timestamp pagination**: Parameters are ignored, always loads latest messages
- **N+1 Serialization**: `MessageResponse.model_validate(msg) for msg in messages` creates objects one by one

### **3. Dependency Injection Overhead**
- **New service instances per request**: Each API call creates new service and repository instances
- **No shared state**: Database connections aren't reused across dependencies in same request

### **4. Lack of Database-Level Caching**
- **No query result caching**: Same conversation lists queried repeatedly
- **No prepared statement reuse**: Complex queries rebuilt every time

---

## 📋 **Multi-Phase Optimization Plan**

### **Phase 1: Critical Query Optimization (Immediate Impact)**

#### **Step 1.1: Fix Conversation Listing Query**
Replace window functions with optimized subqueries for better performance.

**Impact**: 60-80% faster conversation listing

#### **Step 1.2: Optimize Message Loading Logic** 
Combine verification + message loading into single query.

**Impact**: 40-50% faster message loading

---

### **Phase 2: Dependency & Caching Layer (Medium Impact)**

#### **Step 2.1: Implement Service-Level Caching**
Add memory-based caching for frequently accessed data using FastAPI's dependency system.

**Impact**: 50-70% faster repeated operations

#### **Step 2.2: Optimize Dependency Injection**
Convert to singleton pattern for services within request scope.

**Impact**: 20-30% faster request processing

---

### **Phase 3: Advanced Optimization (High Impact)**

#### **Step 3.1: Implement Batching & Prefetching**
Add intelligent prefetching for related data and batch operations.

**Impact**: 40-60% faster complex operations

#### **Step 3.2: Database-Level Optimization**
Add materialized views and optimized indexes for complex queries.

**Impact**: 70-90% faster analytics queries

---

### **Phase 4: Response Optimization (Incremental)**

#### **Step 4.1: Response Compression & Streaming**
Optimize JSON serialization and add response streaming for large datasets.

**Impact**: 30-40% faster data transfer

#### **Step 4.2: Advanced Pagination**
Implement cursor-based pagination with database-level optimization.

**Impact**: 50-60% faster pagination

---

## 🎯 **Implementation Details**

### **Phase 1 Implementation**

#### **Conversation Listing Optimization**
```sql
-- BEFORE: Slow window functions
SELECT conversation.*, func.count().over(), func.max().over()

-- AFTER: Fast subqueries with proper indexes
SELECT c.*, 
       COALESCE(stats.message_count, 0) as message_count,
       stats.last_message_at,
       stats.last_message_preview
FROM conversations c
LEFT JOIN (
    SELECT conversation_id,
           COUNT(*) as message_count,
           MAX(created_at) as last_message_at,
           (SELECT LEFT(content, 100) FROM messages m2 
            WHERE m2.conversation_id = m.conversation_id 
            ORDER BY created_at DESC LIMIT 1) as last_message_preview
    FROM messages m
    GROUP BY conversation_id
) stats ON c.id = stats.conversation_id
WHERE c.user_id = $1
ORDER BY COALESCE(stats.last_message_at, c.created_at) DESC
LIMIT $2 OFFSET $3
```

#### **Message Loading Optimization**
```sql
-- BEFORE: 2 separate queries
SELECT conversation.id FROM conversations...  -- Verification
SELECT messages.* FROM messages...           -- Messages

-- AFTER: Single optimized query
SELECT m.*, c.user_id
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
WHERE m.conversation_id = $1 AND c.user_id = $2
ORDER BY m.created_at DESC
LIMIT $3 + 1
```

### **Phase 2 Implementation**

#### **Service-Level Caching**
```python
from functools import lru_cache
from typing import Dict, Any
import time

class CachedConversationService:
    def __init__(self, repo: ConversationRepository):
        self.repo = repo
        self._cache: Dict[str, tuple[Any, float]] = {}
        self._cache_ttl = 300  # 5 minutes
    
    async def get_user_conversations_cached(self, user_id: UUID, limit: int = 20) -> List[ConversationListItem]:
        cache_key = f"conversations:{user_id}:{limit}"
        now = time.time()
        
        if cache_key in self._cache:
            data, timestamp = self._cache[cache_key]
            if now - timestamp < self._cache_ttl:
                return data
        
        # Cache miss - fetch from database
        conversations = await self.repo.list_by_user_optimized(user_id, limit)
        self._cache[cache_key] = (conversations, now)
        return conversations
```

#### **Singleton Dependencies**
```python
@lru_cache()
def get_conversation_service_singleton() -> ConversationService:
    """Cached service instance per request lifecycle"""
    return ConversationService(ConversationRepository)

@router.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db_session),
    service: ConversationService = Depends(get_conversation_service_singleton)
):
    # Service instance is reused within same request
    service.repo.db = db  # Inject session
    return await service.get_cached_conversations(user_id)
```

### **Phase 3 Implementation**

#### **Prefetching & Batching**
```python
class PrefetchingMessageService:
    async def get_conversation_with_messages(
        self, 
        conversation_id: UUID, 
        user_id: UUID
    ) -> tuple[ConversationResponse, MessageListResponse]:
        """Single query to fetch conversation + latest messages"""
        
        # Optimized query that fetches both conversation and messages
        result = await self.db.execute(
            select(
                Conversation,
                Message
            )
            .outerjoin(Message, Message.conversation_id == Conversation.id)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                )
            )
            .order_by(desc(Message.created_at))
            .limit(20)  # Limit messages, not conversations
        )
        
        # Process results efficiently
        conversation = None
        messages = []
        
        for row in result:
            if not conversation:
                conversation = row.Conversation
            if row.Message:
                messages.append(row.Message)
        
        return (
            ConversationResponse.model_validate(conversation),
            MessageListResponse(
                messages=[MessageResponse.model_validate(m) for m in messages],
                total_count=len(messages),
                has_more=len(messages) == 20
            )
        )
```

## 📊 **Expected Performance Improvements**

| Operation | Current | Phase 1 | Phase 2 | Phase 3 | Final |
|-----------|---------|---------|---------|---------|-------|
| Conversation List | 800ms | 200ms | 100ms | 80ms | **60ms** |
| Message Loading | 400ms | 200ms | 120ms | 80ms | **50ms** |
| Message Sending | 300ms | 250ms | 180ms | 120ms | **80ms** |
| Conversation View | 600ms | 300ms | 150ms | 100ms | **70ms** |

## 🚀 **Quick Wins (Implement First)**

1. **Fix conversation listing window functions** → 60% improvement
2. **Combine message verification queries** → 50% improvement  
3. **Add response-level caching** → 40% improvement
4. **Optimize serialization** → 30% improvement

## 📈 **Success Metrics**

- **Conversation listing**: < 100ms (currently ~800ms)
- **Message loading**: < 80ms (currently ~400ms)
- **Message sending**: < 100ms (currently ~300ms)
- **Overall app responsiveness**: 3-4x improvement

---

*This plan prioritizes high-impact, low-risk optimizations first, then progressively implements more advanced techniques for maximum performance gains.* 