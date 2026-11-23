// Scriptable: log a meal. Photos (from the Shortcut) -> one form for weight/description -> result with today's totals.
// Paste into a new Scriptable script on the iPhone and fill in URL and SECRET (same as the widget).
const URL = 'YOUR_DEPLOYMENT_URL';
const SECRET = 'your-shared-secret';

async function post(body) {
  const req = new Request(URL);
  req.method = 'POST';
  req.headers = { 'Content-Type': 'application/json' };
  req.body = JSON.stringify(Object.assign({ secret: SECRET }, body));
  req.timeoutInterval = 90;
  return req.loadJSON();
}

// Scale to 1024px wide JPEG so the upload stays small.
function encode(img) {
  const s = Math.min(1, 1024 / img.size.width);
  const d = new DrawContext();
  d.size = new Size(Math.round(img.size.width * s), Math.round(img.size.height * s));
  d.drawImageInRect(img, new Rect(0, 0, d.size.width, d.size.height));
  return Data.fromJPEG(d.getImage()).toBase64String();
}

// Photos come from the Shortcut (Take Photo / Select Photos -> Run Script with Images), since Photo isn't available here.
// Images don't survive "Run In App", so the Shortcut sends base64 text (comma-joined if several) as the Parameter.
const images = String(args.shortcutParameter || '').replace(/\s/g, '').split(',').filter(Boolean)
  .concat(args.images.map(encode)).slice(0, 6);
if (!images.length) {
  const a = new Alert();
  a.title = 'No photo';
  a.message = 'Run this from the Log Food shortcut so it can pass the photo in.';
  a.addAction('OK');
  await a.present();
  return Script.complete();
}

const form = new Alert();
form.title = 'Details (optional)';
form.message = 'Leave blank if unknown.';
form.addTextField('Weight in grams', '').setDecimalPadKeyboard();
form.addTextField('Brand, cooked in oil, half eaten…', '');
form.addAction('Log it');
form.addCancelAction('Cancel');
if (await form.present() === -1) return Script.complete();

let res, today;
try {
  res = await post({ type: 'food', images: images.join(','), weight: form.textFieldValue(0), description: form.textFieldValue(1) });
  if (!res.error) today = await post({ type: 'today' });
} catch (e) {
  res = { error: 'Network error: ' + e.message };
}

const out = new Alert();
if (res.error) {
  out.title = 'Food log failed';
  out.message = res.error;
} else {
  out.title = `✅ ${res.calories} kcal`;
  out.message = `${res.summary}\n\nP ${res.protein_g}g · C ${res.carbs_g}g · F ${res.fat_g}g` +
    (today && !today.error ? `\n\nToday: ${today.calories} kcal · P ${today.protein_g}g · C ${today.carbs_g}g` : '');
}
out.addAction('OK');
await out.present();
Script.complete();
