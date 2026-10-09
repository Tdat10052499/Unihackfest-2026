# ned-wallet

Expo SDK 57 phone app for N.E.D: No Empty Deals (web first, Android via EAS). The folder keeps its old name.

- Install, test, run, deploy and environment variables: [root README](../README.md#build-and-test)
- Architecture, folder map and data flow: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Current product and build plan: [`../docs/09-milestone-lock/`](../docs/09-milestone-lock/README.md)

```bash
pnpm install
cp .env.example .env   # fill in; EXPO_PUBLIC_* values are public
npm test               # unit tests
npm run web            # http://localhost:8081
```
