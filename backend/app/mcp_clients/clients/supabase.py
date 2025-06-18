from typing import Dict, Any, List, Optional
from ..base import BaseMCPClient


class SupabaseMCPClient(BaseMCPClient):
    """Supabase MCP client for database operations and project management"""
    
    def __init__(self, access_token: str, project_ref: Optional[str] = None, read_only: bool = True):
        """
        Initialize Supabase MCP client
        
        Args:
            access_token: Supabase personal access token (required)
            project_ref: Specific project reference to scope to (optional)
            read_only: Whether to restrict to read-only operations (defaults to True)
        """
        if not access_token:
            raise ValueError("Supabase access token is required")
        
        self.access_token = access_token
        self.project_ref = project_ref
        self.read_only = read_only
        
        server_config = self.get_server_config()
        super().__init__(server_config)

    def get_server_config(self) -> Dict[str, Any]:
        """Get the server configuration for Supabase MCP server"""
        args = [
            "-y",
            "@supabase/mcp-server-supabase@latest",
            "--access-token",
            self.access_token
        ]
        
        # Add optional project scoping
        if self.project_ref:
            args.extend(["--project-ref", self.project_ref])
        
        # Add read-only mode if enabled
        if self.read_only:
            args.append("--read-only")
        
        return {
            "command": "npx",
            "args": args,
            "env": None
        }

    # Database Operations
    async def list_tables(self, schemas: List[str] = None) -> Any:
        """List all tables within specified schemas"""
        args = {}
        if schemas:
            args["schemas"] = schemas
        return await self.call_tool("list_tables", args)

    async def execute_sql(self, query: str) -> Any:
        """Execute raw SQL in the database"""
        return await self.call_tool("execute_sql", {"query": query})

    async def apply_migration(self, name: str, query: str) -> Any:
        """Apply a SQL migration to the database"""
        return await self.call_tool("apply_migration", {
            "name": name,
            "query": query
        })

    async def list_extensions(self) -> Any:
        """List all extensions in the database"""
        return await self.call_tool("list_extensions", {})

    async def list_migrations(self) -> Any:
        """List all migrations in the database"""
        return await self.call_tool("list_migrations", {})

    # Project Management (only available if not project-scoped)
    async def list_projects(self) -> Any:
        """List all Supabase projects for the user"""
        return await self.call_tool("list_projects", {})

    async def get_project(self, project_id: str) -> Any:
        """Get details for a specific project"""
        return await self.call_tool("get_project", {"id": project_id})

    async def create_project(self, name: str, organization_id: str, region: str = None) -> Any:
        """Create a new Supabase project"""
        args = {
            "name": name,
            "organization_id": organization_id
        }
        if region:
            args["region"] = region
        return await self.call_tool("create_project", args)

    async def pause_project(self, project_id: str) -> Any:
        """Pause a Supabase project"""
        return await self.call_tool("pause_project", {"project_id": project_id})

    async def restore_project(self, project_id: str) -> Any:
        """Restore a Supabase project"""
        return await self.call_tool("restore_project", {"project_id": project_id})

    # Organization Management
    async def list_organizations(self) -> Any:
        """List all organizations that the user is a member of"""
        return await self.call_tool("list_organizations", {})

    async def get_organization(self, organization_id: str) -> Any:
        """Get details for an organization"""
        return await self.call_tool("get_organization", {"id": organization_id})

    # Edge Functions
    async def list_edge_functions(self, project_id: str) -> Any:
        """List all Edge Functions in a Supabase project"""
        return await self.call_tool("list_edge_functions", {"project_id": project_id})

    async def deploy_edge_function(self, project_id: str, name: str, files: List[Dict], entrypoint_path: str = "index.ts") -> Any:
        """Deploy an Edge Function to a Supabase project"""
        return await self.call_tool("deploy_edge_function", {
            "project_id": project_id,
            "name": name,
            "files": files,
            "entrypoint_path": entrypoint_path
        })

    # Monitoring & Debugging
    async def get_logs(self, project_id: str, service: str) -> Any:
        """Get logs for a Supabase project by service type"""
        return await self.call_tool("get_logs", {
            "project_id": project_id,
            "service": service
        })

    async def get_advisors(self, project_id: str, advisor_type: str) -> Any:
        """Get advisory notices for a Supabase project"""
        return await self.call_tool("get_advisors", {
            "project_id": project_id,
            "type": advisor_type
        })

    # Project Configuration
    async def get_project_url(self, project_id: str) -> Any:
        """Get the API URL for a project"""
        return await self.call_tool("get_project_url", {"project_id": project_id})

    async def get_anon_key(self, project_id: str) -> Any:
        """Get the anonymous API key for a project"""
        return await self.call_tool("get_anon_key", {"project_id": project_id})

    async def generate_typescript_types(self, project_id: str) -> Any:
        """Generate TypeScript types based on the database schema"""
        return await self.call_tool("generate_typescript_types", {"project_id": project_id})

    # Branching (requires paid plan)
    async def create_branch(self, project_id: str, confirm_cost_id: str, name: str = "develop") -> Any:
        """Create a development branch"""
        return await self.call_tool("create_branch", {
            "project_id": project_id,
            "confirm_cost_id": confirm_cost_id,
            "name": name
        })

    async def list_branches(self, project_id: str) -> Any:
        """List all development branches"""
        return await self.call_tool("list_branches", {"project_id": project_id})

    async def delete_branch(self, branch_id: str) -> Any:
        """Delete a development branch"""
        return await self.call_tool("delete_branch", {"branch_id": branch_id})

    async def merge_branch(self, branch_id: str) -> Any:
        """Merge migrations and edge functions from a development branch to production"""
        return await self.call_tool("merge_branch", {"branch_id": branch_id})

    async def reset_branch(self, branch_id: str, migration_version: str = None) -> Any:
        """Reset migrations of a development branch"""
        args = {"branch_id": branch_id}
        if migration_version:
            args["migration_version"] = migration_version
        return await self.call_tool("reset_branch", args)

    async def rebase_branch(self, branch_id: str) -> Any:
        """Rebase a development branch on production"""
        return await self.call_tool("rebase_branch", {"branch_id": branch_id})

    # Documentation
    async def search_docs(self, query: str, limit: int = None) -> Any:
        """Search the Supabase documentation"""
        args = {"query": query}
        if limit:
            args["limit"] = limit
        return await self.call_tool("search_docs", args)

    # Cost Management
    async def get_cost(self, organization_id: str, cost_type: str) -> Any:
        """Get the cost of creating a new project or branch"""
        return await self.call_tool("get_cost", {
            "organization_id": organization_id,
            "type": cost_type
        })

    async def confirm_cost(self, cost_type: str, recurrence: str, amount: float) -> Any:
        """Confirm understanding of costs"""
        return await self.call_tool("confirm_cost", {
            "type": cost_type,
            "recurrence": recurrence,
            "amount": amount
        }) 