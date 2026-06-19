export type WebLocale = "en" | "ru";

export const WEB_NODE_TYPES = [
  "person",
  "event",
  "location",
  "organization",
  "evidence",
  "document",
  "phone",
  "note",
] as const;

export type WebNodeType = (typeof WEB_NODE_TYPES)[number];

const messages = {
  en: {
    nav: "Link Analysis",
    title: "Link Analysis",
    subtitle: "Map entities and relationships — synced across devices",
    add: "Add",
    addByName: "By name",
    addToGraph: "Add to graph",
    newNode: "New entity",
    nameLabel: "Name / title",
    namePlaceholder: "John Smith, Meeting Mar 15…",
    searchPlaceholder: "Search nodes…",
    syncSaving: "Saving…",
    syncSyncing: "Syncing…",
    syncSaved: "Synced",
    syncConflict: "Conflict — updated from server",
    syncError: "Sync error",
    syncDirty: "Unsaved changes",
    syncIdle: "All devices",
    linkTarget: "Select link target",
    linkCreated: "Link created",
    loadError: "Failed to load graph",
    retry: "Retry",
    description: "Description",
    type: "Type",
    createLink: "Create link",
    cancelLink: "Cancel link",
    connections: "Connections",
    nodesCount: (n: number, e: number) => `${n} nodes · ${e} links`,
    newPrefix: "New",
    nodeTypes: {
      person: "Person",
      event: "Event",
      location: "Location",
      organization: "Organization",
      evidence: "Fact / Evidence",
      document: "Document",
      phone: "Phone",
      note: "Note",
    } as Record<WebNodeType, string>,
    edgeTypes: {
      knows: "knows",
      related_to: "related to",
      attended: "attended",
      called: "called",
      located_at: "located at",
      works_at: "works at",
      owns: "owns",
      custom: "link",
    },
    // Legacy DB values mapped for display
    legacyNodeTypes: {
      friend: "Person",
      suspect: "Person",
    },
    legacyEdgeTypes: {
      friend_of: "related to",
      suspected: "related to",
      witnessed: "recorded",
    },
  },
  ru: {
    nav: "Паутина",
    title: "Анализ связей",
    subtitle: "Связывайте сущности — синхронизация на всех устройствах",
    add: "Добавить",
    addByName: "По имени",
    addToGraph: "Добавить на граф",
    newNode: "Новая сущность",
    nameLabel: "Имя / название",
    namePlaceholder: "Иван Петров, Встреча 15.03…",
    searchPlaceholder: "Поиск узла…",
    syncSaving: "Сохранение…",
    syncSyncing: "Синхронизация…",
    syncSaved: "Синхронизировано",
    syncConflict: "Конфликт — обновлено с сервера",
    syncError: "Ошибка синхронизации",
    syncDirty: "Есть изменения",
    syncIdle: "Все устройства",
    linkTarget: "Выберите цель связи",
    linkCreated: "Связь создана",
    loadError: "Не удалось загрузить граф",
    retry: "Повторить",
    description: "Описание",
    type: "Тип",
    createLink: "Создать связь",
    cancelLink: "Отмена связи",
    connections: "Связи",
    nodesCount: (n: number, e: number) => `${n} узлов · ${e} связей`,
    newPrefix: "Новый",
    nodeTypes: {
      person: "Человек",
      event: "Событие",
      location: "Локация",
      organization: "Организация",
      evidence: "Улика / Факт",
      document: "Документ",
      phone: "Телефон",
      note: "Заметка",
    } as Record<WebNodeType, string>,
    edgeTypes: {
      knows: "знает",
      related_to: "связан с",
      attended: "присутствовал",
      called: "звонил",
      located_at: "находится в",
      works_at: "работает в",
      owns: "владеет",
      custom: "связь",
    },
    legacyNodeTypes: {
      friend: "Человек",
      suspect: "Человек",
    },
    legacyEdgeTypes: {
      friend_of: "связан с",
      suspected: "связан с",
      witnessed: "зафиксировано",
    },
  },
} as const;

export type WebMessages = (typeof messages)[WebLocale];

export function detectWebLocale(): WebLocale {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function getWebMessages(locale: WebLocale = detectWebLocale()): WebMessages {
  return messages[locale];
}

export const NODE_EMOJI: Record<WebNodeType, string> = {
  person: "👤",
  event: "📅",
  location: "📍",
  organization: "🏢",
  evidence: "🔍",
  document: "📄",
  phone: "📱",
  note: "📝",
};

export const NODE_COLORS: Record<WebNodeType, string> = {
  person: "#FF335C",
  event: "#FF8A65",
  location: "#7CFFB2",
  organization: "#FFD166",
  evidence: "#E8E8F0",
  document: "#8A8A99",
  phone: "#FF0033",
  note: "#B8B8C8",
};

export function nodeTypeLabel(type: string, t: WebMessages): string {
  if (type in t.nodeTypes) return t.nodeTypes[type as WebNodeType];
  const legacy = t.legacyNodeTypes as Record<string, string>;
  return legacy[type] ?? type;
}

export function edgeTypeLabel(type: string, t: WebMessages): string {
  if (type in t.edgeTypes) return t.edgeTypes[type as keyof typeof t.edgeTypes];
  const legacy = t.legacyEdgeTypes as Record<string, string>;
  return legacy[type] ?? t.edgeTypes.custom;
}
