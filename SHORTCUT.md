# Building the iPhone Shortcut

Before you start, have your web app URL (`https://script.google.com/macros/s/.../exec`) and your `SHARED_SECRET` ready.

Open **Shortcuts → +**, name the shortcut **Log Food**, and add these actions in order. To add an action, search for its name in the action search bar.

## 1. Get the photos (1–6 of the same meal)
Photos of one meal are analyzed together: different angles, a close-up of the nutrition label, the packaging. A food that shows up in two photos is counted once.

- **Take Photo**: expand it and set Show Camera Preview **On**. If your iOS shows a "Number of photos" or "Take Multiple" option, you can raise it.

*Alternative that picks from your library:* use **Select Photos** with **Select Multiple On** (the easiest way to send several photos). Or keep both: start with **Choose from Menu** with the options "Camera" and "Library", put Take Photo under one and Select Photos under the other, and use the menu's output (**Menu Result**) in the next step.

## 2. Shrink and encode each photo
- **Repeat with Each**: set the input to the photos from step 1. Put these three actions inside the loop:
  - **Resize Image**: set the input to *Repeat Item*, Width **1024**, Height blank (auto).
  - **Convert Image**: format **JPEG**, Quality about **0.8**, Preserve Metadata off.
  - **Base64 Encode**: input *Converted Image*. Expand it and set **Line Breaks: None**.
- **End Repeat**. Its output is *Repeat Results*, the list of encoded photos.
- **Combine Text**: set the input to *Repeat Results* and the separator to **Custom**, typed as a single comma `,`. The server splits on that comma.

## 3. Description
- **Ask for Input**: Input Type **Text**, prompt `What is it? (grams, calories, brand, cooked in oil…)`. Rename the output to `Description`.

The description is the main source; the photos back it up. Weights or calories you type (`103g carne asada, 50 kcal tortilla`) are used exactly, and anything you leave out is estimated from the photos. Leaving it blank is fine.

## 4. Send it
- **Text**: paste your web app URL. Keeping it in its own action makes it easy to change later.
- **Get Contents of URL**: set the URL to the *Text* from the previous action. Expand it:
  - Method: **POST**
  - Headers: none needed
  - Request Body: **JSON**, with these fields (all type **Text**):

    | Key | Value |
    |---|---|
    | `secret` | your SHARED_SECRET |
    | `type` | `food` |
    | `images` | *Combined Text* variable |
    | `description` | *Description* variable |

## 5. Check for errors and show the result
- **Get Dictionary Value**: Get **Value** for key `error` in *Contents of URL*.
- **If** *Dictionary Value* **has any value**:
  - **Show Alert**: title `Food log failed`, message *Dictionary Value*.
  - **Stop This Shortcut**
- **End If**
- **Get Dictionary Value**: key `summary` in *Contents of URL*.
- **Show Notification** (or **Show Result**) showing *Dictionary Value*.

## 6. Log to Apple Health
For each row below, add **Get Dictionary Value** (key from the table, in *Contents of URL*), then **Log Health Sample**:

| Key | Log Health Sample type | Unit |
|---|---|---|
| `calories` | Dietary Energy | kcal |
| `protein_g` | Protein | g |
| `carbs_g` | Carbohydrates | g |
| `fat_g` | Total Fat | g |
| `fiber_g` | Fiber | g |

In each Log Health Sample, set Value to the *Dictionary Value* from the action right before it, and leave Date as *Current Date*. The first run asks for permission to write to Health. Allow all five types.

## Running it quickly
- **Home Screen:** in the shortcut, tap the **ⓘ** (or the name at the top) → **Add to Home Screen**.
- **Action Button** (iPhone 15 Pro and later): **Settings → Action Button** → swipe to **Shortcut** → choose **Log Food**.
- **Back Tap** (any recent iPhone): **Settings → Accessibility → Touch → Back Tap → Double Tap → Log Food**.

## Troubleshooting
- **`Unauthorized`:** the secret in the Shortcut doesn't match the Script Property.
- **An HTML page or "Script function not found":** the URL is wrong, or you changed code without redeploying. See "Redeploying" in the README.
- **It takes 10–30 seconds:** that's normal, because Claude is analyzing the photo.
