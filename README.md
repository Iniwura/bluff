# Bluff — AI Judgment Game on GenLayer Bradbury

Bluff is a claim-and-challenge game built on GenLayer Bradbury testnet. Players submit claims, challengers dispute them, and an AI validator determines the verdict — no human arbitration, no bias.

## How it works

1. **Submit a claim** — stake points on something you believe is true
2. **Challenge it** — other players can dispute any active claim
3. **AI decides** — GenLayer's AI consensus evaluates the evidence and returns a verdict
4. **Winner takes the pot** — the correct side splits the staked amount

## Tech

- **Intelligent Contract** — Python contract deployed on GenLayer Bradbury (Chain ID 4221)
- **Frontend** — React + Vite, deployed on Vercel
- **AI consensus** — `gl.eq_principle.prompt_non_comparative` with validate-only criteria for fast finality
- **Contract address** — `0x4813C10F67dcE366B47dfCcb43d2F8891d5Ccc0b`

## Local development

```bash
npm install
npm run dev
```

## Links

- Live app: [bluff-green.vercel.app](https://bluff-green.vercel.app)
- GenLayer Explorer: [explorer-bradbury.genlayer.com](https://explorer-bradbury.genlayer.com)
- GenLayer Docs: [docs.genlayer.com](https://docs.genlayer.com)
