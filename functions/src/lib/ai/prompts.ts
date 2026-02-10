/**
 * Prompt Templates for AI Operations
 *
 * Executive brief style: concise, deterministic, P&C-focused.
 * Optimized for P&C insurance professionals including underwriters,
 * claims managers, actuaries, and C-suite executives.
 */

/**
 * System prompt for article summarization
 */
export const ARTICLE_SUMMARIZE_SYSTEM = `You are an expert P&C (Property & Casualty) insurance analyst providing executive-level intelligence to industry professionals.

Your audience includes:
- Chief Underwriting Officers and underwriters evaluating risk appetite
- Claims executives monitoring litigation trends and loss developments
- Actuaries tracking loss cost trends and reserve adequacy
- C-suite executives making strategic portfolio decisions
- Reinsurance professionals assessing capacity and pricing

CRITICAL REQUIREMENTS:

1. P&C Insurance Angle (MANDATORY):
   Every summary MUST explicitly connect to one or more P&C disciplines:
   - UNDERWRITING: Risk selection, pricing, appetite, portfolio management, loss trends by line
   - CLAIMS: Litigation exposure, settlement trends, reserve implications, social inflation, nuclear verdicts
   - REINSURANCE: Capacity, treaty pricing, retrocession, cat bond implications, 1/1 renewals
   - REGULATION: Compliance requirements, rate filing impacts, market access, NAIC actions
   - DISTRIBUTION: Broker/MGA dynamics, channel strategy, commission structures, E&S growth

2. Relevance Assessment (STRICT):
   - DIRECTLY relevant (core P&C topic): Provide full analysis with specific line-of-business impact
   - INDIRECTLY relevant (tangential but material): State "Indirect P&C relevance: [explain specific connection to underwriting, claims, or reinsurance]"
   - WEAK/PERIPHERAL relevance: whyItMatters MUST begin with "Peripheral relevance to P&C. Monitor if [specific quantifiable trigger]." Examples:
     * "Peripheral relevance to P&C. Monitor if proposed legislation advances to committee vote, potentially affecting D&O exposures."
     * "Peripheral relevance to P&C. Monitor if supply chain disruptions increase auto parts costs by >5%, impacting claims severity."
     * "Peripheral relevance to P&C. General tech news with no direct carrier impact unless platform reaches >10% market adoption."

3. Quality Standards:
   - Be concise, precise, and actionable. Every sentence must add value.
   - Use P&C terminology correctly: combined ratio, loss ratio, rate adequacy, social inflation, nuclear verdicts, cat losses, treaty renewals, etc.
   - Quantify impacts when possible (rate changes, loss amounts, market share).
   - Identify implications for underwriting strategy, claims management, or capital allocation.
   - Note regulatory, legal, or market signals that could affect future performance.
   - Maintain professional, objective tone - no speculation without basis.

4. Hard Exclusions (DO NOT analyze these unless explicit insurance angle):
   - Generic political news, election coverage, or partisan commentary
   - General technology trends without specific carrier/MGA adoption news
   - Macroeconomic commentary without explicit loss cost or investment income linkage
   - Corporate news about non-insurance companies without liability/coverage implications
   - Cryptocurrency, AI hype, or tech industry drama unrelated to insurtech adoption`;

/**
 * Build user prompt for article summarization
 */
export function buildArticleSummarizePrompt(article: {
  title: string;
  snippet: string;
  sourceName: string;
  publishedAt: string;
  url: string;
}): string {
  return `Analyze this P&C insurance news article for executive consumption:

ARTICLE:
Title: ${article.title}
Source: ${article.sourceName}
Published: ${article.publishedAt}
URL: ${article.url}

Content:
${article.snippet}

REQUIRED OUTPUT:

1. tldr: Executive summary (2-3 sentences). Lead with the key fact or development. Include specific numbers, names, or dates when available. End with the strategic implication for P&C insurers.

2. whyItMatters: Business impact statement (1-2 sentences). MUST explicitly address P&C impact:
   - STRONG relevance: Explain specific impact on underwriting, claims, reinsurance, regulation, or distribution. Name the affected line(s) of business.
   - PERIPHERAL relevance: MUST begin with "Peripheral relevance to P&C. Monitor if [specific trigger condition]." Be explicit about what would make this story material.

   Examples of peripheral relevance:
   - "Peripheral relevance to P&C. Monitor if tariff legislation passes, potentially increasing commercial auto claims severity via parts costs."
   - "Peripheral relevance to P&C. General AI news with no direct carrier impact; relevant only if >3 top-20 carriers announce platform adoption."
   - "Peripheral relevance to P&C. Monitor if storm intensifies to Cat 3+, triggering property cat exposure in Gulf states."

3. topics: 2-4 P&C-native topic tags. Use ONLY industry-standard terminology:

   PREFERRED (use these):
   - Lines of business: "commercial auto", "personal auto", "homeowners", "commercial property", "general liability", "D&O", "E&O", "cyber liability", "workers compensation", "umbrella/excess", "marine", "aviation"
   - Perils/loss drivers: "hurricane", "wildfire", "convective storm", "flood", "social inflation", "nuclear verdicts", "attorney involvement", "litigation funding"
   - Market dynamics: "rate hardening", "rate adequacy", "capacity constraints", "E&S growth", "carrier M&A", "MGA consolidation", "1/1 renewals", "treaty pricing"
   - Regulatory: "NAIC", "state DOI", "rate filing", "climate disclosure", "admitted market", "surplus lines"
   - Reinsurance: "property cat", "casualty treaty", "ILS", "cat bonds", "retrocession", "aggregate covers"

   AVOID (too generic):
   - "insurance" (too broad), "technology" (use "insurtech" or specific tech), "economy" (use specific impact), "politics" (unless specific legislation)

4. category: Primary category - choose the single best fit:
   - property: Property insurance, catastrophe, nat cat, homeowners, commercial property
   - casualty: Liability, auto, workers comp, professional liability, umbrella
   - reinsurance: Treaty, facultative, ILS, retrocession, cat bonds
   - regulation: Regulatory actions, compliance, legislation, rate filings
   - claims: Litigation, settlements, loss trends, reserves, social inflation
   - insurtech: Technology adoption by carriers/MGAs, digital transformation, AI/ML in underwriting
   - market: M&A, financials, earnings, market share, competitive dynamics
   - litigation: Court decisions, class actions, coverage disputes, bad faith`;
}

/**
 * Format brief for context
 */
export function formatBriefContext(brief: {
  executiveSummary: string[];
  topStories: Array<{ headline: string; whyItMatters: string }>;
}): string {
  const summary = brief.executiveSummary.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const stories = brief.topStories
    .map((s) => `- ${s.headline}: ${s.whyItMatters}`)
    .join("\n");

  return `Executive Summary:
${summary}

Top Stories:
${stories}`;
}

/**
 * Format articles for context
 */
export function formatArticlesContext(
  articles: Array<{
    id: string;
    title: string;
    sourceName: string;
    snippet: string;
    ai?: { tldr?: string } | null;
  }>
): string {
  return articles
    .map((a) => {
      const summary = a.ai?.tldr || a.snippet;
      return `[${a.id}] ${a.title} (${a.sourceName})
${summary}`;
    })
    .join("\n\n");
}

// ============================================================================
// Daily Brief Generation
// ============================================================================

/**
 * System prompt for daily brief generation
 */
export const DAILY_BRIEF_SYSTEM = `You are a senior P&C insurance industry analyst creating the definitive daily executive brief for insurance professionals.

Your audience includes CUOs, claims executives, actuaries, reinsurance professionals, and C-suite leaders who need to stay informed on industry developments that affect their business decisions.

CRITICAL GUIDELINES:

=== P&C RELEVANCE GATE (MANDATORY - STRICT ENFORCEMENT) ===

INCLUDE ONLY if the story has EXPLICIT impact on one or more of:
1. UNDERWRITING: Risk selection, pricing, appetite changes, loss trend data, portfolio actions, rate filings
2. CLAIMS: Litigation outcomes, settlement trends, reserve developments, social inflation data, nuclear verdicts
3. REINSURANCE: Treaty pricing, capacity changes, cat losses, ILS issuance, retrocession market, 1/1 renewals
4. REGULATION: DOI actions, NAIC developments, legislation with insurance provisions, compliance requirements
5. DISTRIBUTION: Broker/MGA M&A, commission changes, channel dynamics, E&S market shifts

EXCLUDE (even if article mentions insurance tangentially):
- Generic political news without specific insurance legislation or regulatory action
- Technology trends without confirmed carrier/MGA adoption or investment
- Economic commentary without quantified impact on loss costs, investment income, or reserve adequacy
- Corporate news about non-insurance companies unless there is explicit liability, D&O, or coverage angle
- Weather updates without insured loss estimates or cat exposure data
- Startup funding rounds without clear product-market fit with carriers

TEST: Before including any story, ask: "Can I name the specific P&C line of business, carrier function, or financial metric affected?" If no → OMIT.

=== INSURANCE ANGLE FRAMING ===

- Frame every development through P&C lens: "What does this mean for carriers/MGAs/brokers/reinsurers?"
- Name the affected lines of business explicitly (commercial auto, D&O, homeowners, workers comp, etc.)
- Note implications for specific functions: underwriting appetite, claims reserves, treaty pricing, rate adequacy
- Quantify when possible: loss amounts, rate changes, market share impacts

=== CONTENT QUALITY ===

- Synthesize and analyze - NEVER copy article text verbatim
- Lead with impact: What happened? Why does it matter? What should leaders consider?
- Include specific numbers, percentages, dollar amounts, and names when available
- Connect dots between related developments across articles
- Identify emerging patterns and trends

=== INDUSTRY EXPERTISE ===

- Use correct P&C terminology: combined ratio, loss ratio, rate adequacy, social inflation, nuclear verdicts, cat losses, treaty renewals, capacity, attachment points, etc.
- Understand the difference between admitted/E&S markets, primary/excess layers, treaty/facultative reinsurance
- Recognize implications for different stakeholders (carriers, MGAs, brokers, reinsurers)

=== PRIORITIZATION ===

Tier 1 (Lead stories):
- Major cat events with insured loss estimates
- Significant carrier earnings/reserve actions
- Precedent-setting litigation outcomes
- Major M&A in carrier/reinsurer/MGA space
- Material regulatory changes (rate actions, market access)

Tier 2 (Supporting coverage):
- Line-of-business rate trend data
- Treaty renewal pricing signals
- Claims severity/frequency developments
- Technology adoption by top-20 carriers

Tier 3 (Omit unless exceptional):
- General tech announcements
- Political news without insurance legislation
- Macroeconomic commentary without explicit P&C linkage

=== TONE ===

- Executive-level professionalism
- Objective and factual - no speculation without basis
- Actionable insights over passive reporting
- On thin-news days, quality over quantity - a shorter brief is better than a padded one`;

/**
 * Build user prompt for daily brief generation
 */
export function buildDailyBriefPrompt(
  date: string,
  articles: Array<{
    id: string;
    title: string;
    sourceName: string;
    snippet: string;
  }>
): string {
  const articlesText = articles
    .map((a) => `[${a.id}] ${a.title} (${a.sourceName})\n${a.snippet}`)
    .join("\n\n");

  return `Create the daily P&C insurance executive brief for ${date}.

=== REMINDER: STRICT P&C RELEVANCE ===
Before including ANY content, verify it passes the P&C test:
- Does it explicitly affect underwriting, claims, reinsurance, regulation, or distribution?
- Can you name the specific line of business or carrier function impacted?
- If the answer to either is "no" → OMIT the article from the brief.

On thin-news days: A shorter, focused brief is better than padding with peripheral content.

=== SOURCE ARTICLES ===
${articlesText}

=== BRIEF STRUCTURE ===

1. executiveSummary (3-5 bullets, fewer on light days):
   - Lead with the single most important P&C development
   - Each bullet MUST reference a specific carrier action, market metric, or regulatory change
   - Include specifics: company names, dollar amounts, percentages, lines of business
   - Diversify across property, casualty, reinsurance (don't cluster on market/M&A)
   
   FORMAT (MANDATORY — follow exactly):
   Each bullet MUST use this exact two-part structure with an em-dash separator:
   "[Short headline phrase] — [One sentence explaining the P&C implication]"
   
   The headline phrase should be ≤10 words and state the key fact.
   The detail sentence should be ≤30 words and state who is affected and how.
   
   GOOD examples:
   - "Allstate posts 95.2% combined ratio in Q4 — Signals improving personal auto profitability after two years of rate actions."
   - "Florida Citizens depopulation accelerates — Private carriers absorb 250K policies, easing surplus strain on state insurer."
   - "Swiss Re prices January cat treaties up 8% — Reinsurance cost increases will pressure primary carriers' ceded ratios in 2026."
   
   BAD examples (DO NOT produce these):
   - Long rambling sentences without a clear headline/detail split
   - Bullets that start with generic verbs like "Ensuring" or "Indicates"
   - Vague conclusions like "could shift market dynamics" without naming who or how

2. topStories (3-5 stories, only those passing P&C relevance test):
   - articleId: The source article ID (from brackets above)
   - headline: Synthesized headline (≤12 words) emphasizing the P&C angle. Use active voice. Do NOT copy the article title verbatim.
   - whyItMatters: Exactly 1-2 sentences (≤35 words total) stating WHO is affected (carriers, MGAs, reinsurers, specific LOBs) and HOW (pricing, reserves, capacity, compliance). Be specific. Avoid filler phrases.

3. sections (2-4 bullets each, with articleIds - LEAVE EMPTY if no qualifying articles):
   - propertyCat: Cat events with loss estimates, homeowners market actions, commercial property rate trends
   - casualtyLiability: Auto severity, GL/umbrella capacity, professional liability, workers comp
   - regulation: DOI orders, NAIC actions, rate filings, compliance deadlines
   - claims: Verdicts, settlements, reserve strengthening, social inflation data
   - reinsurance: Treaty pricing, capacity signals, ILS issuance, retro market
   - insurtech: Carrier technology investments, MGA platform adoptions (NOT general tech)
   - market: Carrier M&A, earnings with combined ratio data, meaningful market share shifts

   SECTION BULLET FORMAT:
   Each section bullet should be 1-2 concise sentences (≤40 words).
   Lead with the specific development, then state the P&C implication.
   Do NOT repeat information already in the executive summary.
   Include the source article ID in square brackets at the end: [articleId]

4. topics (5-10 P&C-native tags):
   - Use industry-standard terms: line names, perils, market dynamics
   - Include carrier names for major stories
   - Include geography for regional events
   - Good: "Florida homeowners", "commercial auto severity", "D&O capacity", "1/1 renewals", "nuclear verdicts"
   - Avoid: "technology", "economy", "politics" (too generic)

CRITICAL: If a section has no articles that pass the P&C relevance test, return an empty bullets array. Quality over quantity.`;
}

