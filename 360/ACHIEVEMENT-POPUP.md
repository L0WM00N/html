# Achievement pop-up

The dashboard owns achievement notifications while Minecraft is embedded. The shared component is `achievement-popup.js` plus `achievement-popup.css`. It displays a queued notification at the top of the screen for each newly unlocked achievement, using the same visual style as the dashboard's sign-in notification. The dashboard supplies its existing `uploads/Notification.mp3` chime through the `onShow` callback.

In My Games, select Minecraft and press X or choose Achievements to open the achievement grid. The card shows unlocked progress. The grid uses the stored Minecraft achievement catalog; it does not create progress for the other game covers.

## Second project's bridge change

The dashboard's existing version 1 `profile` message now includes:

```js
{
  source: 'xbox360-dashboard',
  version: 1,
  type: 'profile',
  gamertag: '…',
  achievementNotifications: 'host'
}
```

In the game's existing trusted dashboard message handler (checking both the dashboard origin and `event.source === window.parent`), retain `achievementNotifications === 'host'`. When this flag is set, suppress the game's own achievement banner **and chime**. Continue sending the existing `unlock` message and full achievement snapshot to the dashboard. The dashboard uses its own catalog for names and Gamerscore and ignores repeated unlocks. Initial `snapshot` messages update progress silently.

Process the profile message before sending gameplay unlocks. The dashboard sends it on frame load and in response to `ready`. Only suppress local notifications after receiving a valid host profile; standalone play should keep a local notification.

## Reuse the same appearance in standalone play

Copy `achievement-popup.js`, `achievement-popup.css`, and `uploads/Notification.mp3` together, preserving their relative paths. Create one instance:

```js
import { createAchievementPopup } from './achievement-popup.js';

const chime = new Audio('./uploads/Notification.mp3');
const popup = createAchievementPopup({
  onShow() {
    const audio = chime.cloneNode();
    audio.volume = 0.55;
    audio.play().catch(() => {});
  }
});

// Call from the game's actual new-unlock handler, only if the host
// has not claimed achievementNotifications. Respect the game's sound setting.
popup.show({ name: 'Taking Inventory', gamerscore: 10 });

// On game exit/reset:
popup.clear();
// On permanent teardown:
// popup.destroy();
```

The component loads its CSS relative to its own module, isolates styles in a shadow root, scales to the viewport, respects reduced motion, and does not take keyboard or pointer focus. The second project still needs the bridge change above; editing this dashboard cannot disable UI inside a separate origin's iframe.
