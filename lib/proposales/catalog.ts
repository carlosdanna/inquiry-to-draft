// Demo content library for "Hotel Skeppsholmen Demo".
// Proposales content items have no price field, so the price in Swedish
// kronor lives here. The seed script adds it to each description, and
// proposal creation can send it as a block price override.

export type CatalogCategory =
  | "Meeting space"
  | "Catering"
  | "Room"
  | "Equipment"
  | "Package";

export type CatalogItem = {
  category: CatalogCategory;
  title: string;
  description: string;
  priceSek: number;
  unit: string;
  capacity?: number;
};

export const CATALOG_NAME = "Hotel Skeppsholmen Demo";
export const CATALOG_LANGUAGE = "en";

export const CATALOG: CatalogItem[] = [
  {
    category: "Meeting space",
    title: "Boardroom",
    description:
      "Private boardroom for up to 12 people around one oak table, with daylight over the harbour, a 75 inch screen, whiteboard and blackout blinds.",
    priceSek: 6500,
    unit: "per day",
    capacity: 12,
  },
  {
    category: "Meeting space",
    title: "Harbour Room",
    description:
      "Flexible meeting room for up to 50 people with harbour views. Can be set as theatre, classroom or cabaret, with a built-in projector and sound system.",
    priceSek: 18500,
    unit: "per day",
    capacity: 50,
  },
  {
    category: "Meeting space",
    title: "Grand Hall",
    description:
      "Our largest space, for up to 150 people seated or 200 standing. High ceilings, stage, dance floor and its own entrance. Suited to conferences, gala dinners and weddings.",
    priceSek: 45000,
    unit: "per day",
    capacity: 150,
  },
  {
    category: "Catering",
    title: "Coffee break",
    description:
      "Freshly brewed coffee, a selection of teas, still and sparkling water, cinnamon buns and seasonal fruit, served in or next to your meeting room.",
    priceSek: 95,
    unit: "per person",
  },
  {
    category: "Catering",
    title: "Conference lunch",
    description:
      "Two-course lunch in the restaurant with a seasonal main, salad buffet, bread, water or light beer, and coffee with something sweet.",
    priceSek: 325,
    unit: "per person",
  },
  {
    category: "Catering",
    title: "Three-course dinner",
    description:
      "Seasonal three-course dinner from our head chef, built on Swedish produce. Wine pairing can be added.",
    priceSek: 695,
    unit: "per person",
  },
  {
    category: "Catering",
    title: "Wedding dinner package",
    description:
      "Welcome drink with canapés, three-course wedding dinner, wine pairing, wedding cake and coffee, plus a late-night snack.",
    priceSek: 1450,
    unit: "per person",
  },
  {
    category: "Catering",
    title: "Vegetarian menu",
    description:
      "Plant-forward three-course menu that can replace any set menu. Vegan, gluten-free and lactose-free versions available on request.",
    priceSek: 645,
    unit: "per person",
  },
  {
    category: "Room",
    title: "Standard double room",
    description:
      "Quiet 20 square metre double room facing the courtyard, with a queen-size bed, rain shower and breakfast buffet included.",
    priceSek: 1790,
    unit: "per night",
  },
  {
    category: "Room",
    title: "Superior double room",
    description:
      "Spacious 28 square metre double room with water views, a king-size bed, seating area, espresso machine and breakfast buffet included.",
    priceSek: 2390,
    unit: "per night",
  },
  {
    category: "Room",
    title: "Suite",
    description:
      "55 square metre corner suite with a separate living room, panoramic views over Strömmen, bathtub, minibar and breakfast buffet included.",
    priceSek: 4900,
    unit: "per night",
  },
  {
    category: "Equipment",
    title: "Projector and screen",
    description:
      "Full HD projector with a 3 metre screen, wireless screen sharing and connectors for HDMI and USB-C. Set up and tested before you arrive.",
    priceSek: 1200,
    unit: "per day",
  },
  {
    category: "Equipment",
    title: "Microphone set",
    description:
      "Two wireless handheld microphones, one headset microphone and a mixer connected to the room's sound system.",
    priceSek: 950,
    unit: "per day",
  },
  {
    category: "Package",
    title: "Full-day conference package",
    description:
      "Meeting room, morning and afternoon coffee breaks, conference lunch, projector and screen, water and notepads, and wifi for the whole day.",
    priceSek: 895,
    unit: "per person",
  },
  {
    category: "Package",
    title: "Wedding package",
    description:
      "Grand Hall for the evening, welcome drink, wedding dinner package, dance floor with sound system, a coordinator on the day and a suite for the couple.",
    priceSek: 1950,
    unit: "per person",
  },
  {
    category: "Package",
    title: "Offsite day package",
    description:
      "Harbour Room for the day, coffee breaks, lunch, an afternoon activity on Skeppsholmen with a guide, and an after-work drink in the bar.",
    priceSek: 1250,
    unit: "per person",
  },
];

// Used only if Proposales rejects content without an image.
export const CATEGORY_IMAGE_URLS: Record<CatalogCategory, string> = {
  "Meeting space": "https://picsum.photos/seed/skeppsholmen-meeting/1200/800.jpg",
  Catering: "https://picsum.photos/seed/skeppsholmen-catering/1200/800.jpg",
  Room: "https://picsum.photos/seed/skeppsholmen-room/1200/800.jpg",
  Equipment: "https://picsum.photos/seed/skeppsholmen-equipment/1200/800.jpg",
  Package: "https://picsum.photos/seed/skeppsholmen-package/1200/800.jpg",
};

const kronorFormat = new Intl.NumberFormat("sv-SE");

export function formatPriceSek(item: CatalogItem): string {
  return `${kronorFormat.format(item.priceSek)} SEK ${item.unit}`;
}

// The description stored in Proposales, with the price appended.
export function catalogDescription(item: CatalogItem): string {
  return `${item.description}\n\nPrice: ${formatPriceSek(item)}.`;
}

export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

export function findCatalogItem(title: string): CatalogItem | undefined {
  const wanted = normalizeTitle(title);
  return CATALOG.find((item) => normalizeTitle(item.title) === wanted);
}
