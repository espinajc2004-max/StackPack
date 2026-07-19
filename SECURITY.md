# Security Policy

## Supported versions

Only the latest published version of StackPack receives security fixes.

## Reporting a vulnerability

Please report security issues privately via GitHub Security Advisories ("Report a vulnerability" on the repository's Security tab) rather than opening a public issue. Include reproduction steps and the affected version. You should receive a response within 7 days.

## Design notes relevant to security

- StackPack never executes shell strings; commands are run with an executable and an argument array, without `shell: true`.
- Presets are validated with a strict schema and cannot contain shell commands, executable code, lifecycle hooks, absolute paths, or credentials.
- Preset names are validated so they can never resolve outside the preset directory.
- All generated file paths are checked to remain inside the selected project root.
- StackPack stores no tokens, `.env` secret values, or npm credentials, and sends no telemetry.
