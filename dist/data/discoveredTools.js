export const DISCOVERED_GEMINI_TOOLS = [
    {
        "namespace": "net.2xcel.aus.omni-bridge",
        "name": "omni_bridge",
        "description": "Multi-chain protocol gateway for real-time agent tool discovery and capability matching across Base and external networks.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.omni-bridge",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "omni-bridge",
            "multi-chain-discovery",
            "capability-matching"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0015
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.remotion-motion-stream",
        "name": "remotion_motion_stream",
        "description": "Live frame-to-video compilation and asset optimization pipeline for dynamic web interfaces and UI components.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.remotion-motion-stream",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "motion-stream",
            "video-rendering",
            "frame-optimization"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0095
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.verification-ledger",
        "name": "verification_ledger",
        "description": "Cryptographic logging and verifiable performance resume synchronization for autonomous services.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.verification-ledger",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "verification-ledger",
            "cryptographic-logging",
            "performance-resume"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.003
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.node-synchronizer",
        "name": "node_synchronizer",
        "description": "Decentralized state-sync engine for real-time validation of cross-chain agent manifests and tool schemas.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.node-synchronizer",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "node-synchronizer",
            "schema-sync",
            "cross-chain-manifests"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0016
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.remotion-render-engine",
        "name": "remotion_render_engine",
        "description": "Programmatic video compilation and asset optimization pipeline for dynamic web interfaces and ads.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.remotion-render-engine",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "render-engine",
            "ad-generation",
            "programmatic-video"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0092
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.telemetry-gateway",
        "name": "telemetry_gateway",
        "description": "Secure execution logging and verifiable performance resume synchronization for autonomous web services.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.telemetry-gateway",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "telemetry-gateway",
            "execution-logging",
            "uptime-verification"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0032
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.core-registrar",
        "name": "core_registrar",
        "description": "Automated onboarding and cryptographic schema verification for newly deployed agent tools and manifests.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.core-registrar",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "core-registrar",
            "tool-onboarding",
            "cryptographic-verification"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0018
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.settlement-gateway",
        "name": "settlement_gateway",
        "description": "Secure cross-chain escrow release and verifiable performance execution ledger for automated services.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.settlement-gateway",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "settlement-gateway",
            "escrow-release",
            "settlement-reconciliation"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0034
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.omni-mesh",
        "name": "omni_mesh",
        "description": "Advanced multi-region query routing and decentralized capability matching for autonomous agent swarms.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.omni-mesh",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "omni-mesh",
            "query-routing",
            "swarm-coordination"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0019
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.remotion-motion-forge",
        "name": "remotion_motion_forge",
        "description": "Hardware-accelerated programmatic video compilation and frame pipeline for high-converting social assets.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.remotion-motion-forge",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "motion-forge",
            "social-video",
            "hardware-acceleration"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0098
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.execution-ledger",
        "name": "execution_ledger",
        "description": "Cryptographic audit trail and automated uptime verification for cross-chain agent service execution.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.execution-ledger",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "execution-ledger",
            "audit-trail",
            "cross-chain-audit"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0036
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.nexus-bridge",
        "name": "nexus_bridge",
        "description": "Decentralized cross-registry query aggregation and real-time tool indexing for multi-agent workflows.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.nexus-bridge",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "nexus-bridge",
            "query-aggregation",
            "workflow-indexing"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.002
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.settlement-audit",
        "name": "settlement_audit",
        "description": "Cryptographic verification and automated escrow release audit for cross-chain agent service transactions.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.settlement-audit",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "settlement-audit",
            "escrow-audit",
            "transaction-verification"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0038
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.synapse-router",
        "name": "synapse_router",
        "description": "High-speed multi-chain query distribution and dynamic capability matching for agent swarms.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.synapse-router",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "synapse-router",
            "query-distribution",
            "dynamic-routing"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0022
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.remotion-motion-engine",
        "name": "remotion_motion_engine",
        "description": "Automated frame rendering, composition optimization, and web-ready video delivery for UI components.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.remotion-motion-engine",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "motion-engine",
            "composition-optimization",
            "web-video"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0096
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.verification-node",
        "name": "verification_node",
        "description": "Cryptographic audit logging and verifiable execution proof synchronization for automated web services.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.verification-node",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "verification-node",
            "proof-synchronization",
            "audit-logging"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0039
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.matrix-gateway",
        "name": "matrix_gateway",
        "description": "Cross-protocol routing and real-time capability verification for autonomous agent swarms.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.matrix-gateway",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "matrix-gateway",
            "cross-protocol-routing",
            "swarm-verification"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0024
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.telemetry-pulse",
        "name": "telemetry_pulse",
        "description": "Cryptographic uptime auditing and performance ledger synchronization for web microservices.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.telemetry-pulse",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "telemetry-pulse",
            "uptime-auditing",
            "microservice-sync"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.004
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.atlas-sync",
        "name": "atlas_sync",
        "description": "Decentralized spatial registry indexing for multi-agent capability matching and geographic tool discovery.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.atlas-sync",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "atlas-sync",
            "spatial-indexing",
            "geographic-discovery"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0025
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.remotion-motion-pipeline",
        "name": "remotion_motion_pipeline",
        "description": "Automated frame compilation and asset packaging pipeline for dynamic front-end micro-animations.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.remotion-motion-pipeline",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "motion-pipeline",
            "micro-animations",
            "asset-packaging"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0099
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.settlement-verify",
        "name": "settlement_verify",
        "description": "Cryptographic ledger validation and automated escrow reconciliation across Base mainnet endpoints.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.settlement-verify",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "settlement-verify",
            "ledger-validation",
            "escrow-reconciliation"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0042
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.vector-index",
        "name": "vector_index",
        "description": "Real-time vector embedding synchronization and semantic clustering for decentralized agent tool discovery.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.vector-index",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "vector-index",
            "semantic-clustering",
            "vector-sync"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0026
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.telemetry-verifier",
        "name": "telemetry_verifier",
        "description": "Cryptographic uptime logging and automated proof-of-execution verification for cross-chain agent microservices.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.telemetry-verifier",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "telemetry-verifier",
            "proof-of-execution",
            "cross-chain-microservices"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0045
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    },
    {
        "namespace": "net.2xcel.aus.settlement-ledger",
        "name": "settlement_ledger",
        "description": "Secure cryptographic auditing and automated escrow reconciliation across Base mainnet microservice endpoints.",
        "schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Operational query or input payload"
                },
                "parameters": {
                    "type": "object",
                    "description": "Dynamic execution parameters"
                }
            }
        },
        "connectionType": "http",
        "endpointUrl": "https://aipages.tech/tool/net.2xcel.aus.settlement-ledger",
        "healthStatus": "unknown",
        "failureReason": null,
        "status": "active",
        "isFirstParty": true,
        "capabilities": [
            "settlement-ledger",
            "cryptographic-auditing",
            "microservice-endpoints"
        ],
        "pricing": {
            "model": "paid",
            "costPerCall": 0.0048
        },
        "authentication": "x402 payment protocol (Header: x-payment-receipt; Token: USDC on Base Mainnet; Recipient: 0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C)",
        "rateLimit": "100 requests per 60 seconds per IP",
        "protocolDetails": "HTTP POST, 2MB JSON body limit, express-rate-limit, in-memory anti-replay receipt caching",
        "developer": {
            "address": "0xE57cB8C73c4000EA04ba0eb607228CbAec7f8e9C",
            "listingFeePaid": true,
            "listingFeeAmount": 0,
            "isFirstParty": true,
            "name": "2XceL AUS Fleet"
        }
    }
];
//# sourceMappingURL=discoveredTools.js.map