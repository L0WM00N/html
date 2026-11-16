const MINECRAFT_ORIGIN = 'https://kv2m72rtgsie4rwk2r3y.c.websim.com';
const STORAGE_KEY = 'metro-minecraft-achievements.v1';
const RESET_PENDING_KEY = 'metro-minecraft-achievements.reset-pending.v1';
const RESET_BASELINE_KEY = 'metro-minecraft-achievements.reset-baseline.v1';

// Keep the dashboard's catalog available before the game is opened.
const ACHIEVEMENTS = [
  ['openInventory', 'Taking Inventory', 10, 'Open your inventory.', 'TakingInventory.webp'],
  ['mineWood', 'Getting Wood', 10, 'Punch a tree until a block of wood pops out.', 'GettingWood.webp'],
  ['buildWorkBench', 'Benchmarking', 10, 'Craft a workbench with four blocks of planks.', 'Benchmarking.webp'],
  ['buildPickaxe', 'Time to Mine!', 10, 'Craft a pickaxe.', 'TimeToMine.webp'],
  ['buildFurnace', 'Hot Topic', 15, 'Construct a furnace out of eight cobblestone blocks.', 'AchievementSprite_hot-topic.webp'],
  ['acquireIron', 'Acquire Hardware', 15, 'Smelt an iron ingot.', 'AchievementSprite_acquire-hardware.webp'],
  ['buildHoe', 'Time to Farm!', 10, 'Craft a hoe.', 'AchievementSprite_time-to-farm.webp'],
  ['makeBread', 'Bake Bread', 20, 'Turn wheat into bread.', 'AchievementSprite_bake-bread.webp'],
  ['bakeCake', 'The Lie', 40, 'Bake a cake.', 'AchievementSprite_the-lie.webp'],
  ['buildBetterPickaxe', 'Getting an Upgrade', 15, 'Construct a better pickaxe.', 'AchievementSprite_getting-an-upgrade.webp'],
  ['cookFish', 'Delicious Fish', 15, 'Catch and cook a fish.', 'AchievementSprite_delicious-fish.webp'],
  ['onARail', 'On A Rail', 40, 'Travel 500 blocks in one direction by minecart.', 'AchievementSprite_on-a-rail.webp'],
  ['buildSword', 'Time to Strike!', 10, 'Craft a sword.', 'AchievementSprite_time-to-strike.webp'],
  ['killEnemy', 'Monster Hunter', 20, 'Attack and destroy a monster.', 'AchievementSprite_monster-hunter.webp'],
  ['killCow', 'Cow Tipper', 15, 'Harvest some leather.', 'AchievementSprite_cow-tipper.webp'],
  ['flyPig', 'When Pigs Fly', 40, 'Ride a pig off a cliff.', 'AchievementSprite_when-pigs-fly.webp'],
  ['portal', 'Into The Nether', 40, 'Enter the Nether through a portal.', 'AchievementSprite_into-the-nether.webp'],
  ['moarTools', 'MOAR Tools', 15, 'Craft a pickaxe, shovel, axe, and hoe.', 'AchievementSprite_moar-tools.webp'],
  ['dispense', 'Dispense With This', 20, 'Construct a dispenser.', 'AchievementSprite_dispense-with-this.webp'],
  ['leaderPack', 'Leader Of The Pack', 30, 'Tame five wolves.', 'AchievementSprite_leader-of-the-pack.webp'],
];
const ids = new Set(ACHIEVEMENTS.map(([id]) => id));

export function createMinecraftBridge(frame, { getGamertag, onChange, onUnlock }) {
  let unlocked = new Set();
  let resetPending = false;
  let ignoredGameAchievements = null;
  let lastGameUnlocked = null;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(stored)) unlocked = new Set(stored.filter(id => ids.has(id)));
    resetPending = localStorage.getItem(RESET_PENDING_KEY) === 'true';
    const baseline = localStorage.getItem(RESET_BASELINE_KEY);
    if (baseline !== null) ignoredGameAchievements = new Set(JSON.parse(baseline).filter(id => ids.has(id)));
  } catch {}

  const snapshot = () => {
    const achievements = ACHIEVEMENTS.map(([id, name, gamerscore, description, iconFile]) => ({
      id, name, gamerscore, description, icon: `uploads/${iconFile}`, unlocked: unlocked.has(id),
    }));
    return {
      achievements,
      gamerscore: achievements.reduce((sum, item) => sum + (item.unlocked ? item.gamerscore : 0), 0),
      totalGamerscore: 400,
      unlockedCount: unlocked.size,
      totalCount: achievements.length,
    };
  };
  const send = (type, extra = {}) => {
    if (!frame.hasAttribute('src')) return;
    frame.contentWindow?.postMessage({ source: 'xbox360-dashboard', version: 1, type, ...extra }, MINECRAFT_ORIGIN);
  };
  const sendProfile = () => send('profile', { gamertag: getGamertag(), achievementNotifications: 'host' });
  const request = () => {
    sendProfile();
    send('sync', { unlocked: [...unlocked] });
    send('request');
  };
  const reset = () => {
    unlocked.clear();
    resetPending = true;
    ignoredGameAchievements = lastGameUnlocked && new Set(lastGameUnlocked);
    try {
      localStorage.setItem(STORAGE_KEY, '[]');
      localStorage.setItem(RESET_PENDING_KEY, 'true');
      if (ignoredGameAchievements) localStorage.setItem(RESET_BASELINE_KEY, JSON.stringify([...ignoredGameAchievements]));
      else localStorage.removeItem(RESET_BASELINE_KEY);
    } catch {}
    send('request');
    onChange(snapshot());
  };

  window.addEventListener('message', event => {
    if (event.origin !== MINECRAFT_ORIGIN || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || data.source !== 'minecraft-xbox360' || data.version !== 1) return;
    if (data.type === 'ready') { request(); return; }
    if (data.type !== 'snapshot' && data.type !== 'unlock') return;
    if (data.game?.id !== 'minecraft-xbox-360' || !Array.isArray(data.achievements) || data.achievements.length !== ACHIEVEMENTS.length) return;
    const received = new Set();
    for (const item of data.achievements) {
      if (!item || !ids.has(item.id) || typeof item.unlocked !== 'boolean' || received.has(item.id)) return;
      received.add(item.id);
    }
    const gameUnlocked = new Set(data.achievements.filter(item => item.unlocked).map(item => item.id));
    lastGameUnlocked = gameUnlocked;
    if (resetPending) {
      if (gameUnlocked.size) {
        if (!ignoredGameAchievements) ignoredGameAchievements = new Set(gameUnlocked);
        else for (const id of ignoredGameAchievements) if (!gameUnlocked.has(id)) ignoredGameAchievements.delete(id);
        try { localStorage.setItem(RESET_BASELINE_KEY, JSON.stringify([...ignoredGameAchievements])); } catch {}
        const earnedId = data.type === 'unlock' && data.achievement?.id;
        if (ids.has(earnedId) && !ignoredGameAchievements.has(earnedId) && !unlocked.has(earnedId)) {
          unlocked.add(earnedId);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked])); } catch {}
          onChange(snapshot());
          const [, name, gamerscore] = ACHIEVEMENTS.find(([id]) => id === earnedId);
          onUnlock({ id: earnedId, name, gamerscore });
        }
        return;
      }
      resetPending = false;
      ignoredGameAchievements = null;
      try { localStorage.removeItem(RESET_PENDING_KEY); localStorage.removeItem(RESET_BASELINE_KEY); } catch {}
    }
    if ([...unlocked].some(id => !gameUnlocked.has(id))) send('sync', { unlocked: [...unlocked] });
    const newlyUnlocked = ACHIEVEMENTS.filter(([id]) => gameUnlocked.has(id) && !unlocked.has(id));
    const oldSize = unlocked.size;
    for (const id of gameUnlocked) unlocked.add(id);
    if (unlocked.size !== oldSize) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked])); } catch {}
      onChange(snapshot());
      if (data.type === 'unlock') {
        for (const [id, name, gamerscore] of newlyUnlocked) onUnlock({ id, name, gamerscore });
      }
    }
  });

  return { snapshot, request, sendProfile, reset };
}
