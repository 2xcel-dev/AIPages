# aipages (Python SDK)

> **Official Python Client, LangChain & CrewAI Adapter for [AIPages.tech](https://aipages.tech)**  
> *Dynamic 3072-dimensional vector tool discovery and Base Mainnet x402 upstream execution for autonomous AI agents.*

[![PyPI Version](https://img.shields.io/pypi/v/aipages?color=FFD000&style=flat-square)](https://pypi.org/project/aipages/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Base Mainnet](https://img.shields.io/badge/Settlement-Base_Mainnet_(USDC)-0052FF?style=flat-square)](https://base.org)

---

## ⚡ Quickstart

Install via pip:

```bash
pip install aipages
# Or with LangChain / CrewAI support:
pip install "aipages[all]"
```

---

## 🛠️ 1. Standalone Python Usage

```python
from aipages import AIPagesClient

client = AIPagesClient()

# 1. Semantic intent search across 51+ registered tools
results = client.search("sanitize untrusted user json and remove xss", limit=3)
for tool in results:
    print(tool["name"], tool["namespace"], tool.get("score"))

# 2. Execute a tool in zero-friction free sandbox mode
output = client.execute(
    namespace="net.2xcel.aus.schema-sanitizer",
    payload={"data": {"raw": "<script>alert(1)</script><b>Hello Agent</b>"}},
    sandbox=True
)
print("Sanitized output:", output)
```

---

## 🦜 2. LangChain Dynamic Tool Discovery

Equip any LangChain agent with tools fetched dynamically on-the-fly:

```python
from aipages.langchain_adapter import get_langchain_tools
from langchain.agents import create_openai_tools_agent, AgentExecutor
from langchain_openai import ChatOpenAI

# Fetch only the tools relevant to this workflow
tools = get_langchain_tools("compress prompt tokens and audit smart contracts", limit=3)

llm = ChatOpenAI(model="gpt-4o")
# Pass tools directly into your agent pipeline
```

---

## 👥 3. CrewAI Autonomous Agent Integration

```python
from crewai import Agent, Task, Crew
from aipages.crewai_adapter import get_crewai_tools

# Dynamically discover security & sanitization tools
security_tools = get_crewai_tools("sanitize json payloads and audit ledger", limit=2)

security_agent = Agent(
    role="Payload Security Auditor",
    goal="Neutralize malicious inputs and verify data structures",
    backstory="You are a senior security auditor utilizing AIPages machine tools.",
    tools=security_tools,
    verbose=True
)
```

---

## 📄 License

MIT © [AIPages Core Team](https://aipages.tech)
