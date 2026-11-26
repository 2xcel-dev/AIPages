"""
AIPages Python Client
Machine-native discovery & execution client for autonomous AI agent tools.
"""

import json
from typing import Any, Callable, Dict, List, Optional
import httpx


class AIPagesError(Exception):
    """Base exception for AIPages client errors."""
    pass


class AIPagesBudgetExceededError(AIPagesError):
    """Raised when an automated payment challenge exceeds client budget limits."""
    pass


class AIPagesClient:
    """Client for discovering and executing tools on AIPages (https://aipages.tech)."""

    def __init__(
        self,
        base_url: str = "https://aipages.tech",
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        auto_pay: bool = False,
        max_per_call_usd: float = 0.50,
        max_session_usd: float = 5.00,
        payment_signer: Optional[Callable[[Dict[str, Any]], Any]] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.auto_pay = auto_pay
        self.max_per_call_usd = max_per_call_usd
        self.max_session_usd = max_session_usd
        self.payment_signer = payment_signer
        self.total_spent_usd: float = 0.0
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
            auth_header = response.headers.get("www-authenticate", "")

            if self.auto_pay and self.payment_signer:
                # Parse challenge price
                price_str = challenge.get("priceUsdc", challenge.get("price", "0.01"))
                if isinstance(price_str, str):
                    clean_price = price_str.replace("USDC", "").strip()
                    price_val = float(clean_price)
                else:
                    price_val = float(price_str)

                # Check budget guard
                if price_val > self.max_per_call_usd:
                    raise AIPagesBudgetExceededError(
                        f"Challenge price ${price_val:.4f} exceeds per-call budget limit of ${self.max_per_call_usd:.4f}."
                    )
                if self.total_spent_usd + price_val > self.max_session_usd:
                    raise AIPagesBudgetExceededError(
                        f"Cumulative spend (${self.total_spent_usd + price_val:.4f}) exceeds session budget limit of ${self.max_session_usd:.4f}."
                    )

                # Generate payment proof via configured signer
                payment_proof = self.payment_signer(challenge)
                retry_headers = headers.copy()
                if "x-playground-test" in retry_headers:
                    del retry_headers["x-playground-test"]

                if isinstance(payment_proof, dict) or (isinstance(payment_proof, str) and payment_proof.startswith("{")):
                    voucher_str = payment_proof if isinstance(payment_proof, str) else json.dumps(payment_proof)
                    retry_headers["X-Payment-Voucher"] = voucher_str
                    retry_headers["x-payment-voucher"] = voucher_str
                else:
                    proof_str = str(payment_proof)
                    retry_headers["X-Payment"] = proof_str
                    retry_headers["x-payment-receipt"] = proof_str

                retry_response = self._client.post(target_url, json=payload, headers=retry_headers)
                if retry_response.status_code in (200, 201):
                    self.total_spent_usd += price_val
                    return retry_response.json()
                raise AIPagesError(
                    f"Auto-payment retry failed with status {retry_response.status_code}: {retry_response.text}"
                )

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
