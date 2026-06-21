---
name: ai-ethics
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >



  AI ethics — bias, fairness, transparency, privacy, safety, responsible AI development, and AI governance.

  Sources: Technical documentation, public guidelines, industry best practices.
---

# AI Ethics

## Core principles

**Fairness:** AI systems should not discriminate based on race, gender, religion, disability, or other protected characteristics.
**Accountability:** Clear responsibility for AI system behavior. Humans must remain responsible for consequential AI decisions.
**Transparency:** Users should know when AI is making decisions affecting them and understand how.
**Privacy:** AI systems must handle personal data in accordance with privacy laws and ethical principles.
**Safety:** AI systems should behave as intended and avoid harmful outcomes.
**Human oversight:** High-stakes AI decisions should have meaningful human review.

## Bias in AI systems

### Types of bias

**Training data bias:** Model trained on historical data that reflects historical discrimination. Predicts past patterns → perpetuates them.
Example: Résumé screening model trained on past hires (mostly white males in tech) → learns to penalize female names, women's colleges.

**Measurement bias:** What you measure poorly reflects what you care about. Predictive policing: arrests ≠ crime (over-policed communities have more arrests → model sends more police → circular).

**Feedback loops:** Model predictions change the world in ways that reinforce the model's predictions.

**Representation bias:** Training data doesn't represent all users. Face recognition performs worse on darker skin tones when trained mostly on lighter skin images.

### Testing for fairness

**Demographic parity:** Positive prediction rate equal across groups.
**Equal opportunity:** True positive rate equal across groups (pass rates equal for qualified individuals).
**Predictive parity:** Precision equal across groups.
Note: These definitions are mathematically incompatible in most real-world scenarios.

**Fairness tools:** IBM AI Fairness 360 (open source), Google What-If Tool, Microsoft Fairlearn.

## Privacy in AI

**Training data:** Collecting training data must comply with GDPR/CCPA. Consent for specific use.
**Model memorization:** Large models can memorize and regurgitate training data (including PII). Differential privacy techniques reduce this risk.
**Inference from predictions:** Even anonymized predictions can reveal sensitive information through inference.
**Right to explanation (GDPR Article 22):** Automated decisions with significant effects on individuals → right to explanation and human review.

## Explainability / Interpretability

**Interpretable models:** Linear regression, decision trees — you can understand why they predict what they predict.
**Black-box models:** Deep learning, large ensembles — high performance but opaque.
**Post-hoc explanation tools:** LIME, SHAP — explain individual predictions from any model.
**When required:** High-stakes decisions (credit, hiring, bail, medical), regulatory compliance, debugging biased behavior.

## Responsible AI development

### Technical practices

- Curate training data carefully. Audit for representation.
- Evaluate model performance across demographic subgroups, not just overall.
- Test for adversarial inputs.
- Monitor production for distribution shift and bias drift.
- Document model cards (model capabilities, limitations, intended use, out-of-scope uses, evaluation results).

### Process practices

- Diverse development teams (different perspectives catch more problems).
- Ethical review before deployment for high-stakes applications.
- User research with affected communities.
- Incident response plan for when model causes harm.
- Ongoing monitoring, not just pre-deployment evaluation.

## AI safety

**Alignment:** AI systems pursuing the goals humans actually intend, not proximate goals that fail at scale.
Classic example: Maximize paperclips → convert all matter to paperclips (Bostrom).
Real examples: Social media optimizing engagement → optimizes for outrage. Ad systems optimizing clicks → fraud.

**Current concerns:**
Misinformation: Generative AI makes cheap creation of misleading content.
Deepfakes: Synthetic media eroding trust in authentic media.
Automation displacement: Economic impacts on workers.
Dual use: AI capabilities used for both beneficial and harmful purposes.

Sources: NIST AI Risk Management Framework (nist.gov/aiRMF — free), EU AI Act (eur-lex.europa.eu — free), Montreal Declaration for Responsible AI (free), ACM FAccT conference papers (many open access), Partnership on AI (partnershiponai.org — free)
