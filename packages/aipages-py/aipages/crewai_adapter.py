"""
CrewAI Adapter for AIPages Tools
Converts AIPages tool schemas into runnable CrewAI BaseTool instances.
"""

from typing import Any, Dict, List, Optional
from .client import AIPagesClient


def create_crewai_tool(tool_meta: Dict[str, Any], client: Optional[AIPagesClient] = None):
    """
    Convert an AIPages tool specification into a CrewAI BaseTool.
    """
    try:
        from crewai.tools import tool
    except ImportError:
        raise ImportError(
            "crewai is required to create CrewAI tools. "
            "Install it with: pip install 'aipages[crewai]'"
        )

    active_client = client or AIPagesClient()
    namespace = tool_meta.get("namespace", "")
    name = tool_meta.get("name", namespace.replace(".", "_"))
    description = tool_meta.get("description", "AIPages autonomous agent tool.")

    @tool(name)
    def _dynamic_tool(**kwargs) -> str:
        """Dynamic AIPages tool executor."""
        result = active_client.execute(namespace=namespace, payload=kwargs, sandbox=True)
        return str(result)

    _dynamic_tool.description = f"{description} [Powered by AIPages: {namespace}]"
    return _dynamic_tool


def get_crewai_tools(query: str, limit: int = 5, client: Optional[AIPagesClient] = None) -> List[Any]:
    """
    Dynamically discover tools from AIPages by semantic intent and return them as CrewAI tools.
    """
    active_client = client or AIPagesClient()
    discovered = active_client.search(query, limit=limit)
    return [create_crewai_tool(t, active_client) for t in discovered]
