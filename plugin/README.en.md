# Core Craft · cognition-core

A local-first cognition and identity core for QQ Agent.

`cognition-core` moves “who she is” out of a fixed persona card and into auditable, searchable, portable data structures. It is not a cloud memory service, and it is not a replacement QQ Agent client.

## What it solves

A traditional persona card injects personality, tone, life settings, and relationships on every turn. The result is usually:

- a bloated system prompt
- a gap between the written persona and actual behavior
- failure to recognize the same person across chats
- memory fragmented by chat

This project models experience instead:

```text
Identity Anchor   owner identity
Person            who someone is
Relationship      role, trust, boundaries, permissions
Event             append-only raw experience
Episode           a bounded episode
Cognition         long-term understanding
SelfModel         self-description
ActionBus         controlled actions
```

## Current capabilities

- Local JSONL storage, no cloud dependency
- Multi-user and multi-relationship isolation
- Cross-chat identity cards
- Budgeted recall
- Read-only SelfModel tool; never injected automatically
- Permission levels, time windows, daily/weekly limits, cooldowns
- Audited ActionBus
- QQ stickers and private messages
- Bilibili read-only search/video info
- Xiaoheihe community feed
- QQ Zone read and public post
- Read-only permission panel

## What it deliberately does not do

- It does not inject the SelfModel on every turn
- It does not automatically promote every exchange into Cognition
- It does not silently rewrite the SelfModel
- It does not copy group-chat content into public posts
- It does not provide cloud sync or telemetry

The current version records new dialogue events locally, but it does not automatically generate long-term cognition or automatically update the SelfModel.

## Install

1. Download the release package
2. Place `plugin/` in the QQ Agent plugins directory
3. Enable `cognition-core` in QQ Agent
4. Optionally apply `patch/patch-qqa-ui.mjs` for the top-bar panel
5. Bind the owner QQ number in settings
6. Restart QQ Agent so `adminId` and permissions take effect

A QQ Agent update may overwrite the top-bar patch.

## Privacy

By default there is:

```text
no upload
no telemetry
no third-party analytics
```

Data stays in:

```text
plugin-data/cognition-core/core/
```

Public data collection is voluntary, aggregate, and opt-in. The exporter only emits counts, categories, versions, and dates. It never exports chat text, QQ numbers, nicknames, group numbers, paths, cookies, or SelfModel text. Small cells are suppressed with k=5.

## Risks

- Local memory is sensitive data
- Group chats contain third-party content
- Public platform actions may be irreversible
- Plugins run with host privileges, not inside an OS sandbox
- Prompt injection, model mistakes, and platform API changes can cause errors

## Version

```text
0.20.0
```

## Tests

```text
node --test
tests 61
pass 61
fail 0
```

## Maintainer

```text
Sishui Weilai（联系方式见 SECURITY.md）
```

## License

See `LICENSE`.
