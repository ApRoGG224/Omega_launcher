export type TopBarItemId =
  | "profile"
  | "divider_profile"
  | "play"
  | "settings"
  | "modrinth"
  | "instances"
  | "servers"
  | "store"
  | "console"
  | "divider_shortcuts"
  | "shortcuts"
  | "divider_friends"
  | "friends"
  | "chevron";

export type BottomBarItemId =
  | "instance_icon"
  | "instance_title"
  | "instance_tags"
  | "play_button";

export type BottomBarAlignment = "center" | "left" | "right" | "space-between";

export type ButtonShapePreset = "tactical" | "cyber" | "rounded" | "chamfer";

export interface TopBarItemMeta {
  id: TopBarItemId;
  title: string;
  category: "account" | "navigation" | "shortcuts" | "social" | "divider";
  description: string;
  isDivider?: boolean;
}

export interface BottomBarItemMeta {
  id: BottomBarItemId;
  title: string;
  description: string;
}

export const TOPBAR_ITEMS_META: Record<TopBarItemId, TopBarItemMeta> = {
  profile: {
    id: "profile",
    title: "Профиль игрока",
    category: "account",
    description: "Текущий никнейм, аватар и выпадающий список аккаунтов",
  },
  divider_profile: {
    id: "divider_profile",
    title: "Разделитель профиля",
    category: "divider",
    description: "Вертикальная черта после профиля игрока",
    isDivider: true,
  },
  play: {
    id: "play",
    title: "Кнопка Играть / Домой",
    category: "navigation",
    description: "Быстрый запуск или возврат на главный экран",
  },
  settings: {
    id: "settings",
    title: "Настройки (Шестерёнка)",
    category: "navigation",
    description: "Переход в параметры лаунчера и игры",
  },
  modrinth: {
    id: "modrinth",
    title: "Каталог модов (Пазл)",
    category: "navigation",
    description: "Поиск и установка модов, шейдеров и ресурспаков",
  },
  instances: {
    id: "instances",
    title: "Версии (Коробка)",
    category: "navigation",
    description: "Управление установленными версиями Minecraft",
  },
  servers: {
    id: "servers",
    title: "Серверы (Сервер)",
    category: "navigation",
    description: "Мониторинг серверов и быстрое подключение",
  },
  store: {
    id: "store",
    title: "Магазин (Пакет)",
    category: "navigation",
    description: "Косметика, плащи и магазин Omega",
  },
  console: {
    id: "console",
    title: "Консоль (Терминал)",
    category: "navigation",
    description: "Логи запуска и отладочная консоль",
  },
  divider_shortcuts: {
    id: "divider_shortcuts",
    title: "Разделитель версий",
    category: "divider",
    description: "Вертикальная черта перед быстрыми версиями",
    isDivider: true,
  },
  shortcuts: {
    id: "shortcuts",
    title: "Быстрые версии (Иконки)",
    category: "shortcuts",
    description: "Мини-иконки недавних версий для мгновенного выбора",
  },
  divider_friends: {
    id: "divider_friends",
    title: "Разделитель друзей",
    category: "divider",
    description: "Вертикальная черта перед разделом друзей",
    isDivider: true,
  },
  friends: {
    id: "friends",
    title: "Друзья и онлайн",
    category: "social",
    description: "Список друзей и уведомления",
  },
  chevron: {
    id: "chevron",
    title: "Параметры (Стрелка)",
    category: "navigation",
    description: "Быстрое открытие меню настроек",
  },
};

export const TOPBAR_ITEMS_LOCALIZED: Record<"uk" | "ru" | "en", Record<TopBarItemId, { title: string; description: string }>> = {
  uk: {
    profile: { title: "Профіль гравця", description: "Поточний нікнейм, аватар та спадний список акаунтів" },
    divider_profile: { title: "Роздільник профілю", description: "Вертикальна лінія після профілю гравця" },
    play: { title: "Кнопка Грати / Додому", description: "Швидкий запуск або повернення на головний екран" },
    settings: { title: "Налаштування (Шестерня)", description: "Перехід до параметрів лаунчера та гри" },
    modrinth: { title: "Каталог модів (Пазл)", description: "Пошук та встановлення модів, шейдерів і ресурспаків" },
    instances: { title: "Версії (Коробка)", description: "Керування встановленими версіями Minecraft" },
    servers: { title: "Сервери (Сервер)", description: "Моніторинг серверів та швидке підключення" },
    store: { title: "Магазин (Пакунок)", description: "Косметика, плащі та магазин Omega" },
    console: { title: "Консоль (Термінал)", description: "Логи запуску та налагоджувальна консоль" },
    divider_shortcuts: { title: "Роздільник версій", description: "Вертикальна лінія перед швидкими версіями" },
    shortcuts: { title: "Швидкі версії (Іконки)", description: "Міні-іконки нещодавніх версій для миттєвого вибору" },
    divider_friends: { title: "Роздільник друзів", description: "Вертикальна лінія перед розділом друзів" },
    friends: { title: "Друзі та онлайн", description: "Список друзів та сповіщення" },
    chevron: { title: "Параметри (Стрілка)", description: "Швидке відкриття меню налаштувань" },
  },
  ru: {
    profile: { title: "Профиль игрока", description: "Текущий никнейм, аватар и выпадающий список аккаунтов" },
    divider_profile: { title: "Разделитель профиля", description: "Вертикальная черта после профиля игрока" },
    play: { title: "Кнопка Играть / Домой", description: "Быстрый запуск или возврат на главный экран" },
    settings: { title: "Настройки (Шестерёнка)", description: "Переход в параметры лаунчера и игры" },
    modrinth: { title: "Каталог модов (Пазл)", description: "Поиск и установка модов, шейдеров и ресурспаков" },
    instances: { title: "Версии (Коробка)", description: "Управление установленными версиями Minecraft" },
    servers: { title: "Серверы (Сервер)", description: "Мониторинг серверов и быстрое подключение" },
    store: { title: "Магазин (Пакет)", description: "Косметика, плащи и магазин Omega" },
    console: { title: "Консоль (Терминал)", description: "Логи запуска и отладочная консоль" },
    divider_shortcuts: { title: "Разделитель версий", description: "Вертикальная черта перед быстрыми версиями" },
    shortcuts: { title: "Быстрые версии (Иконки)", description: "Мини-иконки недавних версий для мгновенного выбора" },
    divider_friends: { title: "Разделитель друзей", description: "Вертикальная черта перед разделом друзей" },
    friends: { title: "Друзья и онлайн", description: "Список друзей и уведомления" },
    chevron: { title: "Параметры (Стрелка)", description: "Быстрое открытие меню настроек" },
  },
  en: {
    profile: { title: "Player Profile", description: "Current nickname, avatar and accounts dropdown" },
    divider_profile: { title: "Profile Divider", description: "Vertical line after player profile" },
    play: { title: "Play / Home Button", description: "Quick launch or return to home screen" },
    settings: { title: "Settings (Gear)", description: "Open launcher and game settings" },
    modrinth: { title: "Mods Catalog (Puzzle)", description: "Browse and install mods, shaders, and resource packs" },
    instances: { title: "Versions (Box)", description: "Manage installed Minecraft versions" },
    servers: { title: "Servers (Server)", description: "Server monitoring and quick connection" },
    store: { title: "Store (Bag)", description: "Cosmetics, capes, and Omega Store" },
    console: { title: "Console (Terminal)", description: "Launch logs and debug console" },
    divider_shortcuts: { title: "Versions Divider", description: "Vertical line before quick version shortcuts" },
    shortcuts: { title: "Quick Versions (Icons)", description: "Mini-icons of recent versions for instant selection" },
    divider_friends: { title: "Friends Divider", description: "Vertical line before friends section" },
    friends: { title: "Friends & Online", description: "Friends list and online notifications" },
    chevron: { title: "Options (Chevron)", description: "Quickly open launcher settings menu" },
  },
};

export const getTopBarItemMeta = (id: TopBarItemId, lang: "uk" | "ru" | "en" = "uk"): TopBarItemMeta => {
  const base = TOPBAR_ITEMS_META[id] || { id, title: id, category: "navigation", description: "" };
  const loc = TOPBAR_ITEMS_LOCALIZED[lang]?.[id] || TOPBAR_ITEMS_LOCALIZED.uk[id] || TOPBAR_ITEMS_LOCALIZED.en[id];
  if (!loc) return base;
  return {
    ...base,
    title: loc.title,
    description: loc.description,
  };
};

export const BOTTOMBAR_ITEMS_META: Record<BottomBarItemId, BottomBarItemMeta> = {
  instance_icon: {
    id: "instance_icon",
    title: "Иконка версии",
    description: "3D или пиксельный значок выбранной версии",
  },
  instance_title: {
    id: "instance_title",
    title: "Название версии",
    description: "Имя активной версии Minecraft",
  },
  instance_tags: {
    id: "instance_tags",
    title: "Теги и статус",
    description: "Загрузчик (NeoForge/Fabric), версия и сыгранное время",
  },
  play_button: {
    id: "play_button",
    title: "Кнопка «ИГРАТЬ / СТОП»",
    description: "Основная кнопка запуска и остановки игрового клиента",
  },
};

export const BOTTOMBAR_ITEMS_LOCALIZED: Record<"uk" | "ru" | "en", Record<BottomBarItemId, { title: string; description: string }>> = {
  uk: {
    instance_icon: { title: "Іконка версії", description: "3D або піксельний значок обраної версії" },
    instance_title: { title: "Назва версії", description: "Ім'я активної версії Minecraft" },
    instance_tags: { title: "Теги та статус", description: "Завантажувач (NeoForge/Fabric), версія та зіграний час" },
    play_button: { title: "Кнопка «ГРАТИ / СТОП»", description: "Основна кнопка запуску та зупинки ігрового клієнта" },
  },
  ru: {
    instance_icon: { title: "Иконка версии", description: "3D или пиксельный значок выбранной версии" },
    instance_title: { title: "Название версии", description: "Имя активной версии Minecraft" },
    instance_tags: { title: "Теги и статус", description: "Загрузчик (NeoForge/Fabric), версия и сыгранное время" },
    play_button: { title: "Кнопка «ИГРАТЬ / СТОП»", description: "Основная кнопка запуска и остановки игрового клиента" },
  },
  en: {
    instance_icon: { title: "Version Icon", description: "3D or pixel icon of the selected version" },
    instance_title: { title: "Version Name", description: "Name of the active Minecraft version" },
    instance_tags: { title: "Tags & Status", description: "Loader (NeoForge/Fabric), version, and playtime" },
    play_button: { title: "«PLAY / STOP» Button", description: "Main button to launch and stop the game client" },
  },
};

export const getBottomBarItemMeta = (id: BottomBarItemId, lang: "uk" | "ru" | "en" = "uk"): BottomBarItemMeta => {
  const base = BOTTOMBAR_ITEMS_META[id] || { id, title: id, description: "" };
  const loc = BOTTOMBAR_ITEMS_LOCALIZED[lang]?.[id] || BOTTOMBAR_ITEMS_LOCALIZED.uk[id] || BOTTOMBAR_ITEMS_LOCALIZED.en[id];
  if (!loc) return base;
  return {
    ...base,
    title: loc.title,
    description: loc.description,
  };
};

export const DEFAULT_TOPBAR_LAYOUT: TopBarItemId[] = [
  "profile",
  "divider_profile",
  "play",
  "settings",
  "modrinth",
  "instances",
  "servers",
  "store",
  "console",
  "divider_shortcuts",
  "shortcuts",
  "divider_friends",
  "friends",
  "chevron",
];

export const DEFAULT_BOTTOMBAR_LAYOUT: BottomBarItemId[] = [
  "instance_icon",
  "instance_title",
  "instance_tags",
  "play_button",
];

export const DEFAULT_BOTTOMBAR_ALIGNMENT: BottomBarAlignment = "center";
export const DEFAULT_BUTTON_SHAPE_PRESET: ButtonShapePreset = "tactical";

export const sanitizeTopBarLayout = (input: unknown): TopBarItemId[] => {
  if (!Array.isArray(input)) return [...DEFAULT_TOPBAR_LAYOUT];
  const validIds = new Set<TopBarItemId>(DEFAULT_TOPBAR_LAYOUT);
  const result: TopBarItemId[] = [];
  for (const item of input) {
    if (typeof item === "string" && validIds.has(item as TopBarItemId) && !result.includes(item as TopBarItemId)) {
      result.push(item as TopBarItemId);
    }
  }
  for (const item of DEFAULT_TOPBAR_LAYOUT) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
};

export const sanitizeBottomBarLayout = (input: unknown): BottomBarItemId[] => {
  if (!Array.isArray(input)) return [...DEFAULT_BOTTOMBAR_LAYOUT];
  const validIds = new Set<BottomBarItemId>(DEFAULT_BOTTOMBAR_LAYOUT);
  const result: BottomBarItemId[] = [];
  for (const item of input) {
    if (typeof item === "string" && validIds.has(item as BottomBarItemId) && !result.includes(item as BottomBarItemId)) {
      result.push(item as BottomBarItemId);
    }
  }
  for (const item of DEFAULT_BOTTOMBAR_LAYOUT) {
    if (!result.includes(item)) {
      result.push(item);
    }
  }
  return result;
};
