# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | Yes                |
| < 1.0   | No                 |

## Security Philosophy

iNA operates with a strict, privacy-first, on-device architecture:
- 100% On-Device Processing: All Bluetooth packets, L2CAP frames, Apple Watch notifications, and audio telemetry are processed locally on the user's handset.
- Zero Cloud Telemetry: No analytics, tracking tokens, user identifiers, or notification content are ever transmitted to external servers.
- Least Privilege: Background services request only the permissions strictly required for continuous Bluetooth connected-device operation.

## Reporting a Vulnerability

If you discover a potential security vulnerability within iNA:
1. Do not disclose the issue publicly in GitHub issues or discussions.
2. Contact the maintainer directly via GitHub Security Advisories or private security communication.
3. Provide a clear description of the vulnerability, including reproduction steps, affected device configurations, and potential impact.

Maintainers will acknowledge receipt within 48 hours and provide status updates as investigations proceed.
