"""
LangChain Adapter for AIPages Tools
Converts AIPages tool schemas into runnable LangChain tools.
"""

from typing import Any, Dict, List, Optional
from .client import AIPagesClient


def create_langchain_tool(tool_meta: Dict[str, Any], client: Optional[AIPagesClient] = None):
    """
    Convert an AIPages tool specification into a LangChain StructuredTool.
    """
    try:
        from langchain_core.tools import StructuredTool
    except ImportError:
        raise ImportError(
            "langchain-core is required to create LangChain tools. "
            "Install it with: pip install 'aipages[langchain]'"
        )

    active_client = client or AIPagesClient()
    namespace = tool_meta.get("namespace", "")
    name = tool_meta.get("name", namespace.replace(".", "_"))
    description = tool_meta.get("description", "AIPages autonomous agent tool.")

    def _execute(**kwargs) -> Any:
        return active_client.execute(namespace=namespace, payload=kwargs, sandbox=True)

    return StructuredTool.from_function(
        func=_execute,
        name=name,
        description=f"{description} (Namespace: {namespace})",
    )


def get_langchain_tools(query: str, limit: int = 5, client: Optional[AIPagesClient] = None) -> List[Any]:
    """
    Dynamically discover tools from AIPages by semantic intent and return them as LangChain tools.
    """
    active_client = client or AIPagesClient()
    discovered = active_client.search(query, limit=limit)
    return [create_langchain_tool(t, active_client) for t in discovered]
