// Scriptable home-screen widget: today's calories, protein and carbs as progress bars.
// Paste into a new Scriptable script on the iPhone, fill in URL and SECRET, set your targets.
const URL = 'YOUR_DEPLOYMENT_URL';
const SECRET = 'your-shared-secret';
const SHEET_URL = 'YOUR_SHEET_URL';
// min = lower end of your target range, max = upper end (bar is full at max).
const TARGETS = [
  { key: 'calories', label: 'Calories', unit: 'kcal', min: 1800, max: 2200, color: '#FF9F0A' },
  { key: 'protein_g', label: 'Protein', unit: 'g', min: 120, max: 160, color: '#30D158' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g', min: 150, max: 250, color: '#0A84FF' },
];

const req = new Request(URL);
req.method = 'POST';
req.headers = { 'Content-Type': 'application/json' };
req.body = JSON.stringify({ secret: SECRET, type: 'today' });
let data;
try { data = await req.loadJSON(); } catch (e) { data = { error: 'Offline' }; }

const w = new ListWidget();
w.backgroundColor = new Color('#1C1C1E');
w.url = SHEET_URL;
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

const title = w.addText('Today');
title.font = Font.boldSystemFont(14);
title.textColor = Color.white();
w.addSpacer(8);

if (data.error) {
  const t = w.addText(String(data.error));
  t.textColor = Color.red();
} else {
  for (const t of TARGETS) {
    const v = data[t.key] || 0;
    const row = w.addStack();
    const name = row.addText(t.label);
    name.font = Font.mediumSystemFont(12);
    name.textColor = Color.white();
    row.addSpacer();
    const val = row.addText(`${v} / ${t.max} ${t.unit}`);
    val.font = Font.systemFont(12);
    // Grey below min, colored in range, red over max.
    val.textColor = v > t.max ? Color.red() : v >= t.min ? new Color(t.color) : Color.gray();
    w.addSpacer(3);
    w.addImage(bar(v / t.max, t.min / t.max, v > t.max ? '#FF453A' : t.color)).imageSize = new Size(280, 8);
    w.addSpacer(8);
  }
}

function bar(frac, minFrac, color) {
  const W = 280, H = 8;
  const d = new DrawContext();
  d.size = new Size(W, H);
  d.opaque = false;
  d.respectScreenScale = true;
  const pill = (x, w, c) => {
    const p = new Path();
    p.addRoundedRect(new Rect(x, 0, w, H), H / 2, H / 2);
    d.addPath(p);
    d.setFillColor(new Color(c));
    d.fillPath();
  };
  pill(0, W, '#3A3A3C');
  if (frac > 0) pill(0, Math.max(H, W * Math.min(frac, 1)), color);
  d.setFillColor(Color.white()); // tick at the minimum target
  d.fillRect(new Rect(W * minFrac, 0, 2, H));
  return d.getImage();
}

if (config.runsInWidget) Script.setWidget(w);
else w.presentMedium();
Script.complete();
