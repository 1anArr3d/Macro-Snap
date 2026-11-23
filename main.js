// Request types the web app understands. Add `body: handleBody` here for Renpho/Apple Health later.
const HANDLERS = { food: handleFood, today: handleToday };

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    if (!secret || req.secret !== secret) return json({ error: 'Unauthorized' });
    const handler = HANDLERS[req.type];
    if (!handler) return json({ error: 'Unknown type: ' + req.type });
    return json(handler(req));
  } catch (err) {
    return json({ error: String((err && err.message) || err) });
  }
}

// Without this, a GET (e.g. opening the URL in a browser) returns an HTML error page.
function doGet() {
  return json({ error: 'Use POST' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handleFood(req) {
  // `images` may be an array or one comma-joined string (easiest from Shortcuts; base64 never contains commas).
  // Data-URL prefixes and line breaks from the Shortcut's Base64 Encode action are stripped.
  const images = [].concat(req.images || req.image || []).join(',')
    .replace(/data:[^,]*;base64,/g, '').replace(/\s/g, '').split(',').filter(Boolean);
  if (!images.length) throw new Error('Missing image');
  if (images.length > 6) throw new Error('Too many images (max 6)');
  const description = String(req.description || '').trim();

  const result = estimateNutrition(images, description);
  const items = result.items;
  if (!Array.isArray(items) || !items.length) {
    throw new Error('No food found' + (result.notes ? ': ' + result.notes : ''));
  }
  appendFoodRows(items, description, result.notes || '');

  const sum = key => items.reduce((s, i) => s + (Number(i[key]) || 0), 0);
  const r1 = n => Math.round(n * 10) / 10;
  const totals = {
    calories: Math.round(sum('calories')),
    protein_g: r1(sum('protein_g')),
    carbs_g: r1(sum('carbs_g')),
    fat_g: r1(sum('fat_g')),
    fiber_g: r1(sum('fiber_g')),
  };
  const summary = items.map(i => `${i.name} ${Math.round(i.grams)}g`).join(', ') + ` — ${totals.calories} kcal`;
  return Object.assign({ summary }, totals);
}

// Today's totals from the Food tab, for the home-screen widget.
function handleToday() {
  const day = d => Utilities.formatDate(new Date(new Date(d) - DAY_START_HOUR * 3600 * 1000), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const today = day(new Date());
  const rows = SpreadsheetApp.getActive().getSheetByName('Food').getDataRange().getValues().slice(1)
    .filter(r => r[0] && day(r[0]) === today);
  const sum = col => Math.round(rows.reduce((s, r) => s + (Number(r[col]) || 0), 0));
  return { calories: sum(5), protein_g: sum(6), carbs_g: sum(7), fat_g: sum(8), fiber_g: sum(9) };
}

// Run from the editor: exercises the Claude call and sheet write without the phone.
function testWithSampleImage() {
  const url = 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg';
  const blob = UrlFetchApp.fetch(url, { headers: { 'User-Agent': 'food-logger-test' } }).getBlob();
  const result = handleFood({ images: Utilities.base64Encode(blob.getBytes()), description: 'test run' });
  Logger.log(JSON.stringify(result, null, 2));
}
