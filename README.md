# OME MMT UI
<img width="1304" height="785" alt="Screenshot 1405-02-01 at 11 50 54" src="https://github.com/user-attachments/assets/bec0d219-da8a-48f6-967d-b0769dcc881b" />
<br/>
A browser-based market-making terminal for the **Order Matching Engine (OME)**. It automates high-frequency limit
order placement on the BTC/USDT pair and visualizes order book state and trade matches in real time.

## Overview

The built-in **Market Making Tool (MMT)** continuously generates paired buy/sell limit orders around a live mid-price
sourced directly from Binance's WebSocket feed. All parameters are tunable at runtime, making it useful for both
load-testing the matching engine and observing realistic order flow behavior.

Order book depth and matched trades are streamed to the UI over **SSE** from the OME HTTP gateway.

## Features

- **Live order book** — real-time bid/ask depth streamed via SSE
- **MMT engine** — automated buy/sell order placement with configurable parameters
- **Binance price sync** — mid-price tracks `btcusdt@miniTicker` with 24h change
- **Aggression control** — tune the ratio of passive (liquidity-adding) vs. aggressive (spread-crossing) orders
- **Auto-cancel** — stale resting orders are cancelled automatically after a configurable timeout
- **Flood mode** — instantly place 100 orders to stress-test the engine
- **Matched orders feed** — live trade history with running stats (count, volume)
- **SSE connection indicator** — live/reconnecting status shown in the header

## MMT Parameters

| Parameter           | Range         | Description                                                |
|---------------------|---------------|------------------------------------------------------------|
| Speed               | 1–20 orders/s | Tick rate of the MMT engine                                |
| Batch size          | 1–20          | Orders placed per tick (split evenly buy/sell)             |
| Spread (½ width)    | 0.05–2.00%    | Half-width of the bid/ask spread around mid                |
| Aggression          | 0–100%        | Share of orders that cross the spread to match immediately |
| Auto-cancel timeout | 5–60s         | Age at which resting MMT orders are cancelled              |

## Stack

- [Vue 3](https://vuejs.org/) + [Pinia](https://pinia.vuejs.org/) — UI and state management
- [Vite](https://vitejs.dev/) — dev server and build tool
- Binance WebSocket API (`wss://stream.binance.com`) — live BTC/USDT price feed
- OME HTTP Gateway — REST + SSE interface to the matching engine (gRPC proxy, runs on `:8080`)

## Getting Started

**Prerequisites:** Node.js 18+, and the OME HTTP gateway running on `localhost:8080`.

```bash
# Install dependencies and start the dev server
make dev
```

The UI is available at `http://localhost:5173`. All `/api` requests are proxied to `http://localhost:8080`.

## Available Commands

```bash
make dev      # Install deps and start the Vite dev server
make build    # Build for production (output: dist/)
make preview  # Serve the production build locally
make install  # Install dependencies only
make clean    # Remove dist/ and node_modules/
```

## Architecture

```
Browser
  └── Vue 3 App (localhost:5173)
        ├── SSE stream  ──────────────┐
        └── REST /api/*  ─────────────┤
                                      ▼
                          OME HTTP Gateway (:8080)
                                      │  gRPC
                                      ▼
                          Order Matching Engine (:8025)
```
