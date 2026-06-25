# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from genlayer import *


class Bluff(gl.Contract):
    """
    Bluff — on-chain AI judgment game.
    Post a claim. Others bet TRUE or FALSE on the AI's verdict.
    AI resolves everything. No human referee needed.
    Upgraded: TreeMap storage, DynArray for claim iteration,
              validate-only criteria.
    """

    claims:    TreeMap[str, str]   # claim_id  -> json(claim)
    bets:      TreeMap[str, str]   # claim_id  -> json({addr: {verdict, amount}})
    points:    TreeMap[str, str]   # address   -> points (str)
    claimed:   TreeMap[str, str]   # address   -> "true"
    usernames: TreeMap[str, str]   # address   -> username
    rev_users: TreeMap[str, str]   # name_lower -> address
    claim_ids: DynArray[str]       # ordered list of claim IDs for iteration
    claim_count: u64
    owner:     str

    MIN_BET   = 10
    MIN_STAKE = 20
    STARTER_PTS = 500

    def __init__(self):
        self.owner       = str(gl.message.sender_address).lower().strip()
        self.claim_count = u64(0)

    # ── Helpers ──────────────────────────────────────────────
    def _addr(self) -> str: return str(gl.message.sender_address).lower().strip()

    def _get_pts(self, addr: str) -> int:
        return int(self.points.get(addr, "0"))

    def _set_pts(self, addr: str, val: int):
        self.points[addr] = str(val)

    def _add_pts(self, addr: str, amount: int):
        self._set_pts(addr, self._get_pts(addr) + amount)

    def _deduct_pts(self, addr: str, amount: int):
        bal = self._get_pts(addr)
        if bal < amount:
            raise Exception(f"Insufficient points (have {bal}, need {amount})")
        self._set_pts(addr, bal - amount)

    def _get_claim(self, cid: str) -> dict:
        raw = self.claims.get(cid, None)
        if raw is None:
            raise Exception("Claim not found")
        return json.loads(raw)

    def _save_claim(self, cid: str, c: dict):
        self.claims[cid] = json.dumps(c)

    def _get_bets(self, cid: str) -> dict:
        raw = self.bets.get(cid, None)
        return json.loads(raw) if raw else {}

    def _save_bets(self, cid: str, b: dict):
        self.bets[cid] = json.dumps(b)

    # ── Views ─────────────────────────────────────────────────
        root = gl.storage.Root.get()
        root.upgraders.get().append(gl.message.sender_address)
    @gl.public.view
    def get_claim(self, claim_id: int) -> str:
        raw = self.claims.get(str(claim_id), None)
        return "NOT_FOUND" if raw is None else raw

    @gl.public.view
    def get_all_claims(self) -> str:
        total = len(self.claim_ids)
        if total == 0: return "[]"
        result = []
        for i in range(total):
            cid = self.claim_ids[i]
            raw = self.claims.get(cid, None)
            if raw is None: continue
            c = json.loads(raw)
            cb = self._get_bets(cid)
            c["true_pool"]  = sum(b["amount"] for b in cb.values() if b["verdict"] == "TRUE")
            c["false_pool"] = sum(b["amount"] for b in cb.values() if b["verdict"] == "FALSE")
            c["bet_count"]  = len(cb)
            result.append(c)
        return json.dumps(result)

    @gl.public.view
    def get_my_bets(self, address: str) -> str:
        addr   = address.lower().strip()
        result = []
        for i in range(len(self.claim_ids)):
            cid = self.claim_ids[i]
            cb  = self._get_bets(cid)
            if addr not in cb: continue
            b   = cb[addr]
            raw = self.claims.get(cid, None)
            c   = json.loads(raw) if raw else {}
            result.append({
                "claim_id":   int(cid),
                "text":       c.get("text", ""),
                "verdict":    b["verdict"],
                "amount":     b["amount"],
                "status":     c.get("status", "OPEN"),
                "ai_verdict": c.get("ai_verdict", ""),
                "won": (c.get("status") == "RESOLVED" and
                        b["verdict"] == c.get("ai_verdict", "")),
            })
        return json.dumps(result)

    @gl.public.view
    def get_points(self, address: str) -> str:
        addr = address.lower().strip()
        return json.dumps({
            "balance": self._get_pts(addr),
            "claimed": self.claimed.get(addr, None) is not None,
        })

    @gl.public.view
    def get_my_stats(self, address: str) -> str:
        addr = address.lower().strip()
        wins = losses = total = 0
        for i in range(len(self.claim_ids)):
            cid = self.claim_ids[i]
            cb  = self._get_bets(cid)
            if addr not in cb: continue
            total += 1
            raw = self.claims.get(cid, None)
            c   = json.loads(raw) if raw else {}
            if c.get("status") == "RESOLVED":
                if cb[addr]["verdict"] == c.get("ai_verdict", ""):
                    wins += 1
                else:
                    losses += 1
        return json.dumps({"wins": wins, "losses": losses, "total": total,
                           "balance": self._get_pts(addr)})

    @gl.public.view
    def get_username(self, address: str) -> str:
        return self.usernames.get(address.lower().strip(), "")

    @gl.public.view
    def check_username(self, name: str) -> str:
        return "TAKEN" if self.rev_users.get(name.strip().lower(), None) is not None else "AVAILABLE"

    @gl.public.view
    def get_owner(self) -> str:
        return self.owner

    # ── Writes ────────────────────────────────────────────────

    @gl.public.write
    def upgrade(self, new_code: bytes) -> None:
        """Push a new version without changing the contract address. Deployer only."""
        root = gl.storage.Root.get()
        code = root.code.get()
        code.truncate()
        code.extend(new_code)

    @gl.public.write
    def claim_points(self):
        caller = self._addr()
        if self.claimed.get(caller, None) is not None:
            raise Exception("Already claimed starter points")
        self.claimed[caller] = "true"
        self._add_pts(caller, self.STARTER_PTS)

    @gl.public.write
    def set_username(self, name: str):
        name   = name.strip()
        caller = self._addr()
        if not name or len(name) < 2 or len(name) > 20:
            raise Exception("Username must be 2-20 characters")
        for ch in name:
            if not (ch.isalnum() or ch in ("-", "_")):
                raise Exception("Letters, numbers, hyphens, underscores only")
        key           = name.lower()
        existing_addr = self.rev_users.get(key, "")
        if existing_addr and existing_addr != caller:
            raise Exception(f"Username '{name}' is already taken")
        # Remove old username
        old_name = self.usernames.get(caller, "")
        if old_name:
            try: del self.rev_users[old_name.lower()]
            except: pass
        self.usernames[caller] = name
        self.rev_users[key]    = caller

    @gl.public.write
    def post_claim(self, text: str, stake: int):
        """Post a claim and stake points on it."""
        text   = text.strip()
        caller = self._addr()
        if not text:
            raise Exception("Claim text required")
        if len(text) > 280:
            raise Exception("Keep it under 280 characters")
        if stake < self.MIN_STAKE:
            raise Exception(f"Minimum stake is {self.MIN_STAKE} points")
        self._deduct_pts(caller, stake)
        cid = str(int(self.claim_count))
        self._save_claim(cid, {
            "id":         int(cid),
            "text":       text,
            "poster":     caller,
            "stake":      stake,
            "status":     "OPEN",
            "ai_verdict": "",
            "ai_reason":  "",
        })
        self.claim_ids.append(cid)
        self.claim_count = u64(int(cid) + 1)

    @gl.public.write
    def place_bet(self, claim_id: int, verdict: str, amount: int):
        """Bet TRUE or FALSE on how the AI will rule."""
        verdict = verdict.upper().strip()
        caller  = self._addr()
        if verdict not in ("TRUE", "FALSE"):
            raise Exception("verdict must be TRUE or FALSE")
        if amount < self.MIN_BET:
            raise Exception(f"Minimum bet is {self.MIN_BET} points")
        cid = str(claim_id)
        c   = self._get_claim(cid)
        if c["status"] != "OPEN":
            raise Exception("This claim is already resolved")
        if c["poster"] == caller:
            raise Exception("You can't bet on your own claim")
        cb = self._get_bets(cid)
        if caller in cb:
            raise Exception("You already bet on this claim")
        self._deduct_pts(caller, amount)
        cb[caller] = {"verdict": verdict, "amount": amount}
        self._save_bets(cid, cb)

    @gl.public.write
    def resolve(self, claim_id: int):
        """
        Permissionless — anyone triggers resolution.
        AI reads the claim, returns TRUE/FALSE + reasoning.
        Winners split the losing pool. Poster bonus if AI says TRUE.
        """
        cid = str(claim_id)
        c   = self._get_claim(cid)
        if c["status"] != "OPEN":
            raise Exception("Already resolved")

        text = c["text"]

        def get_verdict():
            prompt = (
                "You are an impartial AI fact-checker and judge.\n\n"
                "CLAIM: \"" + text + "\"\n\n"
                "Evaluate this claim carefully.\n"
                "Reply with ONLY this exact format:\n"
                "VERDICT: TRUE\nREASON: <one sentence explanation>\n\n"
                "or\n\n"
                "VERDICT: FALSE\nREASON: <one sentence explanation>\n\n"
                "Nothing else."
            )
            raw     = str(gl.nondet.exec_prompt(prompt)).strip()
            verdict = "FALSE"
            reason  = "Could not determine"
            for line in raw.split("\n"):
                if line.upper().startswith("VERDICT:"):
                    v = line.split(":", 1)[1].strip().upper()
                    if v in ("TRUE", "FALSE"):
                        verdict = v
                elif line.upper().startswith("REASON:"):
                    reason = line.split(":", 1)[1].strip()[:200]
            return json.dumps({"verdict": verdict, "reason": reason}, sort_keys=True)

        raw = gl.eq_principle.prompt_non_comparative(
            get_verdict,
            task="Evaluate a claim as TRUE or FALSE with a one-sentence reason.",
            criteria=(
                "Validate format only - do NOT re-evaluate the claim. "
                "Accept if: (1) valid JSON, (2) 'verdict' is exactly TRUE or FALSE, "
                "(3) 'reason' is a non-empty string under 200 chars."
            ),
        )

        try:
            result  = json.loads(str(raw))
            verdict = result.get("verdict", "FALSE")
            reason  = result.get("reason", "")
            if verdict not in ("TRUE", "FALSE"):
                verdict = "FALSE"
        except Exception:
            verdict = "FALSE"
            reason  = "AI could not evaluate the claim"

        # ── Payout ────────────────────────────────────────────
        cb         = self._get_bets(cid)
        true_pool  = sum(b["amount"] for b in cb.values() if b["verdict"] == "TRUE")
        false_pool = sum(b["amount"] for b in cb.values() if b["verdict"] == "FALSE")
        total_pool = true_pool + false_pool
        winning_pool = true_pool if verdict == "TRUE" else false_pool
        losing_pool  = false_pool if verdict == "TRUE" else true_pool
        payouts = {}

        if winning_pool > 0:
            for addr, b in cb.items():
                if b["verdict"] == verdict:
                    share  = int(b["amount"] / winning_pool * losing_pool)
                    payout = b["amount"] + share
                    payouts[addr] = payout
                    self._add_pts(addr, payout)

        if verdict == "TRUE" and total_pool > 0:
            bonus = max(1, int(total_pool * 0.1))
            payouts[c["poster"]] = payouts.get(c["poster"], 0) + bonus
            self._add_pts(c["poster"], bonus)

        c["status"]     = "RESOLVED"
        c["ai_verdict"] = verdict
        c["ai_reason"]  = reason
        c["true_pool"]  = true_pool
        c["false_pool"] = false_pool
        c["bet_count"]  = len(cb)
        c["payouts"]    = payouts
        self._save_claim(cid, c)
