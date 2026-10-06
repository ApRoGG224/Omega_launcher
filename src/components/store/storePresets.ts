import type { SkinModel } from "../../hooks/useSkin";

export interface PresetSkin {
  id: string;
  nameRu: string;
  nameEn: string;
  model: SkinModel;
  url: string;
  avatarUrl: string;
  tag: string;
  descriptionRu: string;
}

export interface PresetCape {
  id: string;
  nameRu: string;
  nameEn: string;
  url: string;
  previewColor: string;
  tag: string;
  descriptionRu: string;
}

export const PRESET_SKINS: PresetSkin[] = [
  {
    id: "steve",
    nameRu: "Классический Стив",
    nameEn: "Classic Steve",
    model: "classic",
    url: "https://minotar.net/skin/MHF_Steve",
    avatarUrl: "https://minotar.net/avatar/MHF_Steve/64",
    tag: "Классика",
    descriptionRu: "Оригинальный скин Стива с широкими плечами",
  },
  {
    id: "alex",
    nameRu: "Алекс",
    nameEn: "Slim Alex",
    model: "slim",
    url: "https://minotar.net/skin/MHF_Alex",
    avatarUrl: "https://minotar.net/avatar/MHF_Alex/64",
    tag: "Классика",
    descriptionRu: "Изящная модель Slim с тонкими руками",
  },
  {
    id: "herobrine",
    nameRu: "Херобрин",
    nameEn: "Herobrine",
    model: "classic",
    url: "https://minotar.net/skin/MHF_Herobrine",
    avatarUrl: "https://minotar.net/avatar/MHF_Herobrine/64",
    tag: "Легенда",
    descriptionRu: "Мифический персонаж с белыми глазами",
  },
  {
    id: "creeper",
    nameRu: "Крипер",
    nameEn: "Creeper",
    model: "classic",
    url: "https://minotar.net/skin/MHF_Creeper",
    avatarUrl: "https://minotar.net/avatar/MHF_Creeper/64",
    tag: "Моб",
    descriptionRu: "Знаменитый взрывной зеленый камуфляж",
  },
  {
    id: "enderman",
    nameRu: "Эндермен",
    nameEn: "Enderman",
    model: "classic",
    url: "https://minotar.net/skin/MHF_Enderman",
    avatarUrl: "https://minotar.net/avatar/MHF_Enderman/64",
    tag: "Моб",
    descriptionRu: "Тёмный странник Края с фиолетовыми глазами",
  },
  {
    id: "golem",
    nameRu: "Железный Голем",
    nameEn: "Iron Golem",
    model: "classic",
    url: "https://minotar.net/skin/MHF_Golem",
    avatarUrl: "https://minotar.net/avatar/MHF_Golem/64",
    tag: "Защитник",
    descriptionRu: "Могучий защитник деревень в прочных доспехах",
  },
  {
    id: "blaze",
    nameRu: "Ифрит",
    nameEn: "Blaze",
    model: "classic",
    url: "https://minotar.net/skin/MHF_Blaze",
    avatarUrl: "https://minotar.net/avatar/MHF_Blaze/64",
    tag: "Огонь",
    descriptionRu: "Пылающий обитатель адских крепостей Незера",
  },
  {
    id: "villager",
    nameRu: "Житель",
    nameEn: "Villager",
    model: "classic",
    url: "https://minotar.net/skin/MHF_Villager",
    avatarUrl: "https://minotar.net/avatar/MHF_Villager/64",
    tag: "Торговец",
    descriptionRu: "Опытный торговец редкими изумрудами",
  },
];

export const PRESET_CAPES: PresetCape[] = [
  {
    id: "omega_emerald",
    nameRu: "Изумрудный Omega",
    nameEn: "Omega Emerald",
    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAVklEQVR4nO3QsQ3AIBAEQUqgZcqiDIpwEySQ2gkmQQgxI132yW+IObVVCycQQAABBHiv1Oez0YN/t7t/myKAAAIIIIAAAizZ7t+mCCCAAHcHAAAA4EIdWY0Lyzo2/+UAAAAASUVORK5CYII=",
    previewColor: "#10b981",
    tag: "Фирменный",
    descriptionRu: "Эксклюзивный изумрудный плащ лаунчера Omega",
  },
  {
    id: "cyberpunk",
    nameRu: "Кибер Неон",
    nameEn: "Cyberpunk Neon",
    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAYklEQVR4nO3TwQnAIBAEQDvI0x7SfyVpSN8BIffIcYgzIPjw4S5su/o9sk7bgQIUoID3p5+xvC8DfrytzhaSFX7LAv4uojpbiAmYgAmYgAmYgAmknOpsIQpQwOEFAAAAcKAJ5aZaCfeW3B0AAAAASUVORK5CYII=",
    previewColor: "#00d2ff",
    tag: "Неон",
    descriptionRu: "Геометрический неоновый узор в стиле киберпанк",
  },
  {
    id: "mojang",
    nameRu: "Mojang Studios",
    nameEn: "Mojang Studios",
    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAATElEQVR4nO3VsQkAIAwAQWdwHmd3NW0sFdKISO4gXZp8k9JrG7em/EAAAQQQQIA1J7vjIruvbwsRQAABBBDAGxRAAAEESBoAAACAhCYk3tnAsOuXVgAAAABJRU5ErkJggg==",
    previewColor: "#be123c",
    tag: "Официальный",
    descriptionRu: "Легендарный красный плащ с эмблемой разработчиков",
  },
  {
    id: "optifine",
    nameRu: "Optifine",
    nameEn: "Optifine",
    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAT0lEQVR4nO3QMQ4AEBBFQSfRO4P7n4sotLIKETGT/Gg0+1IutZ1aeoEAAgggwNywenf/3r4tRAABBBBAAAEEOLLbt4UIIIAAfwcAAADgQx0mTg2MWM51KgAAAABJRU5ErkJggg==",
    previewColor: "#1e293b",
    tag: "Популярный",
    descriptionRu: "Классический плащ Optifine с белыми буквами OF",
  },
  {
    id: "elyby",
    nameRu: "Ely.by",
    nameEn: "Ely.by",
    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAATklEQVR4nO3UsQkAIAwAQZdxMsd3CK3sFNKISO4gnU2eYKmtj1tTfiCAAAIIsOZkt1zk7evdQlyAAAL4A1yAAAL4A1yAAALkDAAAAEBCE0/GLAHe7FP/AAAAAElFTkSuQmCC",
    previewColor: "#2563eb",
    tag: "Сообщество",
    descriptionRu: "Официальный плащ системы скинов Ely.by",
  },
  {
    id: "minecon2011",
    nameRu: "Minecon 2011",
    nameEn: "Minecon 2011",
    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAUElEQVR4nO3VsQkAIAwAQccI6P47OJ12VhZpRMQ7SGeRfGPprY1TU14ggAACrIUj6nZ2x2Xe3r4tRQABBBBAAN+gAAIIIIAAAnwZAAAAgA9NZHDzj5IJgp8AAAAASUVORK5CYII=",
    previewColor: "#b91c1c",
    tag: "Раритет",
    descriptionRu: "Первый плащ Minecon с красным крипером",
  },
  {
    id: "minecon2012",
    nameRu: "Minecon 2012",
    nameEn: "Minecon 2012",
    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAYElEQVR4nO3SMQqAMBBFwZR2lt7B63srLxEhYBd0U4RFnIHtUvgflnXb66wrX9D78PNY2kVGPr3N3hYigAACCPD7APeItxt9m70txB8ggAACCCCAAAIIMOGytwEAAEDfBSnKiHH7bQ/WAAAAAElFTkSuQmCC",
    previewColor: "#eab308",
    tag: "Раритет",
    descriptionRu: "Знаменитый плащ с золотой киркой",
  },
  {
    id: "minecon2013",
    nameRu: "Minecon 2013",
    nameEn: "Minecon 2013",
    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAV0lEQVR4nO3QsQ3AIBAEQSohpwbadAdugu4gJrFJ0AsxI11GwG/KpfZdSycQQAABpk8/b5v2deDf2+jblggggAACCCCAAAIIsGHRty0RQIDLAwAAAHChAeKM4M3pB4RmAAAAAElFTkSuQmCC",
    previewColor: "#64748b",
    tag: "Раритет",
    descriptionRu: "Технический плащ Minecon с поршнем",
  },
  {
    id: "minecon2015",
    nameRu: "Minecon 2015",
    nameEn: "Minecon 2015",
    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAU0lEQVR4nO3VoQ3AIBRFUSbpIIzImCgkG4AF02JIQzgneQ7zryE8MbVdCycQQAABBBiXS532duDX279vWyKAAAIIIIBvUAABBBBAgDsDAAAAcKEOSExijDEDZtUAAAAASUVORK5CYII=",
    previewColor: "#1e3a8a",
    tag: "Раритет",
    descriptionRu: "Синий плащ Minecon с железным големом",
  },
  {
    id: "minecon2016",
    nameRu: "Minecon 2016",
    nameEn: "Minecon 2016",
    url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAUUlEQVR4nO3WsQ0AEBRFURso7WAfO9pQSaVTaETEOcnrNP9WQky5n1p4gQACCCDAXC1tudVxO29v37ZFAAEEEEAAAQTwERJAAAH+DAAAAMCHBoEiu2FmKpW5AAAAAElFTkSuQmCC",
    previewColor: "#7e22ce",
    tag: "Раритет",
    descriptionRu: "Фиолетовый плащ Minecon с эмблемой Эндермена",
  },
];
