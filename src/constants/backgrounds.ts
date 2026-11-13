export interface MinecraftBackground {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  category: "shader" | "official" | "user";
}

export const MINECRAFT_BACKGROUNDS: MinecraftBackground[] = [
  {
    id: "shader_sunset",
    title: "Закат над озером",
    subtitle: "Шейдеры • Высокое разрешение",
    url: "/backgrounds/landscape_shader_sunset.png",
    category: "shader",
  },
  {
    id: "shader_mountains",
    title: "Горный хребет",
    subtitle: "Шейдеры • Альпийские вершины",
    url: "/backgrounds/landscape_shader_mountains.png",
    category: "shader",
  },
  {
    id: "shader_valley",
    title: "Долина на рассвете",
    subtitle: "Шейдеры • Зеленые холмы",
    url: "/backgrounds/landscape_shader_valley.png",
    category: "shader",
  },
  {
    id: "shader_forest",
    title: "Таёжный лес",
    subtitle: "Шейдеры • Утренний туман",
    url: "/backgrounds/landscape_shader_forest.png",
    category: "shader",
  },
  {
    id: "official_falldrop",
    title: "Осенние просторы",
    subtitle: "Minecraft Official Art",
    url: "/backgrounds/landscape_falldrop.png",
    category: "official",
  },
  {
    id: "official_pale_garden",
    title: "Бледный сад",
    subtitle: "Minecraft Official Art",
    url: "/backgrounds/landscape_pale_garden.png",
    category: "official",
  },
  {
    id: "user_shot_1",
    title: "Скриншот из игры #1",
    subtitle: "Пользовательский архив",
    url: "/backgrounds/2026-08-13_18.48.44.png",
    category: "user",
  },
  {
    id: "user_shot_2",
    title: "Скриншот из игры #2",
    subtitle: "Пользовательский архив",
    url: "/backgrounds/2026-10-04_21.59.59.png",
    category: "user",
  },
  {
    id: "user_shot_3",
    title: "Скриншот из игры #3",
    subtitle: "Пользовательский архив",
    url: "/backgrounds/2026-10-08_21.42.23.png",
    category: "user",
  },
  {
    id: "user_shot_4",
    title: "Скриншот из игры #4",
    subtitle: "Пользовательский архив",
    url: "/backgrounds/2026-08-18_00.41.33.png",
    category: "user",
  },
  {
    id: "user_shot_5",
    title: "Скриншот из игры #5",
    subtitle: "Пользовательский архив",
    url: "/backgrounds/2026-10-17_17.26.28.png",
    category: "user",
  },
];
