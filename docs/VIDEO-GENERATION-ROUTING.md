# Bikeztagram AI video generation routing

Bikeztagram AI supports two Runway video modes:

- **Direct Gen-4.5** — the default and safest path. No extra configuration is required beyond `RUNWAYML_API_SECRET`.
- **Runway Model Router** — optional. Set `RUNWAY_VIDEO_ROUTER_CONFIG_ID` to a saved Runway Model Router configuration. The router can optimize for quality, latency or cost and can automatically adopt eligible future models.

## Gemini-free safety

Bikeztagram AI must not use Gemini. A routed configuration must therefore exclude every Gemini model from its eligible pool.

The server performs a **non-billed dry run before a routed generation**, inspects the selected model, and refuses the request if the router selects a Gemini model. Completed tasks are also checked before output is accepted.

Recommended router configuration:

1. Create a Runway Model Router in the Runway Developer Portal.
2. Prefer a **deny list** that excludes all Gemini models, or an explicit allow list containing only approved non-Gemini video models.
3. Use separate configs for preview and final export if desired.
4. Set `RUNWAY_VIDEO_ROUTER_CONFIG_ID` in Vercel only after the config has been tested with dry runs.

Direct Gen-4.5 remains available even when the router is configured: a client request with `provider: "gen4.5"` bypasses routing.

The client reports the actual routed model in the generated media metadata so QA can see what provider/model really ran.
