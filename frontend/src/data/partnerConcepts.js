const DEFAULT_CONCEPT = {
  eyebrow: "A considered shop window",
  headline: "A distinctive point of view, made easy to explore",
  introduction: "A collection with a character of its own, full of pieces chosen to make ordinary moments feel more considered.",
  moods: ["meaningful", "unexpected", "beautifully useful"],
  occasions: ["birthday", "thank you", "someone hard to buy for"],
  windows: [
    { title: "The signature edit", text: "A few pieces that express the character of the collection at a glance." },
    { title: "The story behind it", text: "The craft, materials and point of view that make the work worth discovering." },
    { title: "Choose by feeling", text: "Find the piece that suits the person, the moment and the feeling you want to leave behind." },
  ],
  curatorNote: "There is a clear point of view here—and the pleasure of finding something that does not feel obvious.",
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
      { title: "Beauty in the irregular", text: "Handwork, natural stones and forms that retain their individuality." },
      { title: "For the quietly individual", text: "For someone who values provenance and character over obvious luxury." },
    ],
    curatorNote: "The natural forms and signs of the maker’s hand give these pieces the intimacy of something already treasured.",
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
    introduction: "Approachable jewellery with enough personality to mark an occasion and enough ease to be worn every day.",
    moods: ["elegant", "playful", "meaningful"],
    occasions: ["birthday", "anniversary", "friendship"],
    windows: [
      { title: "A little celebration", text: "Bright, wearable pieces for birthdays and everyday wins." },
      { title: "Keep it close", text: "Personal motifs and understated forms with keepsake potential." },
      { title: "Easy elegance", text: "Polished gifts that feel special without becoming formal." },
    ],
    curatorNote: "Small, wearable details can hold the memory of a birthday, friendship or everyday win.",
  },
  {
    match: ["partylite"],
    eyebrow: "Scent, glow and a change of pace",
    headline: "A small ritual for making home feel different tonight",
    introduction: "Fragrance and candlelight chosen for the atmosphere they create: calmer evenings, warmer welcomes and brighter celebrations.",
    moods: ["cosy", "restorative", "celebratory"],
    occasions: ["new home", "thank you", "winter evening"],
    windows: [
      { title: "Slow the room down", text: "Calm fragrance notes and a softer glow for evenings that need less noise." },
      { title: "Make it feel festive", text: "Warm, joyful combinations for hosting and seasonal rituals." },
      { title: "The useful indulgence", text: "A gift that is decorative, usable and easy to enjoy immediately." },
    ],
    curatorNote: "A good home gift changes the feeling of a room as well as the way it looks.",
  },
  {
    match: ["infinityxinfinity", "infinity x infinity"],
    eyebrow: "Limited-run jewellery with human marks",
    headline: "Handmade pieces for someone who does not want everyone else’s",
    introduction: "A close-up view of artisan-made jewellery, natural gemstones and the pleasure of small variations between pieces.",
    moods: ["one of a kind", "elegant", "expressive"],
    occasions: ["anniversary", "milestone", "self-gift"],
    windows: [
      { title: "The gemstone edit", text: "Begin with the colour, texture and natural variation that draws you in." },
      { title: "Made by hand", text: "The makers, methods and details that separate the work from machine-made jewellery." },
      { title: "Only a few", text: "Limited quantities mean the piece can retain a sense of individuality." },
    ],
    curatorNote: "Natural stones, small variations and skilled handwork make each piece feel personal rather than perfected by machine.",
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
    curatorNote: "The collection feels discovered rather than coordinated—art, objects and unexpected details with a creative life of their own.",
  },
  {
    match: ["t. h. baker", "t.h. baker", "th baker"],
    eyebrow: "Milestone gifts, edited with restraint",
    headline: "A clearer way through jewellery and watches",
    introduction: "Jewellery and watches for the years, achievements and relationships that deserve to be properly marked.",
    moods: ["elegant", "lasting", "significant"],
    occasions: ["anniversary", "graduation", "milestone birthday"],
    windows: [
      { title: "Mark the year", text: "Enduring choices for anniversaries, graduations and important birthdays." },
      { title: "Understated signatures", text: "Pieces selected for everyday longevity rather than conspicuous branding." },
      { title: "A considered second life", text: "Pre-owned watches chosen for craft, condition and lasting design." },
    ],
    curatorNote: "The right watch or piece of jewellery can carry the memory of a milestone long after the day itself.",
  },
  {
    match: ["puzzleyou", "puzzle you"],
    eyebrow: "A memory you can spend time with",
    headline: "Turn a shared photograph into an evening together",
    introduction: "A favourite photograph becomes both a keepsake and the promise of an evening spent putting the memory back together.",
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
      { title: "Build a small gallery", text: "Bring together a few complementary pieces to make the wall feel collected over time." },
    ],
    curatorNote: "The most giftable art says something about the person receiving it—not simply the wall it will fill.",
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
    curatorNote: "The pleasure begins with the beautiful box, then continues through texture, sharing and a taste of Italian chocolate tradition.",
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
      { title: "Choose your detectives", text: "Pick the right group, pace and appetite for difficulty." },
      { title: "An evening, not an object", text: "The shared experience and conversation are placed ahead of the box itself." },
    ],
    curatorNote: "It is a gift of anticipation, collaboration and the stories people tell after the case is closed.",
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
    curatorNote: "These pieces make the small ritual of getting ready feel expressive, sociable and a little more special.",
  },
  {
    match: ["hiut denim"],
    eyebrow: "One town, one craft, one very good pair of jeans",
    headline: "Made slowly by people who know exactly what good denim requires",
    introduction: "A maker-first window into Cardigan’s jeans-making craft, long-wearing materials and the people whose skill gives each pair its value.",
    moods: ["beautifully useful", "authentic", "lasting"],
    occasions: ["milestone birthday", "partner", "buy once, wear often"],
    windows: [
      { title: "Meet the GrandMasters", text: "Discover the human skill behind every cut, seam and finished pair." },
      { title: "Choose your denim", text: "A small, intelligible guide to cloth, cut and how each pair will change with wear." },
      { title: "The long relationship", text: "Durability, repair and personal fading make the jeans more individual with time." },
    ],
    curatorNote: "A pair of jeans becomes more valuable when you know the town, skill and decades of experience stitched into it.",
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
      { title: "A gift with a second effect", text: "The pleasure of choosing a book is joined by the generosity built into the purchase." },
      { title: "A handwritten-feeling edit", text: "A small shelf of recommendations that feels like advice from a thoughtful bookseller." },
    ],
    curatorNote: "A thoughtfully chosen book already feels personal; a wider act of giving makes the gesture travel further.",
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
