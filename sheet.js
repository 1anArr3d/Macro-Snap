// A "day" runs from 5am to 5am, so late-night eating counts toward the day before.
const DAY_START_HOUR = 5;

const FOOD_HEADERS = ['Timestamp', 'Meal ID', 'Food', 'Grams', 'Weight source', 'Calories', 'Protein (g)',
  'Carbs (g)', 'Fat (g)', 'Fiber (g)', 'Confidence', 'Description', 'Notes'];

function appendFoodRows(items, description, notes) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Food');
  if (!sheet) throw new Error('Food tab missing; run setup()');
  const now = new Date();
  const mealId = Utilities.getUuid().slice(0, 8);
  const n = v => Number(v) || 0;
  const rows = items.map(i => [now, mealId, i.name, n(i.grams), i.weight_source, n(i.calories), n(i.protein_g),
    n(i.carbs_g), n(i.fat_g), n(i.fiber_g), i.confidence, description, notes]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

// One-time: run from the editor. Safe to re-run: rebuilds Daily and Stats, never touches Food or Body data.
function setup() {
  const ss = SpreadsheetApp.getActive();
  const tab = name => ss.getSheetByName(name) || ss.insertSheet(name);

  const food = tab('Food');
  food.getRange(1, 1, 1, FOOD_HEADERS.length).setValues([FOOD_HEADERS]).setFontWeight('bold');
  food.setFrozenRows(1);
  food.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');

  const daily = tab('Daily');
  daily.clear();
  daily.getRange('A1').setFormula(
    '=QUERY({ARRAYFORMULA(IF(Food!A2:A="",,INT(Food!A2:A-' + DAY_START_HOUR + '/24))),Food!F2:J},' +
    '"select Col1,sum(Col2),sum(Col3),sum(Col4),sum(Col5),sum(Col6) where Col1 is not null ' +
    "group by Col1 order by Col1 desc label Col1 'Date',sum(Col2) 'Calories',sum(Col3) 'Protein (g)'," +
    "sum(Col4) 'Carbs (g)',sum(Col5) 'Fat (g)',sum(Col6) 'Fiber (g)'\",0)");
  daily.getRange('A:A').setNumberFormat('yyyy-mm-dd');
  daily.getRange('B:F').setNumberFormat('0');
  daily.getRange('1:1').setFontWeight('bold');
  daily.setFrozenRows(1);

  // Phone layout: two charts stacked in column A, weekly table below them, chart data out of the way in M:O.
  const stats = tab('Stats');
  stats.clear();
  stats.getCharts().forEach(c => stats.removeChart(c));
  stats.getRange('M1:O1').setValues([['Date', 'Calories', 'Protein (g)']]);
  stats.getRange('M2').setFormula('=IFERROR(SORT(FILTER(Daily!A2:C,Daily!A2:A>=TODAY()-30),1,TRUE),"")');
  stats.getRange('M:M').setNumberFormat('M/d');
  const chart = (title, col, row) => stats.newChart().asLineChart()
    .addRange(stats.getRange('M1:M32')).addRange(stats.getRange(col + '1:' + col + '32'))
    .setNumHeaders(1).setTitle(title).setLegendPosition(Charts.Position.NONE)
    .setPointStyle(Charts.PointStyle.MEDIUM)
    .setOption('width', 400).setOption('height', 300).setPosition(row, 1, 0, 0).build();
  stats.insertChart(chart('Daily calories (last 30 days)', 'N', 1));
  stats.insertChart(chart('Daily protein g (last 30 days)', 'O', 17));

  stats.getRange('A33').setValue('Weekly averages (per logged day)').setFontWeight('bold');
  stats.getRange('A34').setFormula(
    '=QUERY({ARRAYFORMULA(IF(Daily!A2:A="",,Daily!A2:A-WEEKDAY(Daily!A2:A,2)+1)),Daily!B2:F},' +
    '"select Col1,avg(Col2),avg(Col3),avg(Col4),avg(Col5),avg(Col6) where Col1 is not null ' +
    "group by Col1 order by Col1 desc label Col1 'Week of',avg(Col2) 'kcal',avg(Col3) 'Protein'," +
    "avg(Col4) 'Carbs',avg(Col5) 'Fat',avg(Col6) 'Fiber'\",0)");
  stats.getRange('A35:A').setNumberFormat('M/d');
  stats.getRange('B35:F').setNumberFormat('0');
  stats.getRange('34:34').setFontWeight('bold');

  const body = tab('Body');
  body.getRange('A1:D1').setValues([['Date', 'Weight', 'Body fat %', 'Source']]).setFontWeight('bold');
  body.setFrozenRows(1);

  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0) ss.deleteSheet(blank);

  Logger.log('Tabs ready. Now: Project Settings (gear icon) > Script Properties > add\n' +
    '  ANTHROPIC_API_KEY = your key from console.anthropic.com\n' +
    '  SHARED_SECRET     = a long random string (the Shortcut sends it too)\n' +
    'Then run testWithSampleImage().');
}
