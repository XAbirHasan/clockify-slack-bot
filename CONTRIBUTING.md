# Contributing

Thanks for your interest in contributing to clockify-slack-bot!

## Getting started

1. Fork the repository and clone your fork.
2. Follow [SETUP.md](SETUP.md) to get a local dev environment running.
3. Create a branch for your change:
   ```bash
   git checkout -b my-feature
   ```

## Development

```bash
npm install
npm run dev        # start local Worker with wrangler
npm test           # run tests with vitest
```

## Submitting a pull request

- Keep changes focused — one concern per PR.
- Run `npm test` and make sure all tests pass before opening a PR.
- Write a clear PR description explaining what the change does and why.
- Commit messages should follow the format: `type: short description`
  - Examples: `fix: handle empty project list`, `feat: add undo command`, `security: rotate encryption scheme`

## Reporting issues

Open a GitHub issue with:
- What you expected to happen
- What actually happened
- Steps to reproduce

## License

By contributing you agree that your contributions will be licensed under the [MIT License](LICENSE).
