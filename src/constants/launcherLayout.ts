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
  | "chevron"
  | "character_toggle";

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
  character_toggle: {
    id: "character_toggle",
    title: "3D-персонаж",
    category: "navigation",
    description: "Переключатель отображения ходящего 3D-персонажа",
  },
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
  const validIds = new Set<TopBarItemId>([...DEFAULT_TOPBAR_LAYOUT, "character_toggle"]);
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
