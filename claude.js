const CLAUDE_MODEL = 'claude-haiku-5-5';

const SYSTEM_PROMPT = `You are a nutrition estimator. You receive a description of a single meal from the person who ate it, plus one or more photos of it.
- The description is the primary source. Every item it names is an item; weights or calories it gives are facts, used exactly (weight_source "scale" for stated grams). Respect amount words like "small amount" or "a little". It also tells you brand, cooking method and hidden ingredients such as oil, butter or sauces; count those in the item they belong to.
- The photos are supporting evidence: use them to see what the described items look like, to estimate portions the description doesn't give, and to catch food that is visible but not described. Never let the photos override the description.
- All photos show the same meal (different angles, close-ups, packaging). Do not count the same food twice.
- If a nutrition label or ingredient list is visible, use its values for that item, scaled to the portion eaten, unless the description says otherwise.
- For items you can't identify for sure, make your best guess from the photos and say so in notes. Portions you judge from the photos get weight_source "estimated".
- confidence is "high", "medium" or "low".
- Put any caveats in notes (one short sentence, or "").
Return ONLY JSON, no prose, no code fences, in exactly this shape:
{"items":[{"name":"","grams":0,"weight_source":"","calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"confidence":""}],"notes":""}`;

function estimateNutrition(images, description) {
  let text = `Estimate the nutrition of this meal (${images.length} photo${images.length > 1 ? 's' : ''}).`;
  if (description) text += ` Description: ${description}`;

  for (let attempt = 1; ; attempt++) {
    const reply = callClaude(images, text);
    // Take the outermost {...}: drops code fences and any stray prose around the JSON.
    const body = reply.slice(reply.indexOf('{'), reply.lastIndexOf('}') + 1);
    try {
      return JSON.parse(body);
    } catch (err) {
      if (attempt === 2) throw new Error('Could not parse Claude reply: ' + reply.slice(0, 200));
    }
  }
}

function callClaude(images, text) {
  const key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set in Script Properties');
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 8000, // headroom for thinking; a cut-off reply would fail to parse and waste the call
      output_config: { effort: 'low' }, // estimating nutrition doesn't need deep reasoning; keeps output tokens down
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: images
          .map(data => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }))
          .concat({ type: 'text', text }),
      }],
    }),
  });
  const raw = res.getContentText();
  if (res.getResponseCode() !== 200) {
    let msg = raw.slice(0, 300);
    try { msg = JSON.parse(raw).error.message; } catch (e) {}
    throw new Error(`Claude API ${res.getResponseCode()}: ${msg}`);
  }
  return JSON.parse(raw).content.filter(b => b.type === 'text').map(b => b.text).join('');
}
