# Food logger

You send a food photo from an iPhone Shortcut. A Google Apps Script web app asks Claude to estimate the nutrition, appends the results to a Google Sheet, and returns the totals so the Shortcut can log them to Apple Health.

| File | What it does |
|---|---|
| `main.js` | `doPost` (checks the secret, picks a handler), `handleFood`, `testWithSampleImage` |
| `claude.js` | Claude Messages API call, JSON parsing with one retry |
| `sheet.js` | `setup()` (tabs, formulas, charts), `appendFoodRows` |
| `appsscript.json` | manifest: scopes and web app settings |
| `SHORTCUT.md` | how to build the iPhone Shortcut |

## 1. One-time setup

1. Install Node.js (LTS), then clasp:
   ```
   npm install -g @google/clasp
   ```
2. Enable the Apps Script API for your account at https://script.google.com/home/usersettings by switching **Google Apps Script API** to On. Without it, clasp fails with "User has not enabled the Apps Script API".
3. Log in. A browser window opens; pick your Google account and allow access.
   ```
   clasp login
   ```
4. Create the Sheet and the bound script from inside this folder:
   ```
   cd food-logger
   clasp create --type sheets --title "Food Log"
   ```
   This creates a Google Sheet named "Food Log" in your Drive, binds a script to it, and writes `.clasp.json` here. If clasp asks whether to overwrite `appsscript.json`, answer **no**. If it overwrote the file anyway, restore it from this repo before pushing.

   *Using a Sheet you already have:* open it, go to **Extensions → Apps Script**, then **Project Settings** and copy the **Script ID**. Back here, run `clasp clone <scriptId>` (if it overwrites `appsscript.json`, restore it).
5. Push the code:
   ```
   clasp push
   ```
6. Open the editor with `clasp open-script` (on older clasp versions, `clasp open`). Choose `setup` in the function dropdown and click **Run**. Approve the permission prompt; for your own unverified script, click Advanced → "Go to … (unsafe)". This creates the Food, Daily, Stats and Body tabs.
7. In the editor, go to **Project Settings (gear) → Script Properties → Add script property**:
   - `ANTHROPIC_API_KEY`: your key from https://console.anthropic.com
   - `SHARED_SECRET`: a long random string, for example from `openssl rand -hex 24`. The Shortcut sends this too.
8. Run `testWithSampleImage` in the editor. The execution log should show a JSON summary, and new rows should appear on **Food** and **Daily**. This also grants the "connect to external service" permission the web app needs.

Change `timeZone` in `appsscript.json` if you're not on US Eastern time. Also set **File → Settings → Time zone** in the Sheet to match, because the Daily totals group by the Sheet's time zone.

## 2. Deploy as a web app

```
clasp deploy --description "v1"
```
This prints a deployment ID. Your URL is:
```
https://script.google.com/macros/s/<deploymentId>/exec
```
The manifest already sets **Execute as: Me** and **Who has access: Anyone**, so no login is needed. The shared secret is the only lock, so keep it long.

You can also deploy from the editor: **Deploy → New deployment → Web app**, Execute as **Me**, Who has access **Anyone**.

## 3. Redeploying after changes (same URL)

A deployment is pinned to a version, so `clasp push` alone does **not** change what the URL runs. Update the existing deployment in place:
```
clasp push
clasp deploy --deploymentId <deploymentId> --description "what changed"
```
To look up the ID, run `clasp deployments` (use the one that isn't `@HEAD`). In the editor, the same thing is **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. Running `clasp deploy` without `--deploymentId` creates a **new** URL.

## 4. Test with curl

From Git Bash, macOS or Linux, with any JPEG named `food.jpg`:
```bash
URL="https://script.google.com/macros/s/<deploymentId>/exec"
SECRET="your-shared-secret"
printf '{"secret":"%s","type":"food","description":"150g chicken breast, rice, cooked in olive oil","image":"%s"}' \
  "$SECRET" "$(base64 -w0 food.jpg)" > body.json   # macOS: base64 -i food.jpg
curl -sL -H "Content-Type: application/json" --data @body.json "$URL"
```
`-L` is required because Apps Script answers POSTs with a redirect. You should get back something like:
```json
{"summary":"Chicken breast 150g, rice 200g — 520 kcal","calories":520,"protein_g":48.5,"carbs_g":56,"fat_g":9.2,"fiber_g":1.1}
```
A wrong secret returns `{"error":"Unauthorized"}`. Errors always come back as `{"error":"..."}` with HTTP 200, because Apps Script can't set status codes. Callers have to check for the `error` key.

## Adding body measurements later

`main.js` routes requests through `HANDLERS = { food: handleFood }`. To support `type: "body"`, write a `handleBody(req)` that appends `[date, weight, bodyFat, source]` to the **Body** tab and add `body: handleBody` to that map.

## Phone scripts

The widget and phone scripts contain `YOUR_DEPLOYMENT_URL` and `your-shared-secret`. Replace both with your own values in the copy on your phone only, never in the repo.

Only `scripting-widget/` is in use. `scripting-logfood/` and the `*-scriptable.js` files are unfinished experiments: photo access didn't work in those apps.

