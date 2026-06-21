# Oriro Amazon Bedrock Provider

Official Oriro provider plugin for Amazon Bedrock. It adds Bedrock model discovery, text generation, embeddings, and guardrail-aware provider routing for agents that use AWS-hosted models.

Install from Oriro:

```bash
oriro plugin add @oriro/amazon-bedrock-provider
```

Configure AWS credentials and region through your normal Oriro credential/profile setup, then select Bedrock models with the `amazon-bedrock/...` provider prefix.
