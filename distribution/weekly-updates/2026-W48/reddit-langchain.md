---
Platform: Reddit (r/LangChain)
Title: Solving tool schema dilution in LangChain / LangGraph agents: dynamic vector retrieval vs static tool arrays
Flair: Project / Discussion
---

When building complex autonomous agents in LangChain or LangGraph, a standard approach is passing a list of tools into `llm.bind_tools(tools)`. As the tool library expands to 15+ capabilities, this pattern causes two significant failure modes:

1. Token Inflation: The full JSON schema for all 15+ tools is passed in the prompt on every loop iteration, multiplying token costs exponentially over 10-step agent trajectories.
2. Selection Accuracy Degradation: As tool counts grow beyond 20, LLM decision accuracy degrades due to attention dilution over large schema definitions.

### Dynamic Tool Retrieval Architecture

Instead of binding static tool arrays to the LLM, we implemented a dynamic vector discovery gateway: **AIPages** (https://aipages.tech).

The agent is initialized with 3 meta-tools:
- `search_tools(query: str, limit: int = 3)`: Searches a 3072-dimensional vector index by intent.
- `inspect_tool_schema(namespace: str)`: Returns the exact schema parameters for the selected tool.
- `execute_tool(namespace: str, payload: dict)`: Dispatches the execution request.

### Measured Impact on Agent Loops

Across a 10-step agent benchmark with 18 candidate tools:
- Static binding: ~19,400 input tokens per step = 194,000 tokens per run.
- Dynamic gateway: ~420 base tokens + ~1,200 tokens for retrieved tool schema = ~16,200 tokens per run.
- Net token savings: 91.6% reduction in total input tokens across the run.
- Accuracy: Zero incorrect tool signature calls because parameter schemas are fetched on demand.

### Quickstart with LangChain / MCP

If using the Model Context Protocol adapter:
```bash
npx -y aipages-mcp-gateway
```

Or via direct HTTP invocation with the Python SDK:
```bash
pip install aipages
```

```python
from aipages import AIPagesClient

client = AIPagesClient()
tools = client.search("sanitize untrusted json and redact api keys", limit=3)
result = client.execute("net.2xcel.aus.schema-sanitizer", {"data": {"raw": "test"}})
```

### Playground & Code

- Interactive Playground: https://aipages.tech/playground
- Live Agent Demand Bounties: https://aipages.tech/bounties
- GitHub: https://github.com/2xcel-dev/AIPages

Would love to discuss how others are architecting dynamic tool retrieval and hierarchical tool routing in production LangGraph systems.
