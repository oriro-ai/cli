# @oriro/pixverse-provider

Official PixVerse video generation provider plugin for Oriro.

This plugin registers PixVerse as a `video_generate` provider for text-to-video and image-to-video workflows.

## Install

```bash
oriro plugins install @oriro/pixverse-provider
```

Restart the Gateway after installing or updating the plugin.

## Configure

Store your PixVerse API key in Oriro config or expose the supported environment variable to the Gateway. Then select PixVerse as a video generation provider.

Full setup and model/provider examples:

- https://docs.oriro.ai/providers/pixverse

## Package

- Plugin id: `pixverse`
- Package: `@oriro/pixverse-provider`
- Minimum Oriro host: `2026.5.26`
