// Scripting app home-screen widget: today's calories, protein and carbs as progress bars.
// The ↻ button reloads the numbers in place (see app_intents.tsx). Lock Screen sizes get compact gauges.
import { Widget, VStack, HStack, Text, Spacer, ProgressView, Button, Gauge, Color } from "scripting"
import { RefreshIntent } from "./app_intents"

const URL = "YOUR_DEPLOYMENT_URL"
const SECRET = "your-shared-secret"
// min = lower end of your target range, max = upper end (bar is full at max).
const TARGETS = [
  { key: "calories", label: "Calories", unit: "kcal", min: 1800, max: 2200, color: "systemOrange" },
  { key: "protein_g", label: "Protein", unit: "g", min: 120, max: 160, color: "systemGreen" },
  { key: "carbs_g", label: "Carbs", unit: "g", min: 150, max: 250, color: "systemBlue" },
]

async function load(): Promise<Record<string, number> & { error?: string }> {
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SECRET, type: "today" }),
    })
    return await res.json()
  } catch (e) {
    return { error: "Offline" } as any
  }
}

async function main() {
  const data = await load()
  const val = (key: string) => Math.round(Number(data[key]) || 0)
  // Ask iOS to reload in 15 min, but no later than just after the 5am day rollover (matches DAY_START_HOUR on the server).
  const rollover = new Date(); rollover.setHours(5, 1, 0, 0)
  if (rollover.getTime() <= Date.now()) rollover.setDate(rollover.getDate() + 1)
  const next = new Date(Math.min(Date.now() + 15 * 60 * 1000, rollover.getTime()))
  const show = (el: any) => Widget.present(el, { policy: "after", date: next })

  // Lock Screen: the system tints these, so no colors.
  if (Widget.family === "accessoryCircular") {
    const t = TARGETS[0]
    return show(
      <Gauge value={Math.min(val(t.key), t.max)} min={0} max={t.max} gaugeStyle="accessoryCircularCapacity"
        label={<Text>kcal</Text>} currentValueLabel={<Text>{data.error ? "–" : String(val(t.key))}</Text>} />
    )
  }
  if (Widget.family === "accessoryRectangular") {
    return show(
      <VStack alignment="leading" spacing={2}>
        {TARGETS.map(t =>
          <Gauge value={Math.min(val(t.key), t.max)} min={0} max={t.max} gaugeStyle="accessoryLinearCapacity"
            label={<Text font="caption2">{data.error ? t.label : `${t.label} ${val(t.key)}/${t.max}`}</Text>} />
        )}
      </VStack>
    )
  }

  show(
    <VStack alignment="leading" spacing={8} padding>
      <HStack>
        <Text font="headline">Today</Text>
        <Spacer />
        <Button intent={RefreshIntent(undefined)}>
          <Text font="headline" foregroundStyle="secondaryLabel">↻</Text>
        </Button>
      </HStack>
      {data.error
        ? <Text foregroundStyle="systemRed">{String(data.error)}</Text>
        : TARGETS.map(t => {
          const v = Math.round(Number(data[t.key]) || 0)
          // Grey below min, colored in range, red over max.
          const color = (v > t.max ? "systemRed" : v >= t.min ? t.color : "secondaryLabel") as Color
          return (
            <VStack alignment="leading" spacing={3}>
              <HStack>
                <Text font="caption">{t.label}</Text>
                <Spacer />
                <Text font="caption" foregroundStyle={color}>{`${v} / ${t.max} ${t.unit}`}</Text>
              </HStack>
              <ProgressView value={Math.min(v, t.max)} total={t.max} tint={(v > t.max ? "systemRed" : t.color) as Color} />
            </VStack>
          )
        })}
      <Spacer />
    </VStack>
  )
}

main()
