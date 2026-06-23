---
watermark: ORIRO
name: sci-data-analysis
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >

  Scientific data analysis — descriptive statistics, visualization, common analytical errors, interpreting results, and communicating findings.





  Sources: OpenStax textbooks (CC-BY), Khan Academy, MIT OCW, NOAA, IPCC reports.
---

# Scientific Data Analysis

## Data types and appropriate analysis

**Continuous:** Can take any value (temperature, weight, time). Use mean, SD, t-tests, ANOVA, regression.
**Discrete:** Whole numbers only (counts of events). Use Poisson distribution, chi-square.
**Categorical/Nominal:** Named categories (blood type, country). Frequencies, chi-square, logistic regression.
**Ordinal:** Ordered categories (survey ratings). Median, non-parametric tests.

## Exploratory data analysis (EDA)

Before any formal analysis: Explore the data visually.
Check: Sample size, missing data, outliers, distribution shape, range of values.
**Look at your data.** Errors hide in unchecked datasets.

**Visualizations for exploration:**
Histogram: Distribution of one continuous variable.
Box plot: Median, quartiles, outliers. Compare distributions across groups.
Scatter plot: Relationship between two continuous variables.
Bar chart: Comparison of categorical groups.
Heatmap: Correlation matrix or 2D distribution.

## Common analytical errors

**Confounding:** Third variable causes both the observed "cause" and "effect."
Ice cream and drowning both increase in summer (confound = summer/heat).
Fix: Control for potential confounders; randomize if possible.

**Selection bias:** Sample not representative of target population.
Online surveys miss those without internet. Volunteer studies miss reluctant participants.
Effects can go any direction — can't predict direction of bias without knowing who's missing.

**Measurement error:** Systematic error (bias) vs. random error (noise).
Systematic: Thermostat always reads 2°C too high. Shifts results in one direction.
Random: Measurement fluctuates randomly. Averages out with large samples.

**Multiple comparisons:** Test 20 hypotheses → expect 1 false positive at α=0.05 just by chance.
Corrections: Bonferroni (divide α by number of tests), FDR control.

**Ecological fallacy:** Group-level associations don't apply to individuals.
Countries with higher chocolate consumption have more Nobel laureates. Doesn't mean eating chocolate makes you smarter.

**Reverse causation:** Direction of causality unclear.
"Depression linked to social media use" — does social media cause depression, or do depressed people use more social media?

## Data visualization principles

**Purpose before design:** What decision or understanding does this chart need to support?
**Data-ink ratio (Tufte):** Maximize proportion of ink used to display data vs. non-data. Remove chart junk.
**Titles:** State the conclusion, not just the variable name. "Revenue grew 40% after product launch" not "Monthly Revenue."
**Color:** Use sparingly. No more than 5-7 colors. Color-blind safe palettes (ColorBrewer).
**Scale:** Start continuous axes at meaningful points. Bar charts should start at zero (area encodes value). Line charts don't need to start at zero.
**Annotate:** Add context to unusual data points. Add trend lines where helpful.

## Communicating results

**The PICO framework for presenting findings:**
P — Population: Who was studied?
I — Intervention/Exposure: What was the factor of interest?
C — Comparison: What was the reference?
O — Outcome: What was measured?

**Effect size vs. statistical significance:** Always report both.
"The intervention reduced hospitalizations by 3% (relative risk 0.97, 95% CI 0.93-0.99, p=0.04)"
The absolute reduction (3%), CI (uncertainty), AND p-value all matter.

**Uncertainty communication:** Confidence intervals show a range, not false precision.
Avoid: "The true value is X." Better: "We estimate the value is X (95% CI: Y to Z)."

Sources: Tufte "The Visual Display of Quantitative Information" (principles),
OpenStax Statistics (CC-BY), Gelman & Hill Data Analysis (principles), ASA Statement on p-values
