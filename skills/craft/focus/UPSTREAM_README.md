# FOCUS — AI Agent Skill

**Four rules that prevent AI agents from producing fast, wrong answers.**

> "Being slow is correct. Being rushed is wrong."

---

## The Problem This Solves

AI agents are fast. Fast is dangerous.

Without a structured thinking protocol, an AI agent will:

- Answer in 10 seconds what requires 10 minutes of thought
- Fix symptoms instead of root causes
- Produce solutions with circular dependencies
- Jump to the next task before the current one is verified
- Miss the one detail that breaks everything

FOCUS enforces a four-gate protocol that no output can bypass.

---

## What It Does

FOCUS is a **Claude skill** (compatible with Claude Code, Claude.ai, and any
Claude-powered agent) that activates a mandatory reasoning sequence before any
suggestion, plan, or code reaches the user.

```
THINK → SIMPLIFY → SURGICAL → STAY-ON-GOAL → Output
```

Each gate is a binary check. Fail one gate → return to THINK and restart.

---

## The Four Rules

### 1. THINK

Plan before suggesting. Gap-analyse the plan. Produce three internal revisions.
Only the third revision reaches the user.

**Without THINK:**

> "Use PostgreSQL with tables for trades and positions."

**With THINK:**

> Full schema with bracket order relationships, idempotency keys, audit trail,
> P&L separation, instrument metadata, BRIN indexes, and range partitioning.
> Root cause of every design decision documented.

---

### 2. SIMPLIFY

The solution must travel in a straight line from input to output. No loops.
No circular dependencies. No branching mid-execution.

**Without SIMPLIFY:**

> "Check Firestore first. If empty, check IB. If IB times out, check in-memory.
> If in-memory is empty, retry in 5 minutes."

**With SIMPLIFY:**

> "Read IB portfolio() directly. Close every non-zero position. Record P&L. Done."

---

### 3. SURGICAL

One solution. The best solution available anywhere in the world.
Reference real-world superhuman examples. Fix root causes, not symptoms.
Map the complete decision tree. Identify every failure mode.

**Without SURGICAL:**

> "Add a filter to ignore stock tickers in the news scorer."
> _(Symptom fix — a different irrelevant headline breaks it tomorrow.)_

**With SURGICAL:**

> "Add instrument universe check at architecture level before any halt write.
> Only instruments <project> actually trades can trigger a halt. Zero patches needed."
> _(Root fix — architecturally impossible for an irrelevant headline to halt trading.)_

---

### 4. STAY-ON-GOAL

One task at a time. Complete it so thoroughly that no mistake is findable.
Do not fix unrelated problems inline. Verify the output. Verify the verification.

**Without STAY-ON-GOAL:**

> Developer fixes signal display and also restructures the force graph, changes
> the colour scheme, refactors the WebSocket handler. The colour change breaks
> dark mode. The original fix gets lost in the noise.

**With STAY-ON-GOAL:**

> Fix: change one word in one query. Verify with curl. Commit. Done.
> Related problems: written down for the next task. Not touched.

---

## Who This Is For

- **AI engineers** building Claude Code agents for production systems
- **Solo founders** using Claude to build and ship without a team
- **Anyone** where a wrong AI answer has real-world consequences:
  money, health, legal, security, production infrastructure

---

## Installation

### For Claude Code

Add to your project's `.claude/skills/` directory:

```bash
git clone https://github.com/<org>r1973-sudo/focus-skill.git
cp -r focus-skill/FOCUS .claude/skills/FOCUS
```

Then reference in your prompts:

```
/focus
```

Or load manually:

```
Use the FOCUS skill for this task.
```

### For Claude.ai Projects

1. Copy the contents of `FOCUS/SKILL.md`
2. Add to your project's custom instructions
3. Begin any high-stakes conversation with: "Apply FOCUS protocol"

### For Custom Agents

The FOCUS protocol is model-agnostic. Copy the four rules into any agent's
system prompt. The gate sequence works with any LLM capable of following
structured instructions.

---

## When to Activate FOCUS

| Situation                               | Intensity                           |
| --------------------------------------- | ----------------------------------- |
| Production code, real money, real users | Maximum — all 4 rules               |
| Architecture decisions                  | Maximum — all 4 rules               |
| Recurring bugs that keep coming back    | Maximum — all 4 rules               |
| Complex multi-step plans                | Maximum — all 4 rules               |
| "Make sure this is right"               | Maximum — all 4 rules               |
| General feature development             | Standard — all 4 rules, abbreviated |
| Quick factual questions                 | Minimum — THINK only                |

**Special rule:** If you feel confident the answer is obvious — activate maximum
intensity. Confidence is when mistakes most often happen.

---

## Pause Gates

FOCUS includes explicit pause conditions — moments where the protocol **stops**
and restarts from THINK:

- Fewer than 3 gaps identified in gap analysis → restart
- Suggestion-2 looks like Suggestion-1 → restart
- Solution has loops or circular dependencies → restart
- Root cause not identified (only symptom) → restart
- Any failure mode has no detection mechanism → restart
- Output scope grew beyond the stated goal → reset

---

## Real-World Reference Points

FOCUS borrows from humans who achieved superhuman outcomes:

| Person               | Achievement                                     | FOCUS principle                          |
| -------------------- | ----------------------------------------------- | ---------------------------------------- |
| Atul Gawande         | Reduced surgical mortality 47% with a checklist | Pre-execution verification               |
| Chesley Sullenberger | Landed 155 people on the Hudson in 208 seconds  | Preparation enables impossible execution |
| Paul Singer          | 47 years without a losing year                  | Paranoid failure analysis is safety      |
| SpaceX               | Reusable rockets — considered impossible        | First principles beat convention         |

Ask before outputting: _"Would Paul Singer sign off on this risk analysis?"_

---

## Contributing

FOCUS is open source under the MIT licence.

Contributions welcome:

- New BEFORE/AFTER examples from real domains
- Domain-specific extensions (medical, legal, security, finance)
- Translations
- Integration guides for other AI frameworks (LangChain, AutoGPT, CrewAI, Goose)

Open an issue or submit a pull request.

---

## Licence

MIT — use it, fork it, extend it, ship it.

---

## Author

Built by [<user> R](https://github.com/<org>r1973-sudo) while building
three parallel ventures using Claude as the primary engineering tool.
FOCUS emerged from the real cost of fast, wrong AI answers in production
trading systems and fintech platforms.

---

_"The goal is not to be fast. The goal is to be right the first time."_
