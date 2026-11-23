// Entry point from Shortcuts ("Run Script in App" with Images) or the share sheet (share a photo -> Log Food).
import { Intent, Navigation, Script, Text } from "scripting"
import { LogFood, prepare } from "./logfood"

async function run() {
  // Docs describe imagesParameter as image file paths or UIImages; accept both.
  const images = (Intent.imagesParameter ?? [])
    .map((i: any) => typeof i === "string" ? UIImage.fromFile(i) : i)
    .filter((i: any): i is UIImage => i != null)
    .slice(0, 6)

  if (!images.length) {
    await Navigation.present({ element: <Text padding>No photo received. Pass Images to "Run Script in App", or share a photo to Log Food.</Text> })
    return Script.exit()
  }

  await Navigation.present({ element: <LogFood photos={images.map(prepare)} /> })
  Script.exit()
}

run()
