# Contributing to holydot

This repository is a public instruction package for an existing dot, not an assistant runtime. Preserve that boundary and the pinned public-source attribution.

- Use Bun 1.4 via `mise.toml`. `package.json` scripts call mise tasks; keep actual task commands in mise to avoid divergent local and CI behavior.
- Keep OXC policy declarative in `.oxlintrc.json` and `.oxfmtrc.json`. Configure type-aware linting and type checking there. CLI operation switches such as format check are not substitutes for configuration.
- Write JSDoc for every public, exposed or exported function, type, interface, class, constant and member. Explain behavior, parameters, return values and relevant failure conditions. Keep TypeScript types in TypeScript rather than duplicating them in tags.
- Oxfmt formats JSDoc; native Oxlint JSDoc rules check supported tags. The documentation requirement above also applies where native lint does not detect a missing comment.
- Add positive and negative Bun tests for validator changes. Run `bun run check` before proposing publication. Do not label checks as passed if they were not run.
- Preserve unrelated changes. Open normal, non-draft pull requests proactively for authorized scoped work when verification supports confidence in functionality and quality. Verify PR state and head, disclose residual blockers, and keep merge/release/deployment authorization separate.
- Do not add CI monitoring services, review bots, account rules, secrets or a custom backend. The repository's own validation workflows are permitted; they do not monitor other projects.
- Use only public sources and original project material. Never publish private conversations, credentials or account-specific instructions.
