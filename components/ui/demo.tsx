"use client"

import * as React from "react"
import TumbleDeckShowcase, { type TumbleCard } from "./tumble-deck-showcase"

// Curated tool preview cards representing AIPages autonomous agent services
// with real visual previews and high-contrast Unsplash / Google Flow backdrops
const toolCards: TumbleCard[] = [
  {
    title: "Schema Sanitizer",
    namespace: "net.2xcel.aus.schema-sanitizer",
    badge: "AUS OFFICIAL",
    price: "0.00 USDT",
    alt: "Schema Sanitizer - JSON Input Sanitization & XSS Stripper",
    src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Financial Audit",
    namespace: "net.2xcel.aus.financial-audit",
    badge: "AUS OFFICIAL",
    price: "0.001 USDT",
    alt: "Financial Audit - Double-Entry Ledger Reconciliation",
    src: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Verification Oracle",
    namespace: "net.2xcel.aus.verification-oracle",
    badge: "CRYPTOGRAPHIC",
    price: "0.001 USDT",
    alt: "Verification Oracle - SHA-256 State Attestation",
    src: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Geospatial Boundary Verifier",
    namespace: "net.2xcel.aus.geospatial-verifier",
    badge: "AUS OFFICIAL",
    price: "0.0005 USDT",
    alt: "Geospatial Boundary Verifier - Polygon Geo-fencing & Haversine",
    src: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "PII Masking & Redactor",
    namespace: "net.2xcel.aus.pii-redactor",
    badge: "COMPLIANCE",
    price: "0.00 USDT",
    alt: "PII Redactor - HIPAA and GDPR Compliant Data Masking",
    src: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "JWT Key Inspector",
    namespace: "net.2xcel.aus.jwt-inspector",
    badge: "SECURITY",
    price: "0.00 USDT",
    alt: "JWT Key Inspector - Signature Audit & Expiry Validation",
    src: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Decentralized Escrow Settler",
    namespace: "net.2xcel.aus.escrow-settler",
    badge: "BASE MAINNET",
    price: "0.002 USDT",
    alt: "Decentralized Escrow Settler - Base Mainnet Milestone Payments",
    src: "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Stealth Web Scraper",
    namespace: "net.2xcel.aus.agent-scraper",
    badge: "INTELLIGENCE",
    price: "0.001 USDT",
    alt: "Stealth Web Scraper - Browser Automation for Autonomous Agents",
    src: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
  },
]

export default function Demo() {
  return (
    <div className="relative min-h-screen w-full bg-[#040507] text-white flex flex-col items-center justify-center p-4">
      <div className="absolute top-8 text-center z-10 pointer-events-none">
        <span className="text-xs font-mono tracking-widest text-emerald-400 uppercase bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-full">
          AIPages · 3D Tumble Rolodex
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-white mt-3">
          Autonomous Agent Tool Deck
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
          Scroll, drag or use arrow keys to scrub through the 50 registered agent tools.
        </p>
      </div>

      <div className="w-full max-w-5xl h-[70vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40">
        <TumbleDeckShowcase
          cards={toolCards}
          height="100%"
          aspect={1.85}
          scrollPerCard={200}
          depth={5}
          onCardClick={(card) => {
            if (card.namespace) {
              window.location.href = `/tool/${card.namespace}`
            }
          }}
        />
      </div>
    </div>
  )
}
