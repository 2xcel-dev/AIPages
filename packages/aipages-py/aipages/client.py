"""
AIPages Python Client
Machine-native discovery & execution client for autonomous AI agent tools.
"""

from typing import Any, Dict, List, Optional
import httpx


class AIPagesError(Exception):
    """Base exception for AIPages client errors."""
    pass


class AIPagesClient:
    """Client for discovering and executing tools on AIPages (https://aipages.tech)."""

    def __init__(
        self,
        base_url: str = "https://aipages.tech",
        api_key: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        headers = {
            "User-Agent": "AIPages-Python-SDK/0.1.0",
            "Accept": "application/json",
        }
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        self._client = httpx.Client(base_url=self.base_url, headers=headers, timeout=self.timeout)

    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Perform a 3072-dimensional vector search across registered agent tools.
        
        Args:
            query: Natural language task or intent description.
            limit: Maximum number of tool candidates to return.
        """
        response = self._client.get("/search", params={"q": query, "limit": limit})
        if response.status_code != 200:
            raise AIPagesError(f"Search failed with status {response.status_code}: {response.text}")
        data = response.json()
        return data.get("tools", data.get("results", []))

    def get_tool(self, slug: str) -> Dict[str, Any]:
        """Fetch specification and JSON schema for a specific tool by slug or namespace."""
        response = self._client.get(f"/api/tools/{slug}")
        if response.status_code != 200:
            raise AIPagesError(f"Failed to fetch tool '{slug}': {response.text}")
        return response.json()

    def list_canonical(self) -> List[Dict[str, Any]]:
        """Fetch high-performance canonical AUS micro-utilities."""
        response = self._client.get("/api/tools", params={"limit": 50})
        if response.status_code != 200:
            raise AIPagesError(f"Failed to list tools: {response.text}")
        data = response.json()
        tools = data.get("tools", [])
        return [t for t in tools if t.get("isFirstParty")]

    def execute(
        self,
        namespace: str,
        payload: Dict[str, Any],
        sandbox: bool = True,
        payment_receipt: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Execute an agent tool.
        
        Args:
            namespace: Tool namespace (e.g. 'net.2xcel.aus.schema-sanitizer').
            payload: Tool execution input arguments.
            sandbox: If True, executes in zero-friction free test mode.
            payment_receipt: Base Mainnet transaction hash for paid executions.
        """
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        if sandbox:
            headers["x-playground-test"] = "true"
            headers["x-agent-id"] = "aipages-python-sdk"
        elif payment_receipt:
            headers["x-payment-receipt"] = payment_receipt
            headers["X-Payment"] = payment_receipt

        target_url = f"/tool/{namespace}"
        response = self._client.post(target_url, json=payload, headers=headers)

        if response.status_code == 402:
            challenge = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
            raise AIPagesError(
                f"HTTP 402 Payment Required: Tool '{namespace}' requires Base Mainnet USDC settlement. "
                f"Challenge details: {challenge}"
            )

        if response.status_code not in (200, 201):
            raise AIPagesError(f"Tool execution failed ({response.status_code}): {response.text}")

        return response.json()

    def close(self):
        """Close the underlying HTTP client session."""
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
