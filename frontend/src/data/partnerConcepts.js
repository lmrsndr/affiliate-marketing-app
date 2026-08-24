const DEFAULT_CONCEPT = {
  eyebrow: "A considered shop window",
  headline: "A distinctive point of view, made easy to explore",
  introduction: "BundleBee would introduce this partner through a concise editorial story, then offer a deliberately small set of ways into the collection.",
  moods: ["meaningful", "unexpected", "beautifully useful"],
  occasions: ["birthday", "thank you", "someone hard to buy for"],
  windows: [
    { title: "The signature edit", text: "A few pieces that express the character of the collection at a glance." },
    { title: "The story behind it", text: "The craft, materials and point of view that make the work worth discovering." },
    { title: "Choose by feeling", text: "A human route into the range: who it is for, how it should feel and why it fits the moment." },
  ],
  curatorNote: "The concept gives the partner room to feel like a shop with a story—not another row in a product directory.",
};

const CONCEPTS = [
  {
    match: ["pippa small"],
    eyebrow: "Jewellery with a life beyond the occasion",
    headline: "Treasured pieces, chosen for meaning rather than symmetry",
    introduction: "An intimate edit built around handmade character, natural forms and jewellery that can become part of someone’s personal story.",
    moods: ["elegant", "meaningful", "one of a kind"],
    occasions: ["anniversary", "milestone birthday", "a deeply personal thank you"],
    windows: [
      { title: "Modern talismans", text: "Pieces selected for symbolism, intimacy and the feeling of being kept for years." },
      { title: "Beauty in the irregular", text: "An editorial moment about handwork, natural stones and forms that retain their individuality." },
      { title: "For the quietly individual", text: "A route for someone who values provenance and character over obvious luxury." },
    ],
    curatorNote: "Pippa Small fits BundleBee when the jewellery is presented as a world of craft and values—not an exhaustive catalogue.",
  },
  {
    match: ["moyses stevens", "moyses flowers"],
    eyebrow: "Floristry as atmosphere",
    headline: "A gesture remembered long after the flowers arrive",
    introduction: "A window into sculptural floristry for meaningful occasions, led by mood, colour and the emotion behind the gift.",
    moods: ["elegant", "romantic", "unexpected"],
    occasions: ["anniversary", "birthday", "just because"],
    windows: [
      { title: "Quiet romance", text: "Soft, considered arrangements for gestures that should feel personal rather than predictable." },
      { title: "A room-changing gift", text: "Bolder compositions chosen for presence, shape and the atmosphere they create." },
      { title: "Say it without overexplaining", text: "A simple emotional route for apology, gratitude, celebration or affection." },
    ],
    curatorNote: "The strength is not the number of bouquets; it is the ability to match a floral mood to a human moment.",
  },
  {
    match: ["argento"],
    eyebrow: "Jewellery for everyday milestones",
    headline: "Small pieces that make the moment feel properly marked",
    introduction: "An approachable jewellery edit organised by personality and occasion, with the emphasis on thoughtful selection rather than endless choice.",
    moods: ["elegant", "playful", "meaningful"],
    occasions: ["birthday", "anniversary", "friendship"],
    windows: [
      { title: "A little celebration", text: "Bright, wearable pieces for birthdays and everyday wins." },
      { title: "Keep it close", text: "Personal motifs and understated forms with keepsake potential." },
      { title: "Easy elegance", text: "Polished gifts that feel special without becoming formal." },
    ],
    curatorNote: "BundleBee would narrow the range into useful emotional edits instead of recreating a jewellery department.",
  },
  {
    match: ["partylite"],
    eyebrow: "Scent, glow and a change of pace",
    headline: "A small ritual for making home feel different tonight",
    introduction: "A sensory shop window pairing fragrance and candlelight with the atmosphere someone wants to create at home.",
    moods: ["cosy", "restorative", "celebratory"],
    occasions: ["new home", "thank you", "winter evening"],
    windows: [
      { title: "Slow the room down", text: "Calm fragrance notes and a softer glow for evenings that need less noise." },
      { title: "Make it feel festive", text: "Warm, joyful combinations for hosting and seasonal rituals." },
      { title: "The useful indulgence", text: "A gift that is decorative, usable and easy to enjoy immediately." },
    ],
    curatorNote: "The editorial opportunity is to sell an atmosphere, while keeping clearance items and catalogue bulk out of the window.",
  },
  {
    match: ["infinityxinfinity", "infinity x infinity"],
    eyebrow: "Limited-run jewellery with human marks",
    headline: "Handmade pieces for someone who does not want everyone else’s",
    introduction: "A close-up view of artisan-made jewellery, natural gemstones and the pleasure of small variations between pieces.",
    moods: ["one of a kind", "elegant", "expressive"],
    occasions: ["anniversary", "milestone", "self-gift"],
    windows: [
      { title: "The gemstone edit", text: "Colour, texture and natural variation used as the starting point for discovery." },
      { title: "Made by hand", text: "The makers, methods and details that separate the work from machine-made jewellery." },
      { title: "Only a few", text: "Limited quantities framed as individuality, not artificial urgency." },
    ],
    curatorNote: "The handmade and limited-run story is a natural BundleBee fit when supported with specific, verifiable detail.",
  },
  {
    match: ["curious egg"],
    eyebrow: "Art at the soul of the room",
    headline: "Interiors that begin with curiosity, not a matching set",
    introduction: "An artist-curated world of objects and artworks, explored through atmosphere, character and the conversations they start.",
    moods: ["unexpected", "expressive", "one of a kind"],
    occasions: ["new home", "wedding", "someone creatively fearless"],
    windows: [
      { title: "The conversation piece", text: "Objects and art with enough character to change the energy of a room." },
      { title: "A home with an inner life", text: "Layered finds for people who want rooms to feel collected rather than styled by formula." },
      { title: "Small art, big effect", text: "Accessible ways to give an artist-led object without needing to know someone’s exact décor plan." },
    ],
    curatorNote: "Curious Egg embodies the shop-window idea: a strong curatorial voice is more useful here than a conventional product grid.",
  },
  {
    match: ["t. h. baker", "t.h. baker", "th baker"],
    eyebrow: "Milestone gifts, edited with restraint",
    headline: "A clearer way through jewellery and watches",
    introduction: "A focused occasion-led edit that helps a customer move past brand and price filters to the meaning of the gift.",
    moods: ["elegant", "lasting", "significant"],
    occasions: ["anniversary", "graduation", "milestone birthday"],
    windows: [
      { title: "Mark the year", text: "Enduring choices for anniversaries, graduations and important birthdays." },
      { title: "Understated signatures", text: "Pieces selected for everyday longevity rather than conspicuous branding." },
      { title: "A considered second life", text: "Pre-owned watches framed through craft, condition and lasting design." },
    ],
    curatorNote: "This works best as a tightly edited milestone destination, not a mirror of a large multi-brand retailer.",
  },
  {
    match: ["puzzleyou", "puzzle you"],
    eyebrow: "A memory you can spend time with",
    headline: "Turn a shared photograph into an evening together",
    introduction: "A personalised-gift concept that focuses on the story in the image and the ritual of assembling it, not only the printed object.",
    moods: ["meaningful", "playful", "personal"],
    occasions: ["anniversary", "family birthday", "Christmas"],
    windows: [
      { title: "The place you remember", text: "Travel, wedding and home photographs chosen for the memory attached to them." },
      { title: "A family story", text: "An intergenerational gift that becomes time spent together." },
      { title: "A satisfying challenge", text: "Difficulty and scale matched to the person, so personalisation remains enjoyable." },
    ],
    curatorNote: "The emotional value comes from the chosen memory and shared experience; the product is simply the medium.",
  },
  {
    match: ["ink & drop", "ink and drop"],
    eyebrow: "Walls with something to say",
    headline: "Art chosen for personality, not for filling a blank space",
    introduction: "A graphic, mood-led edit of prints designed to help people find the piece that sets the tone for a room.",
    moods: ["playful", "bold", "unexpected"],
    occasions: ["new home", "birthday", "creative workspace"],
    windows: [
      { title: "Set the tone", text: "Strong colour and typography for rooms that need energy or humour." },
      { title: "The personal reference", text: "A visual in-joke, interest or shared memory that makes wall art giftable." },
      { title: "Build a small gallery", text: "A few complementary directions without turning the page into a poster catalogue." },
    ],
    curatorNote: "The best route is through visual personality and room mood, supported by a tightly controlled edit.",
  },
  {
    match: ["venchi"],
    eyebrow: "Italian chocolate with a sense of occasion",
    headline: "A generous little theatre of texture, colour and hazelnut",
    introduction: "A celebratory chocolate window organised around sharing, presentation and the moment it is meant to create.",
    moods: ["indulgent", "elegant", "joyful"],
    occasions: ["thank you", "celebration", "hosting"],
    windows: [
      { title: "The beautiful box", text: "Gifts where the reveal and presentation are part of the pleasure." },
      { title: "A taste of Piedmont", text: "Hazelnut-led traditions and signature textures introduced through their origins." },
      { title: "Pass it around", text: "Selections designed for sharing at a table, office or family gathering." },
    ],
    curatorNote: "Venchi belongs in a celebratory food edit, with official affiliate offers only and no voucher-led presentation.",
  },
  {
    match: ["detective society"],
    eyebrow: "A mystery arrives at the door",
    headline: "Give them a story they have to solve together",
    introduction: "An experience-first gift window that captures the anticipation, evidence and conversation of an at-home investigation.",
    moods: ["unexpected", "playful", "absorbing"],
    occasions: ["birthday", "date night", "family gathering"],
    windows: [
      { title: "Open the case", text: "The premise and first clues set the tone without spoiling the mystery." },
      { title: "Choose your detectives", text: "A route by group size, pace and appetite for difficulty." },
      { title: "An evening, not an object", text: "The shared experience and conversation are placed ahead of the box itself." },
    ],
    curatorNote: "This is exactly the sort of gift that benefits from selling the feeling of the experience rather than listing its contents.",
  },
  {
    match: ["anisa sojka"],
    eyebrow: "A small ritual of getting ready",
    headline: "Accessories that turn the finishing touch into the main event",
    introduction: "A tactile style window built around expressive hair accessories and jewellery that make an everyday routine feel intentional.",
    moods: ["elegant", "confident", "playful"],
    occasions: ["birthday", "bridesmaid", "self-gift"],
    windows: [
      { title: "The five-minute transformation", text: "Easy statement pieces that change a look without needing a new wardrobe." },
      { title: "Polished, not precious", text: "Giftable accessories that feel elevated while remaining easy to wear." },
      { title: "Ready together", text: "A social, celebratory edit for friends, parties and wedding mornings." },
    ],
    curatorNote: "The editorial hook is the feeling and ritual of wearing the pieces—not a long list of near-identical accessories.",
  },
  {
    match: ["hiut denim"],
    eyebrow: "One town, one craft, one very good pair of jeans",
    headline: "Made slowly by people who know exactly what good denim requires",
    introduction: "A maker-first window into Cardigan’s jeans-making craft, long-wearing materials and the people whose skill gives each pair its value.",
    moods: ["beautifully useful", "authentic", "lasting"],
    occasions: ["milestone birthday", "partner", "buy once, wear often"],
    windows: [
      { title: "Meet the GrandMasters", text: "The human skill and local manufacturing story leads the page." },
      { title: "Choose your denim", text: "A small, intelligible guide to cloth, cut and how each pair will change with wear." },
      { title: "The long relationship", text: "Durability, repair and personal fading framed as part of the gift." },
    ],
    curatorNote: "Hiut is a model BundleBee partner: a clear point of view, skilled making and a product made more valuable by knowing its story.",
  },
  {
    match: ["bookkind"],
    eyebrow: "A book chosen for the person—and for something beyond the gift",
    headline: "Stories worth giving, with generosity built into the purchase",
    introduction: "A recipient-led bookshop window connecting a carefully chosen read with the cause and human gesture behind it.",
    moods: ["meaningful", "thoughtful", "quietly joyful"],
    occasions: ["birthday", "new baby", "thank you"],
    windows: [
      { title: "For their inner world", text: "Books grouped by curiosity, comfort, humour and the kind of escape the recipient would enjoy." },
      { title: "A gift with a second effect", text: "The giving model is explained clearly and factually, without turning the page into a claim-heavy campaign." },
      { title: "A handwritten-feeling edit", text: "A small shelf of recommendations that feels like advice from a thoughtful bookseller." },
    ],
    curatorNote: "BookKind qualifies through giftability and purpose, but the selection should stay human-sized rather than becoming a general book catalogue.",
  },
];

function cloneConcept(concept) {
  return {
    ...concept,
    moods: [...concept.moods],
    occasions: [...concept.occasions],
    windows: concept.windows.map((window) => ({ ...window })),
  };
}

export function conceptForProgramme(name) {
  const normalisedName = String(name || "").toLowerCase();
  const match = CONCEPTS.find((concept) => concept.match.some((term) => normalisedName.includes(term)));
  return cloneConcept(match || DEFAULT_CONCEPT);
}

