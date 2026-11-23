// Tapping ▶ in the app has no photos to work with (the in-app camera/picker doesn't open on this phone).
// Log food via the Shortcut (Take Photo -> Run Script in App) or by sharing a photo to Log Food; see intent.tsx.
import { Script } from "scripting"

console.log("Log Food runs from the Shortcut or the share sheet, not from ▶.")
Script.exit()
