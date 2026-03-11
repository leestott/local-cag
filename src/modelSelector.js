/**
 * Dynamic model selector – picks the best Foundry Local model for
 * the current device based on available system RAM and the SDK
 * catalogue.
 *
 * Selection strategy:
 *  1. Enumerate all chat-completion models from the catalogue.
 *  2. Exclude models that are too large for available RAM.
 *  3. Rank remaining models by a quality preference order.
 *  4. Boost cached models to avoid lengthy downloads.
 *  5. Return the best match.
 */
import os from "os";

// Chat models ranked by quality for domain Q&A tasks (best first).
// Models not listed here are still eligible but receive a low default score.
const QUALITY_RANK = [
  "qwen2.5-7b",             //  7 B – fast on CPU, good quality
  "qwen2.5-14b",            // 14 B – higher quality but slower
  "phi-4",                  // 14 B – best Phi quality
  "gpt-oss-20b",            // 20 B – large, high quality
  "mistral-7b-v0.2",        //  7 B
  "phi-4-mini-reasoning",   //  ~4 B with reasoning
  "phi-3.5-mini",           //  3.8 B – solid small model
  "phi-3-mini-128k",        //  3.8 B – long context variant
  "phi-3-mini-4k",          //  3.8 B
  "qwen2.5-1.5b",           //  1.5 B
  "qwen2.5-0.5b",           //  0.5 B – tiny fallback
];

// Aliases to skip (not suited for domain Q&A chat)
const SKIP_ALIASES = new Set([
  "qwen2.5-coder-0.5b",
  "qwen2.5-coder-1.5b",
  "qwen2.5-coder-7b",
  "qwen2.5-coder-14b",
]);

/**
 * Pick the best chat model from the Foundry Local catalogue that
 * fits within the device's RAM budget.
 *
 * @param {object}  catalog        – FoundryLocalManager.catalog instance
 * @param {object}  [opts]
 * @param {number}  [opts.ramBudgetPercent=0.6] – fraction of total RAM
 *                                   the model file may occupy (0-1)
 * @param {number}  [opts.maxModelSizeMb=4096] – hard cap on model file size
 *                                   in MB to keep CPU inference practical
 * @param {string}  [opts.forceModel]          – bypass selection and use
 *                                   this alias (respects FOUNDRY_MODEL env var)
 * @returns {Promise<{model, reason: string}>}
 */
export async function selectBestModel(catalog, opts = {}) {
  const forceAlias = opts.forceModel || process.env.FOUNDRY_MODEL;
  if (forceAlias) {
    const model = await catalog.getModel(forceAlias);
    return { model, reason: `forced via ${opts.forceModel ? "config" : "FOUNDRY_MODEL env"}` };
  }

  const totalRamMb = os.totalmem() / (1024 * 1024);
  const budgetPercent = opts.ramBudgetPercent ?? 0.6;
  const budgetMb = totalRamMb * budgetPercent;
  const maxSizeMb = opts.maxModelSizeMb ?? 4096;

  console.log(
    `[ModelSelector] System RAM: ${(totalRamMb / 1024).toFixed(1)} GB  ` +
    `| Budget (${(budgetPercent * 100).toFixed(0)}%): ${(budgetMb / 1024).toFixed(1)} GB` +
    `  | Max model size: ${(maxSizeMb / 1024).toFixed(1)} GB`
  );

  const allModels = await catalog.getModels();

  // Filter to chat-completion models that fit within the RAM budget
  const candidates = [];
  for (const m of allModels) {
    const info = m.selectedVariant?._modelInfo;
    if (!info) continue;
    if (info.task !== "chat-completion") continue;
    if (SKIP_ALIASES.has(info.alias)) continue;
    if (info.fileSizeMb > budgetMb) {
      console.log(`[ModelSelector]   skip ${info.alias} (${(info.fileSizeMb / 1024).toFixed(1)} GB > RAM budget)`);
      continue;
    }
    if (info.fileSizeMb > maxSizeMb) {
      console.log(`[ModelSelector]   skip ${info.alias} (${(info.fileSizeMb / 1024).toFixed(1)} GB > max model size ${(maxSizeMb / 1024).toFixed(1)} GB)`);
      continue;
    }
    candidates.push({ model: m, info });
  }

  if (candidates.length === 0) {
    throw new Error(
      "No chat model fits within the available RAM budget " +
      `(${(budgetMb / 1024).toFixed(1)} GB). ` +
      "Try increasing ramBudgetPercent or freeing memory."
    );
  }

  // Score each candidate: quality rank + cache bonus
  const scored = candidates.map(({ model, info }) => {
    const rankIndex = QUALITY_RANK.indexOf(info.alias);
    // Lower index = higher quality; unranked models get a low base score
    const qualityScore = rankIndex >= 0
      ? (QUALITY_RANK.length - rankIndex) * 10
      : 1;
    const cacheBonus = info.cached ? 5 : 0;
    const score = qualityScore + cacheBonus;
    return { model, info, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const reason =
    `auto-selected (${(best.info.fileSizeMb / 1024).toFixed(1)} GB, ` +
    `${best.info.cached ? "cached" : "will download"}, ` +
    `rank ${scored.indexOf(best) + 1}/${scored.length})`;

  console.log(`[ModelSelector] Selected: ${best.info.alias} – ${reason}`);
  return { model: best.model, reason };
}
