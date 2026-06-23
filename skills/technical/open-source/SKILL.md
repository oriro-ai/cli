---
watermark: ORIRO
name: open-source
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Open source development — licenses, contributing to open source, GitHub workflow,
  governance models, and building sustainable open source projects.
  Sources: OSI (opensource.org — free), GitHub guides (free), FOSS community norms.
---

# Open Source Development

## License types

### Permissive licenses (most free)

**MIT:** Do anything. Must keep copyright notice. Used by: React, Vue, Rails, jQuery.
**Apache 2.0:** Like MIT + explicit patent grant. Used by: Android, Kubernetes, TensorFlow.
**BSD 2-Clause:** Similar to MIT. Used by FreeBSD.

### Copyleft licenses (viral)

**GPL v2/v3:** Derived works must also be GPL. Used by: Linux kernel (v2), GCC, WordPress.
**LGPL:** Like GPL but allows linking from proprietary software. Used by Qt.
**AGPL:** GPL + covers SaaS deployments. Used by MongoDB (community), Nextcloud.

### Creative Commons (content, not code)

**CC-BY:** Attribution required. Most permissive for content.
**CC-BY-SA:** Share-alike. Derived works same license.
**CC0:** Public domain dedication. No restrictions whatsoever.

## Contributing to open source

### First contribution workflow

1. Fork the repo on GitHub.
2. Clone your fork: `git clone https://github.com/yourusername/project.git`
3. Create feature branch: `git checkout -b fix-typo-readme`
4. Make changes.
5. Commit: `git commit -m "fix: correct typo in README installation section"`
6. Push: `git push origin fix-typo-readme`
7. Open Pull Request on GitHub from your fork to upstream main.

### Commit message convention (Conventional Commits)

`type(scope): description`
Types: feat, fix, docs, style, refactor, test, chore.
Example: `feat(auth): add OAuth2 Google sign-in`

### Good first contributions

Documentation improvements, typo fixes, adding tests, fixing small bugs.
Look for: Issues labeled "good first issue" or "help wanted."

## Open source governance models

**BDFL:** Benevolent Dictator for Life. Python (Guido), Linux (Linus).
**Foundation governance:** Apache Software Foundation, Linux Foundation, CNCF.
**Company-backed:** React (Meta), Kubernetes (Google/CNCF).
**Consensus:** Most decisions by maintainer consensus. RFC process for big changes.

## Sustainable open source

Open Collective, GitHub Sponsors, OpenSSF for funding.
Dual licensing: Open source community + paid commercial license.
Open-core: Core free, enterprise features paid. GitLab, Mattermost model.

Sources: OSI (opensource.org — free), Choose A License (choosealicense.com — free),
GitHub Open Source Guides (free)
