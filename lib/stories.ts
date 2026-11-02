/**
 * RAFTAR travel journal content.
 *
 * There is no admin-authored Story model in this build, so the journal is composed from
 * RAFTAR's own editorial writing about Northeast India. Each story can link to the live
 * trips and destination pages it belongs to — no customer media is shown without consent.
 */

export type StorySection = { heading?: string; paragraphs: string[] };

export type Story = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  coverImage: string;
  source: "RAFTAR Original" | "Travel Film" | "Photography" | "Destination Story" | "Local Culture" | "Adventure";
  readingTime: string;
  destinationSlug?: string;
  destinationName?: string;
  sections: StorySection[];
};

function storyImage(prompt: string, size: "landscape_16_9" | "portrait_4_3" | "square_hd" = "landscape_16_9") {
  return `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;
}

export const STORIES: Story[] = [
  {
    slug: "the-living-root-bridges-of-meghalaya",
    title: "The Living Root Bridges of Meghalaya",
    category: "RAFTAR Original",
    source: "RAFTAR Original",
    readingTime: "6 min read",
    destinationSlug: "meghalaya",
    destinationName: "Meghalaya",
    excerpt:
      "In the wet hills above Cherrapunji, bridges are not built but grown — trained across rivers over decades by the Khasi and Jaintia communities who still cross them every day.",
    coverImage: storyImage(
      "A moss covered living root bridge grown from rubber tree roots spanning a clear rainforest stream in Meghalaya India, soft misty morning light, cinematic travel photography, deep greens",
    ),
    sections: [
      {
        paragraphs: [
          "The first thing you notice is not the bridge. It is the quiet — the river underneath, the drip of rain held in the canopy, the ficus roots thick as a forearm that someone, generations ago, guided across a gap so that a village could reach the other side.",
          "Living root bridges are exactly what they sound like. Rather than cut timber or pour concrete, the Khasi and Jaintia people train the aerial roots of the Indian rubber tree across a stream, then wait. A bridge you can trust with a person takes thirty years. A strong one takes a hundred. What we walk across in an afternoon is a decision made before our grandparents were born.",
        ],
      },
      {
        heading: "How the double-decker came to be",
        paragraphs: [
          "At Nongriat, two crossings sit stacked over the same water. The lower deck is older and carries the weight of daily crossings; the upper was added later, when the community needed more clearance in the monsoon. Nothing about it is decorative. Every root is doing a job.",
          "This is why we walk slowly here. A RAFTAR trip to Meghalaya keeps the descent to the double-decker as a full day, with a local guide who grew up on these paths, so there is time to understand the engineering instead of photographing it and leaving.",
        ],
      },
      {
        heading: "Travelling well in the wettest place on earth",
        paragraphs: [
          "Meghalaya rewards the unfussy traveller. Bring shoes that can be wet for days, a dry bag for your camera, and a willingness to adjust plans when a landslide closes a road. The rain is the reason the forests are the way they are — and the reason the gallery you bring home looks like nowhere else in India.",
          "Photography here is less about golden hour and more about patience: waiting for the mist to lift off the valley at Umngot, or for a shaft of light to find the inside of a cave. Our photographers travel with the group precisely so those moments are not missed.",
        ],
      },
    ],
  },
  {
    slug: "umngot-river-and-the-clear-water-season",
    title: "Umngot River and the Clear-Water Season",
    category: "Destination Story",
    source: "Destination Story",
    readingTime: "5 min read",
    destinationSlug: "meghalaya",
    destinationName: "Meghalaya",
    excerpt:
      "For a few months each year the Umngot runs so clear that boats appear to float on air. The window is real, seasonal and short — and worth planning an entire trip around.",
    coverImage: storyImage(
      "A small wooden boat on the crystal clear Umngot river near Shnongpdeng Meghalaya, stones visible on the riverbed, lush forested banks, high clarity travel photography",
    ),
    sections: [
      {
        paragraphs: [
          "On a still morning at Shnongpdeng, the riverbed reads like a photograph of itself. Every stone is legible six feet down. Fishermen push their boats out and the hulls seem to hover.",
          "The clarity depends on the season. In the dry months between late autumn and early spring, sediment settles and the Umngot turns to glass. By monsoon it runs high and brown. There is no way to fake it, which is precisely why a well-planned trip is the only way to see it at its best.",
        ],
      },
      {
        heading: "What a good day on the Umngot looks like",
        paragraphs: [
          "Mornings are for the water — kayaking, a slow row, or simply sitting where the light is flat and the river behaves. Afternoons are for the suspension bridge, the walk to nearby villages, and the kind of long, unhurried lunch that a group trip makes possible.",
          "Because RAFTAR publishes complete, date-specific departures, Umngot trips are scheduled inside the clear-water window rather than promised year-round. If the dates are on the calendar, the season is right.",
        ],
      },
    ],
  },
  {
    slug: "kaziranga-before-the-grass-grows-tall",
    title: "Kaziranga, Before the Grass Grows Tall",
    category: "Photography",
    source: "Photography",
    readingTime: "7 min read",
    destinationSlug: "assam",
    destinationName: "Assam",
    excerpt:
      "Between the dry season and the first floods, Kaziranga's grasslands are short enough to see everything. A photographer's guide to the best window for the one-horned rhino.",
    coverImage: storyImage(
      "A greater one horned rhinoceros standing in tall golden grassland at Kaziranga National Park Assam at sunrise, distant mist, wildlife travel photography",
    ),
    sections: [
      {
        paragraphs: [
          "Kaziranga is famous for a number — roughly two-thirds of the world's greater one-horned rhinos live inside its boundaries — but what matters to a photographer is the height of the grass. When the elephant grass is short, the park opens up. When it grows, the animals vanish into it and you ride for hours on a whisper.",
          "The sweet spot falls between the receding winter and the arriving monsoon. Mornings start cold and clear on the jeep track; by mid-morning the light has gone flat and the birds take over.",
        ],
      },
      {
        heading: "Riding, waiting, and the ethics of the frame",
        paragraphs: [
          "A good safari is mostly waiting. Two jeeps, a shared radio, and a guide who reads pug marks will always beat a rushed circuit of the park. We travel in small groups so everyone gets a clear line of sight and nobody has to elbow past a stranger for the shot.",
          "RAFTAR's rule on wildlife is simple: we do not bait, we do not crowd, and we keep to the tracks. The photographs from a Kaziranga trip are worth less if they cost the animal its peace.",
        ],
      },
      {
        heading: "Beyond the rhino",
        paragraphs: [
          "Look past the headline animal and Kaziranga is a bird park in disguise. Hornbills, adjutants, pelicans and the endangered Bengal florican all share the floodplain. A slow morning on the eastern range is often the best of the trip.",
        ],
      },
    ],
  },
  {
    slug: "tawang-monastery-and-the-road-that-earns-it",
    title: "Tawang, and the Road That Earns It",
    category: "Adventure",
    source: "Adventure",
    readingTime: "6 min read",
    destinationSlug: "arunachal-pradesh",
    destinationName: "Arunachal Pradesh",
    excerpt:
      "The monastery at Tawang sits at 10,000 feet, behind a pass that keeps its own weather. Getting there is the pilgrimage; the destination is the reward.",
    coverImage: storyImage(
      "The large white Tawang Monastery in Arunachal Pradesh India on a hillside, prayer flags, snow capped Himalayan peaks behind, dramatic mountain light",
    ),
    sections: [
      {
        paragraphs: [
          "Sela Pass does not negotiate. At over 13,000 feet it decides whether you reach Tawang today or tomorrow, and in winter it decides whether you reach it at all. Every trip to Tawang is written in pencil.",
          "What waits on the other side is the largest monastery in India and the second largest in the world — a walled complex of white and ochre above the Tawang Chu, home to hundreds of monks and a library of scriptures older than most countries' borders.",
        ],
      },
      {
        heading: "Preparing for altitude honestly",
        paragraphs: [
          "We build acclimatisation into the itinerary rather than pushing straight through, and we keep permits in order well before departure. Inner Line Permits are unavoidable in Arunachal and are far easier handled by a team that files them for every member of the group.",
          "The advice we give is unglamorous: sleep low the first night, drink more water than you think you need, and treat the pass with respect. The reward is a morning of butter lamps and low chanting that no photograph quite carries.",
        ],
      },
    ],
  },
  {
    slug: "a-night-at-the-hornbill-festival",
    title: "A Night at the Hornbill Festival",
    category: "Local Culture",
    source: "Local Culture",
    readingTime: "5 min read",
    destinationSlug: "nagaland",
    destinationName: "Nagaland",
    excerpt:
      "Every December the Naga tribes gather at Kisama. For ten days, heritage is not a museum word — it is danced, sung and cooked in the open.",
    coverImage: storyImage(
      "Naga tribal dancers in traditional red and black attire with feathered headdresses performing at the Hornbill Festival in Kisama Nagaland, festive daylight",
    ),
    sections: [
      {
        paragraphs: [
          "The Hornbill Festival is often called the festival of festivals, and the cliché survives because it is accurate. Sixteen tribes, one village of reconstructed morungs, and a programme that runs from early morning log-drums to late-night bamboo music.",
          "It is also crowded, and the best experience is a considered one: go early, go on a weekday, learn a few words, and give the performers the courtesy of watching rather than immediately filming.",
        ],
      },
      {
        heading: "Culture, photographed with consent",
        paragraphs: [
          "Festival photography is a privileged act. Our crews ask before they shoot portraits, and consent for anything we might publish is collected separately from consent to photograph. What you see in a RAFTAR gallery is there because someone agreed to it.",
        ],
      },
    ],
  },
];

export function listStories() {
  return STORIES;
}

export function getStory(slug: string) {
  return STORIES.find((story) => story.slug === slug) ?? null;
}
