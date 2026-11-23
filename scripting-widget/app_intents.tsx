// Runs in the background when the widget's ↻ button is tapped; reloading makes widget.tsx fetch fresh totals.
import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"

export const RefreshIntent = AppIntentManager.register({
  name: "RefreshIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    Widget.reloadAll()
  },
})
