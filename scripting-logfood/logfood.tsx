// The Log Food screen: photos (handed in by intent.tsx) + weight + description -> server -> result card, then refreshes the widget.
// No camera/library buttons: Photos.takePhoto/pick never open from a presented script on this phone.
import {
  Navigation, NavigationStack, VStack, HStack, ScrollView, Text, TextField, Button,
  Image, ProgressView, Spacer, Widget, useState,
} from "scripting"

const URL = "YOUR_DEPLOYMENT_URL"
const SECRET = "your-shared-secret"

export type Photo = { b64: string; thumb: UIImage }

async function post(body: Record<string, unknown>): Promise<any> {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: SECRET, ...body }),
  })
  return res.json()
}

// Scale to 1024px wide so the upload stays small; keep only a thumbnail of the original.
export function prepare(img: UIImage): Photo {
  const s = Math.min(1, 1024 / img.width)
  const small = s < 1 ? img.renderedIn({ width: Math.round(img.width * s), height: Math.round(img.height * s) }) : img
  return {
    b64: (small ?? img).toJPEGBase64String(0.8) ?? "",
    thumb: img.preparingThumbnail({ width: 90, height: Math.round(90 * img.height / img.width) }) ?? img,
  }
}

export function LogFood({ photos }: { photos: Photo[] }) {
  const dismiss = Navigation.useDismiss()
  const [weight, setWeight] = useState("")
  const [description, setDescription] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function log() {
    setBusy(true)
    try {
      const res = await post({ type: "food", images: photos.map(p => p.b64).join(","), weight, description })
      const today = res.error ? null : await post({ type: "today" })
      setResult({ ...res, today })
      if (!res.error) Widget.reloadAll()
    } catch (e) {
      setResult({ error: "Network error: " + String(e) })
    }
    setBusy(false)
  }

  if (result) {
    const t = result.today
    return <NavigationStack>
      <VStack navigationTitle={result.error ? "Failed" : "Logged"} spacing={12} padding>
        {result.error
          ? <Text foregroundStyle="systemRed">{result.error}</Text>
          : <VStack spacing={8}>
            <Text font="largeTitle">{`${result.calories} kcal`}</Text>
            <Text>{result.summary}</Text>
            <Text foregroundStyle="secondaryLabel">{`P ${result.protein_g}g · C ${result.carbs_g}g · F ${result.fat_g}g`}</Text>
            {t && !t.error
              ? <Text font="headline">{`Today: ${t.calories} kcal · P ${t.protein_g}g · C ${t.carbs_g}g`}</Text>
              : null}
          </VStack>}
        <Spacer />
        <Button title="Done" action={dismiss} />
      </VStack>
    </NavigationStack>
  }

  return <NavigationStack>
    <ScrollView navigationTitle="Log food">
      <VStack alignment="leading" spacing={16} padding>
        <ScrollView axes="horizontal">
          <HStack spacing={8}>
            {photos.map(p => <Image image={p.thumb} />)}
          </HStack>
        </ScrollView>
        <TextField title="Weight (g)" value={weight} onChanged={setWeight} prompt="Weight in grams (optional)" />
        <TextField title="Description" value={description} onChanged={setDescription} prompt="Brand, cooked in oil, half eaten… (optional)" />
        {busy
          ? <HStack spacing={8}><ProgressView /><Text>Estimating… 10–30 s</Text></HStack>
          : <Button title="Log it" action={log} />}
      </VStack>
    </ScrollView>
  </NavigationStack>
}
