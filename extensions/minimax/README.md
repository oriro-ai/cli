# MiniMax (Oriro plugin)

Bundled MiniMax plugin for both:

- API-key provider setup (`minimax`)
- Token Plan OAuth setup (`minimax-portal`)

## Enable

```bash
oriro plugins enable minimax
```

Restart the Gateway after enabling.

```bash
oriro gateway restart
```

## Authenticate

OAuth:

```bash
oriro models auth login --provider minimax-portal --set-default
```

API key:

```bash
oriro setup --wizard --auth-choice minimax-global-api
```

## Notes

- MiniMax OAuth uses a user-code login flow.
- OAuth currently targets the Token Plan path.
