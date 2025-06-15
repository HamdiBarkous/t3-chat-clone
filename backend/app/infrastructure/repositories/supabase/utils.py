from typing import Dict, Any, Optional, List
import logging
from datetime import datetime

from app.infrastructure.supabase import supabase_client, SupabaseError

logger = logging.getLogger(__name__)


class SupabaseQueryBuilder:
    """Helper class for building complex Supabase queries"""
    
    def __init__(self, table_name: str):
        self.client = supabase_client
        self.table_name = table_name
        self._query = None
        self._select_fields = "*"
        self._filters = []
        self._orders = []
        self._limit_value = None
        self._offset_value = None
    
    def select(self, fields: str = "*"):
        """Set fields to select"""
        self._select_fields = fields
        return self
    
    def eq(self, column: str, value: Any):
        """Add equality filter"""
        self._filters.append(("eq", column, value))
        return self
    
    def neq(self, column: str, value: Any):
        """Add not equal filter"""
        self._filters.append(("neq", column, value))
        return self
    
    def gt(self, column: str, value: Any):
        """Add greater than filter"""
        self._filters.append(("gt", column, value))
        return self
    
    def gte(self, column: str, value: Any):
        """Add greater than or equal filter"""
        self._filters.append(("gte", column, value))
        return self
    
    def lt(self, column: str, value: Any):
        """Add less than filter"""
        self._filters.append(("lt", column, value))
        return self
    
    def lte(self, column: str, value: Any):
        """Add less than or equal filter"""
        self._filters.append(("lte", column, value))
        return self
    
    def like(self, column: str, pattern: str):
        """Add LIKE filter"""
        self._filters.append(("like", column, pattern))
        return self
    
    def ilike(self, column: str, pattern: str):
        """Add case-insensitive LIKE filter"""
        self._filters.append(("ilike", column, pattern))
        return self
    
    def in_(self, column: str, values: List[Any]):
        """Add IN filter"""
        self._filters.append(("in_", column, values))
        return self
    
    def is_(self, column: str, value: Any):
        """Add IS filter (for NULL checks)"""
        self._filters.append(("is_", column, value))
        return self
    
    def order(self, column: str, ascending: bool = True):
        """Add order by clause"""
        self._orders.append((column, ascending))
        return self
    
    def limit(self, count: int):
        """Set limit"""
        self._limit_value = count
        return self
    
    def offset(self, count: int):
        """Set offset"""
        self._offset_value = count
        return self
    
    def build_query(self):
        """Build the Supabase query"""
        query = self.client.table(self.table_name).select(self._select_fields)
        
        # Apply filters
        for filter_type, column, value in self._filters:
            if filter_type == "eq":
                query = query.eq(column, value)
            elif filter_type == "neq":
                query = query.neq(column, value)
            elif filter_type == "gt":
                query = query.gt(column, value)
            elif filter_type == "gte":
                query = query.gte(column, value)
            elif filter_type == "lt":
                query = query.lt(column, value)
            elif filter_type == "lte":
                query = query.lte(column, value)
            elif filter_type == "like":
                query = query.like(column, value)
            elif filter_type == "ilike":
                query = query.ilike(column, value)
            elif filter_type == "in_":
                query = query.in_(column, value)
            elif filter_type == "is_":
                query = query.is_(column, value)
        
        # Apply ordering
        for column, ascending in self._orders:
            query = query.order(column, desc=not ascending)
        
        # Apply pagination
        if self._limit_value is not None:
            query = query.limit(self._limit_value)
        if self._offset_value is not None:
            query = query.offset(self._offset_value)
        
        return query
    
    async def execute(self) -> List[Dict[str, Any]]:
        """Execute the query and return results"""
        try:
            query = self.build_query()
            response = query.execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error executing query on {self.table_name}: {e}")
            raise SupabaseError(f"Query execution failed: {str(e)}")
    
    async def execute_single(self) -> Optional[Dict[str, Any]]:
        """Execute query and return single result"""
        results = await self.execute()
        return results[0] if results else None
    
    async def execute_count(self) -> int:
        """Execute query and return count"""
        try:
            query = self.client.table(self.table_name).select("id", count="exact")
            
            # Apply filters only (no ordering/pagination for count)
            for filter_type, column, value in self._filters:
                if filter_type == "eq":
                    query = query.eq(column, value)
                elif filter_type == "neq":
                    query = query.neq(column, value)
                elif filter_type == "gt":
                    query = query.gt(column, value)
                elif filter_type == "gte":
                    query = query.gte(column, value)
                elif filter_type == "lt":
                    query = query.lt(column, value)
                elif filter_type == "lte":
                    query = query.lte(column, value)
                elif filter_type == "like":
                    query = query.like(column, value)
                elif filter_type == "ilike":
                    query = query.ilike(column, value)
                elif filter_type == "in_":
                    query = query.in_(column, value)
                elif filter_type == "is_":
                    query = query.is_(column, value)
            
            response = query.execute()
            return response.count or 0
        except Exception as e:
            logger.error(f"Error counting rows in {self.table_name}: {e}")
            raise SupabaseError(f"Count query failed: {str(e)}")


class PaginationHelper:
    """Helper for handling pagination with Supabase"""
    
    @staticmethod
    def create_pagination_response(
        data: List[Dict[str, Any]], 
        total_count: int, 
        limit: int, 
        offset: int
    ) -> Dict[str, Any]:
        """Create a standardized pagination response"""
        return {
            "data": data,
            "pagination": {
                "total": total_count,
                "count": len(data),
                "limit": limit,
                "offset": offset,
                "has_more": (offset + len(data)) < total_count
            }
        }
    
    @staticmethod
    def extract_pagination_params(
        limit: Optional[int] = None, 
        offset: Optional[int] = None,
        default_limit: int = 20,
        max_limit: int = 100
    ) -> tuple[int, int]:
        """Extract and validate pagination parameters"""
        limit = min(limit or default_limit, max_limit)
        offset = max(offset or 0, 0)
        return limit, offset


class TimestampHelper:
    """Helper for handling timestamp-based pagination"""
    
    @staticmethod
    def parse_timestamp(timestamp_str: Optional[str]) -> Optional[datetime]:
        """Parse timestamp string to datetime object"""
        if not timestamp_str:
            return None
        try:
            return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        except ValueError:
            return None
    
    @staticmethod
    def format_timestamp(dt: Optional[datetime]) -> Optional[str]:
        """Format datetime to ISO string"""
        if not dt:
            return None
        return dt.isoformat()


class BatchOperationHelper:
    """Helper for batch operations with Supabase"""
    
    @staticmethod
    async def batch_insert(
        table_name: str, 
        data: List[Dict[str, Any]], 
        batch_size: int = 100
    ) -> List[Dict[str, Any]]:
        """Insert data in batches to avoid size limits"""
        all_results = []
        
        for i in range(0, len(data), batch_size):
            batch = data[i:i + batch_size]
            try:
                response = supabase_client.table(table_name).insert(batch).execute()
                if response.data:
                    all_results.extend(response.data)
            except Exception as e:
                logger.error(f"Error in batch insert for {table_name}: {e}")
                raise SupabaseError(f"Batch insert failed: {str(e)}")
        
        return all_results
    
    @staticmethod
    async def batch_update(
        table_name: str, 
        updates: List[tuple[Dict[str, Any], Dict[str, Any]]], 
        batch_size: int = 50
    ) -> List[Dict[str, Any]]:
        """Update multiple records in batches"""
        all_results = []
        
        for i in range(0, len(updates), batch_size):
            batch = updates[i:i + batch_size]
            batch_results = []
            
            for update_data, filters in batch:
                try:
                    query = supabase_client.table(table_name).update(update_data)
                    for key, value in filters.items():
                        query = query.eq(key, value)
                    
                    response = query.execute()
                    if response.data:
                        batch_results.extend(response.data)
                except Exception as e:
                    logger.error(f"Error in batch update for {table_name}: {e}")
                    raise SupabaseError(f"Batch update failed: {str(e)}")
            
            all_results.extend(batch_results)
        
        return all_results


# Convenience functions
def query_builder(table_name: str) -> SupabaseQueryBuilder:
    """Create a new query builder for the given table"""
    return SupabaseQueryBuilder(table_name)


async def simple_get(table_name: str, id_value: Any, id_column: str = "id") -> Optional[Dict[str, Any]]:
    """Simple get by ID operation"""
    return await query_builder(table_name).eq(id_column, id_value).execute_single()


async def simple_list(
    table_name: str, 
    filters: Optional[Dict[str, Any]] = None,
    limit: int = 20, 
    offset: int = 0,
    order_by: Optional[str] = None,
    ascending: bool = True
) -> List[Dict[str, Any]]:
    """Simple list operation with filters and pagination"""
    builder = query_builder(table_name)
    
    if filters:
        for key, value in filters.items():
            builder = builder.eq(key, value)
    
    if order_by:
        builder = builder.order(order_by, ascending)
    
    return await builder.limit(limit).offset(offset).execute() 