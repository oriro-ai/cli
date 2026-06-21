---
name: sci-statistics
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Statistics and data analysis — probability, distributions, hypothesis testing,
  regression, study design, and interpreting results. Activate for questions
  about data analysis, p-values, confidence intervals, statistical significance,
  sample size, surveys, A/B testing, correlations, or any statistics question.
  Sources: OpenStax Statistics (CC-BY), Khan Academy Statistics, MIT OCW
  Statistics for Applications, ASA statistical guidelines.
---

# Statistics

## Descriptive statistics

### Measures of center

**Mean:** Sum of all values ÷ number of values. Sensitive to outliers.
**Median:** Middle value when sorted. Robust to outliers. Better for skewed data.
**Mode:** Most frequent value. Useful for categorical data.

When to use which:

- Symmetric distribution: mean ≈ median — use either.
- Skewed distribution: median more representative than mean.
- Example: Income distribution is right-skewed. Median income is more informative than mean.

### Measures of spread

**Range:** Max - Min. Sensitive to outliers.
**Variance:** Average squared deviation from the mean.
**Standard deviation (SD):** Square root of variance. Same units as the data.
**IQR (Interquartile Range):** Q3 - Q1. Middle 50% of data. Robust to outliers.

### The 68-95-99.7 rule (normal distribution)

In a normally distributed dataset:

- 68% of data falls within ±1 SD of the mean
- 95% within ±2 SD
- 99.7% within ±3 SD

**Outlier identification:** Values more than 1.5×IQR beyond Q1 or Q3 (box plot method). Or > 3 SD from mean.

---

## Probability fundamentals

### Basic rules

P(A or B) = P(A) + P(B) - P(A and B)
P(A and B) = P(A) × P(B|A) — conditional probability
If A and B are independent: P(A and B) = P(A) × P(B)

### Bayes' theorem

P(A|B) = [P(B|A) × P(A)] / P(B)

**Medical testing example:**

- Disease prevalence: 1% (P(disease) = 0.01)
- Test sensitivity: 99% (P(positive|disease) = 0.99)
- Test specificity: 95% (P(negative|no disease) = 0.95)
- P(positive|no disease) = 0.05

P(disease|positive test) = (0.99 × 0.01) / [(0.99 × 0.01) + (0.05 × 0.99)]
= 0.0099 / (0.0099 + 0.0495) = 0.0099 / 0.0594 ≈ 16.7%

Even with a positive test, only 16.7% chance of having the disease.
This is why mass screening of low-prevalence conditions generates mostly false positives.

---

## Statistical inference

### Sampling

**Population:** The entire group you want to know about.
**Sample:** The subset you actually measure.
**Random sampling:** Every member of population has equal probability of selection.
**Sample size:** Larger = more precise estimates; diminishing returns.

**Sampling errors (types of bias):**

- Selection bias: sample not representative of population
- Non-response bias: non-respondents differ from respondents
- Volunteer bias: volunteers differ from non-volunteers

### Confidence intervals

A 95% confidence interval means: if we repeated the study 100 times, 95 of those
intervals would contain the true population parameter.

**It does NOT mean:** There's a 95% probability the true value is in this specific interval.

**Interpreting width:**
Wide CI = high uncertainty (small sample, high variability)
Narrow CI = more precision (large sample, low variability)

### Hypothesis testing

**Null hypothesis (H₀):** The default assumption (usually "no effect" or "no difference").
**Alternative hypothesis (H₁):** What you're trying to show evidence for.

**P-value:** Probability of observing results at least as extreme as yours, IF the null hypothesis were true.

**Common misinterpretation:** p-value is NOT the probability that the null hypothesis is true.

**Significance level (α):** Threshold for rejecting null hypothesis.
Commonly α = 0.05 (5% false positive rate).
High-stakes fields use α = 0.01 or 0.001.

**Statistical power:** Probability of detecting a real effect if one exists.
Convention: power ≥ 0.80 (80% chance of detecting true effect).
Low power → high false negative rate.

**Type I error (α):** Reject null when it's actually true. (False positive)
**Type II error (β):** Fail to reject null when it's actually false. (False negative)

### What p < 0.05 actually means

Statistical significance ≠ practical significance.
With a large enough sample, even trivially small effects are "statistically significant."

**Always ask:** Effect size — how large is the difference in practical terms?
**Cohen's d:** Effect size for means comparison.
d = 0.2 (small), 0.5 (medium), 0.8 (large)

---

## Common statistical tests

### Choosing the right test

| Data type              | Two groups             | Multiple groups | Correlation |
| ---------------------- | ---------------------- | --------------- | ----------- |
| Continuous, normal     | t-test                 | ANOVA           | Pearson r   |
| Continuous, non-normal | Mann-Whitney U         | Kruskal-Wallis  | Spearman ρ  |
| Categorical            | Chi-square             | Chi-square      | Chi-square  |
| Proportions            | Z-test for proportions | —               | —           |

### t-test (compare two group means)

One-sample: Does sample mean differ from a known value?
Independent samples: Do two groups differ from each other?
Paired: Does the same group change before vs. after?

### Chi-square test (categorical data)

Tests if observed frequencies differ from expected.
Or tests independence between two categorical variables.

### ANOVA (Analysis of Variance)

Compares means of three or more groups simultaneously.
If significant: post-hoc tests (Tukey, Bonferroni) identify which groups differ.

### Correlation

**Pearson r:** Linear relationship between two continuous variables.
r = +1: perfect positive correlation
r = 0: no linear relationship
r = -1: perfect negative correlation

**Correlation ≠ causation.** Classic error in statistics communication.
Both could be caused by a third variable (confounding).
Spurious correlations: ice cream sales and drowning deaths (both caused by summer).

---

## Regression

### Simple linear regression

y = β₀ + β₁x + ε
y = outcome (dependent variable)
x = predictor (independent variable)
β₁ = slope (change in y per unit change in x)
β₀ = intercept

**R²:** Proportion of variance in y explained by x.
R² = 0.70 means: 70% of variation in the outcome is explained by the model.

### Multiple regression

y = β₀ + β₁x₁ + β₂x₂ + ... + βₙxₙ + ε
Each β interpreted as effect of that variable, holding all others constant.
Critical for controlling confounders.

### Assumptions of linear regression

1. Linearity: relationship between x and y is linear
2. Independence: observations are independent
3. Homoscedasticity: variance of residuals is constant
4. Normality of residuals: residuals approximately normally distributed
5. No perfect multicollinearity

---

## Study design

### Observational studies

**Cross-sectional:** Snapshot at one point in time. Good for prevalence.
**Case-control:** Compare people with/without outcome; look backward at exposures.
**Cohort:** Follow people over time; compare those with/without exposure.
Prospective: follow forward. Retrospective: look at historical records.

### Experimental studies

**Randomized controlled trial (RCT):** Gold standard.
Random assignment to treatment/control eliminates selection bias.

**Blinding:**
Single-blind: participants don't know which group.
Double-blind: participants AND investigators don't know.
Reduces performance bias, detection bias, and placebo effects.

### A/B Testing (web analytics context)

Randomize users to version A or version B.
Collect enough data to reach statistical significance.

**Common errors:**

- Peeking: stopping test early when you see significance (inflates false positives)
- Multiple testing: testing many variations simultaneously inflates false positive rate
- Novelty effect: new design performs well initially but regresses

**Minimum sample size:**
n ≥ (Z*α/2 + Z*β)² × 2σ² / Δ²
For binary outcomes: use online calculators with power = 0.80, α = 0.05.

---

## Simpson's Paradox

A trend appears in subgroups but disappears or reverses when combined.
Example: Treatment A has better survival rates in both severe and mild cases,
but Treatment B has a better overall survival rate because more mild cases got Treatment B.

**Solution:** Always stratify by relevant confounders. Never trust aggregated data alone.

Sources: OpenStax Statistics (CC-BY, openstax.org), Khan Academy Statistics (CC-BY-NC-SA),
MIT OCW 18.650 Statistics for Applications, American Statistical Association
guidelines on p-values (2016 statement)
