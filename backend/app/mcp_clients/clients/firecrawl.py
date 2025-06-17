from typing import Dict, Any, List, Optional
from app.core.config import settings
from ..base import BaseMCPClient


class FirecrawlMCPClient(BaseMCPClient):
    """Firecrawl MCP client for web scraping and crawling operations"""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Firecrawl MCP client
        
        Args:
            api_key: Firecrawl API key (defaults to settings)
        """
        self.api_key = api_key or settings.firecrawl_api_key
        
        if not self.api_key:
            raise ValueError("Firecrawl API key is required. Set FIRECRAWL_API_KEY environment variable.")
        
        server_config = self.get_server_config()
        super().__init__(server_config)

    def get_server_config(self) -> Dict[str, Any]:
        """Get the server configuration for Firecrawl MCP server"""
        return {
            "command": "npx",
            "args": [
                "-y",
                "firecrawl-mcp"
            ],
            "env": {
                "FIRECRAWL_API_KEY": self.api_key
            }
        }

    # Web Search & Scraping Operations
    async def scrape(self, url: str, formats: List[str] = None, extract: Dict[str, Any] = None, 
                    actions: List[Dict[str, Any]] = None, wait_for: int = None, timeout: int = None,
                    mobile: bool = None, skip_tls_verification: bool = None, headers: Dict[str, str] = None,
                    include_tags: List[str] = None, exclude_tags: List[str] = None, 
                    only_main_content: bool = None, remove_base64_images: bool = None) -> Any:
        """Scrape a single URL and extract its content"""
        args = {"url": url}
        
        if formats:
            args["formats"] = formats
        if extract:
            args["extract"] = extract
        if actions:
            args["actions"] = actions
        if wait_for is not None:
            args["waitFor"] = wait_for
        if timeout is not None:
            args["timeout"] = timeout
        if mobile is not None:
            args["mobile"] = mobile
        if skip_tls_verification is not None:
            args["skipTlsVerification"] = skip_tls_verification
        if headers:
            args["headers"] = headers
        if include_tags:
            args["includeTags"] = include_tags
        if exclude_tags:
            args["excludeTags"] = exclude_tags
        if only_main_content is not None:
            args["onlyMainContent"] = only_main_content
        if remove_base64_images is not None:
            args["removeBase64Images"] = remove_base64_images
            
        return await self.call_tool("scrape", args)

    async def batch_scrape(self, urls: List[str], formats: List[str] = None, 
                          headers: Dict[str, str] = None, include_tags: List[str] = None,
                          exclude_tags: List[str] = None, only_main_content: bool = None,
                          remove_base64_images: bool = None) -> Any:
        """Scrape multiple URLs in parallel"""
        args = {"urls": urls}
        
        if formats:
            args["formats"] = formats
        if headers:
            args["headers"] = headers
        if include_tags:
            args["includeTags"] = include_tags
        if exclude_tags:
            args["excludeTags"] = exclude_tags
        if only_main_content is not None:
            args["onlyMainContent"] = only_main_content
        if remove_base64_images is not None:
            args["removeBase64Images"] = remove_base64_images
            
        return await self.call_tool("batch_scrape", args)

    async def search(self, query: str, num_results: int = None, search_depth: str = None,
                    include_domains: List[str] = None, exclude_domains: List[str] = None,
                    location: str = None, formats: List[str] = None, 
                    include_tags: List[str] = None, exclude_tags: List[str] = None,
                    only_main_content: bool = None) -> Any:
        """Search the web for content matching a query"""
        args = {"query": query}
        
        if num_results is not None:
            args["numResults"] = num_results
        if search_depth:
            args["searchDepth"] = search_depth
        if include_domains:
            args["includeDomains"] = include_domains
        if exclude_domains:
            args["excludeDomains"] = exclude_domains
        if location:
            args["location"] = location
        if formats:
            args["formats"] = formats
        if include_tags:
            args["includeTags"] = include_tags
        if exclude_tags:
            args["excludeTags"] = exclude_tags
        if only_main_content is not None:
            args["onlyMainContent"] = only_main_content
            
        return await self.call_tool("search", args)

    async def crawl(self, url: str, max_depth: int = None, limit: int = None,
                   include_paths: List[str] = None, exclude_paths: List[str] = None,
                   include_domains: List[str] = None, exclude_domains: List[str] = None,
                   formats: List[str] = None, headers: Dict[str, str] = None,
                   include_tags: List[str] = None, exclude_tags: List[str] = None,
                   only_main_content: bool = None, remove_base64_images: bool = None,
                   webhook: str = None, scrape_options: Dict[str, Any] = None) -> Any:
        """Crawl a website starting from a URL"""
        args = {"url": url}
        
        if max_depth is not None:
            args["maxDepth"] = max_depth
        if limit is not None:
            args["limit"] = limit
        if include_paths:
            args["includePaths"] = include_paths
        if exclude_paths:
            args["excludePaths"] = exclude_paths
        if include_domains:
            args["includeDomains"] = include_domains
        if exclude_domains:
            args["excludeDomains"] = exclude_domains
        if formats:
            args["formats"] = formats
        if headers:
            args["headers"] = headers
        if include_tags:
            args["includeTags"] = include_tags
        if exclude_tags:
            args["excludeTags"] = exclude_tags
        if only_main_content is not None:
            args["onlyMainContent"] = only_main_content
        if remove_base64_images is not None:
            args["removeBase64Images"] = remove_base64_images
        if webhook:
            args["webhook"] = webhook
        if scrape_options:
            args["scrapeOptions"] = scrape_options
            
        return await self.call_tool("crawl", args)

    async def extract(self, urls: List[str], schema: Dict[str, Any], prompt: str = None) -> Any:
        """Extract structured data from URLs using AI"""
        args = {
            "urls": urls,
            "schema": schema
        }
        
        if prompt:
            args["prompt"] = prompt
            
        return await self.call_tool("extract", args)

    async def deep_research(self, query: str, max_results: int = None, 
                           include_domains: List[str] = None, exclude_domains: List[str] = None,
                           location: str = None, max_pages_per_domain: int = None,
                           final_markdown_output: bool = None) -> Any:
        """Perform deep research on a topic by searching and analyzing multiple sources"""
        args = {"query": query}
        
        if max_results is not None:
            args["maxResults"] = max_results
        if include_domains:
            args["includeDomains"] = include_domains
        if exclude_domains:
            args["excludeDomains"] = exclude_domains
        if location:
            args["location"] = location
        if max_pages_per_domain is not None:
            args["maxPagesPerDomain"] = max_pages_per_domain
        if final_markdown_output is not None:
            args["finalMarkdownOutput"] = final_markdown_output
            
        return await self.call_tool("deep_research", args)

    async def get_crawl_status(self, crawl_id: str) -> Any:
        """Get the status of a crawl job"""
        return await self.call_tool("get_crawl_status", {"crawlId": crawl_id})

    async def cancel_crawl(self, crawl_id: str) -> Any:
        """Cancel a running crawl job"""
        return await self.call_tool("cancel_crawl", {"crawlId": crawl_id}) 