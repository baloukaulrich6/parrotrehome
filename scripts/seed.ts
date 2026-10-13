// ============================================================
// ParrotRehome — Seed script
// Populates clearly-illustrative demo data per Charte p.05:
//   "Les visuels marketing de la maquette sont conceptuels."
// Run: bun run /home/z/my-project/scripts/seed.ts
// ============================================================

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("→ Wiping existing data (for clean re-seed)…");
  await db.auditLog.deleteMany();
  await db.internalComment.deleteMany();
  await db.paymentCheck.deleteMany();
  await db.paymentInstruction.deleteMany();
  await db.appointment.deleteMany();
  await db.message.deleteMany();
  await db.requestItem.deleteMany();
  await db.request.deleteMany();
  await db.coupon.deleteMany();
  await db.newsletterSubscription.deleteMany();
  await db.review.deleteMany();
  await db.paymentMethod.deleteMany();
  await db.product.deleteMany();
  await db.bird.deleteMany();
  await db.servedState.deleteMany();
  await db.faqEntry.deleteMany();
  await db.cmsPage.deleteMany();
  await db.user.deleteMany({ where: { email: { contains: "@" } } });
  console.log("→ Seeding ParrotRehome demo data (clearly illustrative)…");

  // ── 1. Users ────────────────────────────────────────────
  const pwd = await bcrypt.hash("parrotrehome123", 10);

  const superAdmin = await db.user.upsert({
    where: { email: "admin@parrotrehome.com" },
    update: {},
    create: {
      email: "admin@parrotrehome.com",
      passwordHash: pwd,
      name: "Sarah Mitchell",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      consentAt: new Date(),
    },
  });

  const manager = await db.user.upsert({
    where: { email: "manager@parrotrehome.com" },
    update: {},
    create: {
      email: "manager@parrotrehome.com",
      passwordHash: pwd,
      name: "James Carter",
      role: "MANAGER",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      consentAt: new Date(),
    },
  });

  const agent = await db.user.upsert({
    where: { email: "agent@parrotrehome.com" },
    update: {},
    create: {
      email: "agent@parrotrehome.com",
      passwordHash: pwd,
      name: "Maria Lopez",
      role: "AGENT",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      consentAt: new Date(),
    },
  });

  const stockManager = await db.user.upsert({
    where: { email: "stock@parrotrehome.com" },
    update: {},
    create: {
      email: "stock@parrotrehome.com",
      passwordHash: pwd,
      name: "David Chen",
      role: "STOCK_MANAGER",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      consentAt: new Date(),
    },
  });

  const avianPro = await db.user.upsert({
    where: { email: "vet@parrotrehome.com" },
    update: {},
    create: {
      email: "vet@parrotrehome.com",
      passwordHash: pwd,
      name: "Dr. Emily Park, DVM",
      role: "AVIAN_PROFESSIONAL",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      consentAt: new Date(),
    },
  });

  const client = await db.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      email: "client@example.com",
      passwordHash: pwd,
      name: "Alex Johnson",
      role: "CLIENT",
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      consentAt: new Date(),
    },
  });

  console.log(`  ✓ ${[superAdmin, manager, agent, stockManager, avianPro, client].length} users seeded`);

  // ── 2. Served states (Cahier p.13) ───────────────────────
  const states = [
    { code: "CA", name: "California", allowsBirdDelivery: true, allowsPickup: false },
    { code: "NY", name: "New York", allowsBirdDelivery: true, allowsPickup: false },
    { code: "TX", name: "Texas", allowsBirdDelivery: true, allowsPickup: false },
    { code: "FL", name: "Florida", allowsBirdDelivery: true, allowsPickup: false },
    { code: "WA", name: "Washington", allowsBirdDelivery: true, allowsPickup: false },
    { code: "OR", name: "Oregon", allowsBirdDelivery: true, allowsPickup: true },
    { code: "MA", name: "Massachusetts", allowsBirdDelivery: true, allowsPickup: false },
    { code: "IL", name: "Illinois", allowsBirdDelivery: true, allowsPickup: false },
    { code: "GA", name: "Georgia", allowsBirdDelivery: true, allowsPickup: false },
  ];
  for (const s of states) {
    await db.servedState.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    });
  }
  console.log(`  ✓ ${states.length} served US states seeded`);

  // ── 3. Birds (individual dossiers — F-03, A-13/14/15/16) ─
  // NOTE: photos use placeholder CDN URLs — clearly illustrative per charter
  const birds = [
    {
      species: "Psittacus erithacus",
      commonName: "African Grey Parrot",
      individualId: "AG-2026-001",
      ageYears: 3.5,
      sex: "Female",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3fe6dc202a76.jpg"]),
      status: "AVAILABLE",
      location: "Portland, OR",
      priceUsd: 2850,
      shortDescription: "Hand-reared African Grey, excellent vocabulary, socialized with family.",
      longDescription:
        "A wonderfully sociable 3-year-old female African Grey. Hand-reared from a verified breeder in Oregon, she has been socialized with children, other birds, and household environments. Strong vocabulary foundation (24+ phrases) and excellent temperament. Complete health records available; CITES paperwork on file.",
      careNotes:
        "African Greys require daily mental stimulation, a varied diet (pellets, fresh fruits/veg, limited seeds), and at least 3-4 hours of out-of-cage interaction. Recommended cage: minimum 36\"×24\"×48\". Lifespan 40-60 years — adoption is a long-term commitment.",
      breederName: "Cascade Aviary (illustrative)",
      originState: "OR",
      sourceDocuments: JSON.stringify([
        { name: "CITES permit (illustrative)", uploadedAt: "2026-09-01" },
        { name: "Health certificate (illustrative)", uploadedAt: "2026-09-01" },
      ]),
      healthDocuments: JSON.stringify([
        { name: "Annual check-up 2026", note: "RESTRICTED — staff only" },
      ]),
    },
    {
      species: "Ara macao",
      commonName: "Scarlet Macaw",
      individualId: "SM-2026-002",
      ageYears: 5,
      sex: "Male",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/1f389ade9444.jpg"]),
      status: "AVAILABLE",
      location: "Portland, OR",
      priceUsd: 3200,
      shortDescription: "Vibrant Scarlet Macaw, 5 years old, loves interactive play.",
      longDescription:
        "A charismatic 5-year-old male Scarlet Macaw with stunning plumage and a playful personality. Hand-tamed and used to daily handling. Requires experienced owner due to size and social needs. Provenance documents on file.",
      careNotes:
        "Scarlet Macaws need very large cages (min 40\"×30\"×60\"), a diet rich in nuts and fruits, and at least 4 hours of out-of-cage time daily. Lifespan 40-50 years.",
      breederName: "Cascade Aviary (illustrative)",
      originState: "OR",
      sourceDocuments: JSON.stringify([
        { name: "CITES permit (illustrative)", uploadedAt: "2026-08-15" },
      ]),
      healthDocuments: JSON.stringify([]),
    },
    {
      species: "Cacatua galerita",
      commonName: "Sulphur-crested Cockatoo",
      individualId: "SC-2026-003",
      ageYears: 7,
      sex: "Female",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/7c5b41c516b7.jpg"]),
      status: "RESERVED",
      location: "Portland, OR",
      priceUsd: 2600,
      shortDescription: "Affectionate Cockatoo, currently reserved for an approved family.",
      longDescription:
        "Reserved — currently in the verification pipeline. A 7-year-old female Sulphur-crested Cockatoo with a gentle, cuddly temperament. Reserved pending payment verification; will be released if the transaction does not complete.",
      careNotes:
        "Cockatoos are extremely social and demand significant daily interaction (4-6 hours). Prone to feather-plucking if neglected. Lifespan 40-70 years.",
      breederName: "Cascade Aviary (illustrative)",
      originState: "OR",
      sourceDocuments: JSON.stringify([
        { name: "CITES permit (illustrative)", uploadedAt: "2026-07-20" },
      ]),
      healthDocuments: JSON.stringify([]),
    },
    {
      species: "Psittacus erithacus",
      commonName: "African Grey Parrot",
      individualId: "AG-2026-004",
      ageYears: 2,
      sex: "Male",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/8d37dae53c13.jpg"]),
      status: "AVAILABLE",
      location: "Sacramento, CA",
      priceUsd: 2950,
      shortDescription: "Young male African Grey, just weaned and ready for a forever home.",
      longDescription:
        "A 2-year-old male African Grey, fully weaned and recently vet-checked. Confident and curious. Comes with starter kit and 30-day support from our avian advisor. CITES paperwork on file.",
      careNotes:
        "African Greys need daily puzzles and training sessions. Diet should be 60% pellets, 30% fresh produce, 10% seeds/treats. Avoid avocado, chocolate, caffeine.",
      breederName: "Sunshine Aviary (illustrative)",
      originState: "CA",
      sourceDocuments: JSON.stringify([
        { name: "CITES permit (illustrative)", uploadedAt: "2026-09-10" },
      ]),
      healthDocuments: JSON.stringify([]),
    },
    {
      species: "Ara ararauna",
      commonName: "Blue-and-yellow Macaw",
      individualId: "BM-2026-005",
      ageYears: 4,
      sex: "Unknown",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0deafe4e908d.jpg"]),
      status: "AVAILABLE",
      location: "Austin, TX",
      priceUsd: 3100,
      shortDescription: "Stunning Blue-and-yellow Macaw, very social and outgoing.",
      longDescription:
        "A confident 4-year-old Blue-and-yellow Macaw with vivid plumage. Used to multi-bird household and multiple handlers. Healthy and ready for adoption to experienced owners.",
      careNotes:
        "Blue-and-yellow Macaws require large cages and a varied enrichment routine. Lifespan 30-50 years.",
      breederName: "Lone Star Aviary (illustrative)",
      originState: "TX",
      sourceDocuments: JSON.stringify([
        { name: "CITES permit (illustrative)", uploadedAt: "2026-06-30" },
      ]),
      healthDocuments: JSON.stringify([]),
    },
    {
      species: "Nymphicus hollandicus",
      commonName: "Cockatiel",
      individualId: "CT-2026-006",
      ageYears: 1.5,
      sex: "Male",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0b3191cc768a.jpg"]),
      status: "AVAILABLE",
      location: "Portland, OR",
      priceUsd: 220,
      shortDescription: "Friendly young cockatiel, perfect for first-time owners.",
      longDescription:
        "A hand-tamed 1.5-year-old male Cockatiel with a sweet disposition and a soft whistle. An ideal first parrot. Comes with starter kit.",
      careNotes:
        "Cockatiels are great beginner birds. Need a cage at least 24\"×18\"×24\", daily handling, and a diet of pellets and seeds with fresh veg. Lifespan 15-25 years.",
      breederName: "Cascade Aviary (illustrative)",
      originState: "OR",
      sourceDocuments: JSON.stringify([]),
      healthDocuments: JSON.stringify([]),
    },
  ];
  for (const b of birds) {
    await db.bird.create({ data: b as never });
  }
  console.log(`  ✓ ${birds.length} individual bird dossiers seeded`);

  // ── 4. Products / accessories (F-06, A-17) ──────────────
  const products = [
    {
      category: "CAGE",
      name: "Premium African Grey Cage 36\"×24\"×48\"",
      sku: "CAGE-PREMIUM-36",
      description:
        "Heavy-gauge powder-coated cage with horizontal bars for climbing. Includes 3 stainless steel bowls, 2 perches, and a play-top with ladder.",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/67a0b32dd782.jpeg"]),
      dimensions: "36\" W × 24\" D × 48\" H (91 × 61 × 122 cm)",
      compatibility: "Suitable for African Greys, small Macaws, Cockatoos",
      features: JSON.stringify(["Powder-coated", "Stainless bowls included", "Play-top with ladder"]),
      priceUsd: 489,
      stockQty: 8,
    },
    {
      category: "CAGE",
      name: "Macaw Flight Cage 40\"×30\"×60\"",
      sku: "CAGE-MACAW-40",
      description:
        "Extra-large flight cage designed for Macaws and large Cockatoos. Lockable doors, escape-proof latches.",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0deafe4e908d.jpg"]),
      dimensions: "40\" W × 30\" D × 60\" H (102 × 76 × 152 cm)",
      compatibility: "Macaws, large Cockatoos",
      features: JSON.stringify(["Flight-style", "Lockable", "Heavy-duty"]),
      priceUsd: 749,
      stockQty: 4,
    },
    {
      category: "PERCH",
      name: "Natural Wood Perch Set (4 pcs)",
      sku: "PERCH-NATL-4",
      description:
        "Set of 4 untreated hardwood perches in varying diameters for foot health. Includes hardware.",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/67a0b32dd782.jpeg"]),
      dimensions: "Diameters 1\" / 1.25\" / 1.5\" / 2\"",
      compatibility: "All species",
      features: JSON.stringify(["Untreated hardwood", "Variable diameters", "Hardware included"]),
      priceUsd: 32,
      stockQty: 25,
    },
    {
      category: "TOY",
      name: "Foraging Puzzle Toy",
      sku: "TOY-FORAGE-1",
      description:
        "Acrylic foraging puzzle to provide daily mental stimulation. Hides treats behind sliding doors.",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0deafe4e908d.jpg"]),
      dimensions: "8\" × 6\" × 2\"",
      compatibility: "African Greys, Macaws, Cockatoos",
      features: JSON.stringify(["Acrylic", "Dishwasher-safe", "Treat-hiding"]),
      priceUsd: 24,
      stockQty: 40,
    },
    {
      category: "TOY",
      name: "Rope & Bell Swing",
      sku: "TOY-SWING-1",
      description:
        "Colorful cotton rope swing with safe bell. Encourages movement and play.",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0deafe4e908d.jpg"]),
      dimensions: "12\" × 8\"",
      compatibility: "Cockatiels, Conures, small parrots",
      features: JSON.stringify(["Cotton rope", "Safe bell"]),
      priceUsd: 18,
      stockQty: 30,
    },
    {
      category: "FOOD",
      name: "Premium Parrot Pellets 5 lb",
      sku: "FOOD-PELL-5",
      description:
        "Veterinary-formulated pellet diet. No artificial colors or preservatives. Made in USA.",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0deafe4e908d.jpg"]),
      dimensions: "5 lb (2.27 kg)",
      compatibility: "African Greys, Macaws, Cockatoos, Amazons",
      features: JSON.stringify(["No artificial colors", "Veterinary formula", "Made in USA"]),
      priceUsd: 28,
      stockQty: 60,
    },
    {
      category: "FOOD",
      name: "Mixed Fruit & Nut Treats 1 lb",
      sku: "FOOD-TREAT-1",
      description:
        "Sulfite-free dried fruits and unsalted nuts. Ideal training rewards.",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0deafe4e908d.jpg"]),
      dimensions: "1 lb (454 g)",
      compatibility: "All parrot species",
      features: JSON.stringify(["Sulfite-free", "Unsalted nuts", "Training rewards"]),
      priceUsd: 14,
      stockQty: 50,
    },
    {
      category: "SUPPLY",
      name: "Stainless Steel Water Bowl",
      sku: "SUPP-BOWL-SS",
      description:
        "Heavy stainless steel bowl, dishwasher safe. 16 oz capacity.",
      photos: JSON.stringify(["https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0deafe4e908d.jpg"]),
      dimensions: "16 oz, 5\" diameter",
      compatibility: "All species",
      features: JSON.stringify(["Dishwasher-safe", "Stainless steel", "16 oz"]),
      priceUsd: 12,
      stockQty: 100,
    },
  ];
  for (const p of products) {
    await db.product.create({ data: p as never });
  }
  console.log(`  ✓ ${products.length} accessory products seeded`);

  // ── 5. Payment methods (A-06) ────────────────────────────
  // NOTE: instructions templates are ILLUSTRATIVE — production
  // values must be supplied by the authorized agent per Q-11.
  const paymentMethods = [
    {
      name: "Bank wire transfer",
      active: true,
      officialProvider: "ParrotRehome Treasury (illustrative — verify with client Q-11)",
      instructionsTemplate:
        "Please wire the total amount to:\n  Bank: [Verified Bank Name]\n  Account holder: ParrotRehome LLC\n  Account #: [Verified account]\n  Routing #: [Verified routing]\n  Reference: {{requestReference}}\n\nOnce sent, upload your wire confirmation reference in your My Requests page. Our team will verify within 1 business day.",
      displayOrder: 1,
    },
    {
      name: "Zelle (verified account)",
      active: true,
      officialProvider: "Zelle — ParrotRehome LLC Treasury (illustrative — verify with client Q-11)",
      instructionsTemplate:
        "Send via Zelle to:\n  Recipient: ParrotRehome LLC\n  Email/Phone: [Verified Zelle contact]\n  Amount: {{totalQuoteUsd}} USD\n  Memo: {{requestReference}}\n\nAfter sending, deposit the Zelle confirmation ID in your My Requests page.",
      displayOrder: 2,
    },
    {
      name: "Cash App (verified)",
      active: true,
      officialProvider: "Cash App — ParrotRehome LLC Treasury (illustrative — verify with client Q-11)",
      instructionsTemplate:
        "Send via Cash App to:\n  $[VerifiedCashtag]\n  Amount: {{totalQuoteUsd}} USD\n  Note: {{requestReference}}\n\nAfter sending, deposit the Cash App confirmation ID in your My Requests page.",
      displayOrder: 3,
    },
    {
      name: "Apple Pay (verified)",
      active: true,
      officialProvider: "Apple Pay / Apple Cash — ParrotRehome LLC Treasury (illustrative — verify with client Q-11)",
      instructionsTemplate:
        "Send via Apple Pay / Apple Cash to:\n  Recipient: ParrotRehome LLC\n  Verified email/phone: [Verified Apple Pay contact]\n  Amount: {{totalQuoteUsd}} USD\n  Memo: {{requestReference}}\n\nAfter sending, deposit the Apple Pay transaction ID in your My Requests page.",
      displayOrder: 4,
    },
    {
      name: "PayPal (verified business)",
      active: true,
      officialProvider: "PayPal — ParrotRehome LLC Treasury (illustrative — verify with client Q-11)",
      instructionsTemplate:
        "Send via PayPal to:\n  Recipient: ParrotRehome LLC\n  Verified PayPal email: [Verified PayPal address]\n  Amount: {{totalQuoteUsd}} USD\n  Note: {{requestReference}}\n  Goods & Services payment type (covers protection)\n\nAfter sending, deposit the PayPal transaction ID in your My Requests page.",
      displayOrder: 5,
    },
    {
      name: "Chime (verified)",
      active: true,
      officialProvider: "Chime Pay Friends / Chime — ParrotRehome LLC Treasury (illustrative — verify with client Q-11)",
      instructionsTemplate:
        "Send via Chime (Pay Friends) to:\n  Recipient: ParrotRehome LLC\n  Verified Chime email/phone: [Verified Chime contact]\n  Amount: {{totalQuoteUsd}} USD\n  Note: {{requestReference}}\n\nAfter sending, deposit the Chime transfer confirmation ID in your My Requests page.",
      displayOrder: 6,
    },
    {
      name: "In-person cash (pickup only)",
      active: false, // disabled by default — pickup only, requires scheduling
      officialProvider: "ParrotRehome Avian Center — Portland (illustrative)",
      instructionsTemplate:
        "Available only for pickup orders. Schedule a pickup slot with your assigned agent.",
      displayOrder: 7,
    },
  ];
  for (const pm of paymentMethods) {
    await db.paymentMethod.create({ data: pm });
  }
  console.log(`  ✓ ${paymentMethods.length} payment methods seeded`);

  // ── 5b. Sample coupon (A-23) ───────────────────────────────
  await db.coupon.create({
    data: {
      code: "WELCOME10",
      description: "10% off your first request — welcome to ParrotRehome",
      type: "PERCENTAGE",
      value: 10,
      active: true,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90), // 90 days
      usageLimit: 100,
    },
  });
  await db.coupon.create({
    data: {
      code: "FREESHIP",
      description: "Free shipping on any accessory order",
      type: "FREE_SHIPPING",
      value: 1,
      active: true,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      usageLimit: 50,
    },
  });
  console.log("  ✓ 2 sample coupons seeded (WELCOME10, FREESHIP)");

  // ── 5c. Sample newsletter subscribers (A-23) ─────────────
  await db.newsletterSubscription.create({
    data: { email: "newsletter.subscriber@example.com", name: "Newsletter Fan", source: "footer", consentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), active: true },
  });
  await db.newsletterSubscription.create({
    data: { email: "another.subscriber@example.com", name: "Bird Lover", source: "homepage", consentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14), active: true },
  });
  console.log("  ✓ 2 sample newsletter subscribers seeded");

  // ── 6. FAQ entries (F-11) ────────────────────────────────
  const faqs = [
    {
      question: "Why don't you accept online payments directly?",
      answer:
        "ParrotRehome follows a manual, agent-verified payment workflow to protect both buyers and birds. You submit a request, an authorized agent prepares official payment instructions, and only after manual verification does your request proceed. This protects against fraud and ensures responsible placement of every animal.",
      category: "How it works",
      displayOrder: 1,
    },
    {
      question: "How long does payment verification take?",
      answer:
        "Most verifications complete within 1 business day of you depositing your payment reference. You will receive an email and an update in your My Requests page when verification is complete.",
      category: "How it works",
      displayOrder: 2,
    },
    {
      question: "What payment methods are accepted?",
      answer:
        "We support verified bank wire transfers, Zelle, and CashApp (sent to our verified business accounts only). We will never ask you to send payment to a personal account, and we never collect card details on this website.",
      category: "Payments",
      displayOrder: 1,
    },
    {
      question: "Can I see the bird before purchasing?",
      answer:
        "Yes. Many birds are available for in-person visits at our Portland aviary by appointment. Video calls can also be arranged with the assigned agent. The exact availability depends on the bird's location — see each bird's file.",
      category: "Parrots",
      displayOrder: 1,
    },
    {
      question: "What documents come with each bird?",
      answer:
        "Each bird has an individual dossier including species, age, sex (if known), provenance, and available health documents. CITES-listed species come with the required CITES paperwork. You will receive copies of all relevant documents at handover.",
      category: "Parrots",
      displayOrder: 2,
    },
    {
      question: "How does avian advice work?",
      answer:
        "Our avian professional offers remote consultations at $15 per hour. Choose a slot, describe your bird and your concern (feeding, behavior, habitat, or preventive health), and an agent will reach out with payment instructions. Once verified, your slot is confirmed.",
      category: "Avian advice",
      displayOrder: 1,
    },
    {
      question: "Which US states do you serve?",
      answer:
        "We currently serve a verified list of US states for bird delivery, with pickup available in select locations. The states we serve are configurable in the request form based on your shipping address. We do not promise worldwide delivery — CITES compliance is verified case-by-case.",
      category: "Shipping",
      displayOrder: 1,
    },
    {
      question: "What is your cancellation policy?",
      answer:
        "Cancellations before payment verification are typically eligible for full release of any reserved bird or slot. After verification, policies vary by request type — your assigned agent will share the specific terms. Avian consultations can be rescheduled per the professional's policy.",
      category: "Policies",
      displayOrder: 1,
    },
  ];
  for (const f of faqs) {
    await db.faqEntry.create({ data: f });
  }
  console.log(`  ✓ ${faqs.length} FAQ entries seeded`);

  // ── 7. CMS pages (A-21) ──────────────────────────────────
  const cmsPages = [
    {
      slug: "about",
      title: "Our promise",
      body:
        "# Our promise\n\nParrotRehome was founded on a simple belief: a brighter life with birds begins with responsible, transparent, and caring practices.\n\n## Nature\n\nWe show every bird in natural, dignified imagery. We never use misleading AI-generated photos for actual animals — every photo you see on a bird's file is the real bird.\n\n## Trust\n\nEach bird has an individual dossier with provenance documents, health records, and verified identity. We do not sell 'quantities of stock' — we help place specific, traceable individuals.\n\n## Care\n\nThe well-being of every bird matters more than any sale. We screen adopters' experience and habitat, and we decline requests that we cannot responsibly fulfill.\n\n## Accompaniment\n\nA real, identified agent reviews every request. You always know what step comes next.",
    },
    {
      slug: "how-it-works",
      title: "How it works",
      body:
        "# How it works\n\nParrotRehome uses a manual, agent-verified workflow. We do not collect payment on-site — every transaction is coordinated by an authorized team member.\n\n## Step 1 — Choose\n\nBrowse parrots, supplies, or book an avian advice session. Fill in the request form.\n\n## Step 2 — Send request\n\nYou receive a confirmation email from our no-reply address with your request reference and next steps.\n\n## Step 3 — Confirm with our team\n\nOur agent contacts you by email with available payment methods and secure, traceable instructions. Once your payment is verified through the official provider, your request moves to fulfillment.",
    },
    {
      slug: "privacy",
      title: "Privacy policy",
      body:
        "# Privacy policy\n\nParrotRehome collects only the information needed to process your request: contact details, shipping state, and the experience/habitat information you provide. We never store payment card numbers — payment references you deposit are kept in an encrypted log.\n\nYou may request export or deletion of your data at any time by contacting our team.",
    },
    {
      slug: "terms",
      title: "Terms of service",
      body:
        "# Terms of service\n\nBy submitting a request, you consent to be contacted by an authorized ParrotRehome agent regarding payment, delivery, or consultation. We never share your data with third parties for marketing. CITES-listed species and interstate bird transport are subject to applicable regulations.\n\nThis document is illustrative pending legal review.",
    },
  ];
  for (const p of cmsPages) {
    await db.cmsPage.upsert({
      where: { slug: p.slug },
      update: {},
      create: p,
    });
  }
  console.log(`  ✓ ${cmsPages.length} CMS pages seeded`);

  // ── 8. Sample request with full lifecycle ────────────────
  // So the admin dashboard and My Requests page have content
  const sampleBird = await db.bird.findFirst({
    where: { individualId: "AG-2026-001" },
  });
  if (sampleBird) {
    const req = await db.request.create({
      data: {
        reference: "REQ-1025",
        type: "PARROT_PURCHASE",
        status: "PENDING_REVIEW", // ← customer hasn't picked payment method yet
        customerId: client.id,
        agentId: agent.id,
        customerName: client.name ?? "Client",
        customerEmail: client.email,
        customerPhone: "+1 (555) 200-1000",
        shippingState: "OR",
        shippingAddress: "123 Example St, Portland, OR 97201",
        experience: "Intermediate",
        habitat: "36\" cage, dedicated bird room",
        preferences: JSON.stringify({ visitBeforePurchase: true }),
        consentAccepted: true,
        totalQuoteUsd: 2850,
        assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        items: {
          create: [
            {
              birdId: sampleBird.id,
              quantity: 1,
              quotedPriceUsd: 2850,
            },
          ],
        },
      },
    });
    // Lock the bird (T-02)
    await db.bird.update({
      where: { id: sampleBird.id },
      data: {
        status: "RESERVED",
        reservedByRequestId: req.id,
        reservedUntil: new Date(Date.now() + 1000 * 60 * 60 * 48),
      },
    });
    await db.auditLog.create({
      data: {
        actorId: client.id,
        actorRole: "CLIENT",
        objectType: "Request",
        objectId: req.id,
        action: "CREATE",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36),
      },
    });
    await db.auditLog.create({
      data: {
        actorId: agent.id,
        actorRole: "AGENT",
        objectType: "Request",
        objectId: req.id,
        action: "ASSIGN",
        changes: JSON.stringify({ newAgentId: agent.id }),
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    });
    console.log("  ✓ 1 sample request seeded (full audit trail, PENDING_REVIEW)");
  }

  // ── 9. Sample appointment (avian advice) ────────────────
  const sampleBird2 = await db.bird.findFirst({
    where: { individualId: "AG-2026-004" },
  });
  if (sampleBird2) {
    await db.request.create({
      data: {
        reference: "REQ-1026",
        type: "AVIAN_CONSULTATION",
        status: "PENDING_REVIEW",
        customerId: client.id,
        agentId: agent.id,
        customerName: client.name ?? "Client",
        customerEmail: client.email,
        customerPhone: "+1 (555) 200-1000",
        shippingState: "CA",
        consentAccepted: true,
        totalQuoteUsd: 15,
        assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
        appointments: {
          create: [
            {
              customerId: client.id,
              professionalId: avianPro.id,
              slotStartUtc: new Date(Date.now() + 1000 * 60 * 60 * 48),
              durationMinutes: 60,
              status: "REQUESTED",
              subject: "Behavior & training",
              animalInfo: JSON.stringify({
                species: "African Grey",
                age: "2 years",
                symptoms: "Feather picking on chest",
                history: "Recent move to new home",
              }),
              priceUsd: 15,
            },
          ],
        },
      },
    });
    console.log("  ✓ 1 sample avian consultation request seeded");
  }

  // ── 10. Sample completed request for F-10 review testing ─────
  const completedBird = await db.bird.findFirst({
    where: { individualId: "AG-2026-004" },
  });
  if (completedBird) {
    const completedReq = await db.request.create({
      data: {
        reference: "REQ-1027",
        type: "PARROT_PURCHASE",
        status: "COMPLETED",
        customerId: client.id,
        agentId: agent.id,
        customerName: client.name ?? "Client",
        customerEmail: client.email,
        customerPhone: "+1 (555) 200-1000",
        shippingState: "CA",
        shippingAddress: "456 Sunset Blvd, Sacramento, CA 95820",
        experience: "Expert",
        habitat: "Large flight cage",
        consentAccepted: true,
        totalQuoteUsd: 2950,
        assignedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        instructionsSentAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
        paidAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
        completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        items: {
          create: [
            {
              birdId: completedBird.id,
              quantity: 1,
              quotedPriceUsd: 2950,
            },
          ],
        },
      },
    });
    // Mark the bird as SOLD
    await db.bird.update({
      where: { id: completedBird.id },
      data: { status: "SOLD", reservedByRequestId: null, reservedUntil: null },
    });
    // Seed a payment check + audit trail
    await db.paymentCheck.create({
      data: {
        requestId: completedReq.id,
        reference: "WIRE-CA-DEMO-001",
        amount: 2950,
        verifiedBy: agent.id,
        notes: "Verified via bank portal (demo)",
      },
    });
    await db.auditLog.create({
      data: {
        actorId: client.id,
        actorRole: "CLIENT",
        objectType: "Request",
        objectId: completedReq.id,
        action: "CREATE",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      },
    });
    await db.auditLog.create({
      data: {
        actorId: agent.id,
        actorRole: "AGENT",
        objectType: "Request",
        objectId: completedReq.id,
        action: "ASSIGN",
        changes: JSON.stringify({ newAgentId: agent.id }),
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      },
    });
    await db.auditLog.create({
      data: {
        actorId: agent.id,
        actorRole: "AGENT",
        objectType: "Request",
        objectId: completedReq.id,
        action: "PAYMENT_VERIFY",
        changes: JSON.stringify({ reference: "WIRE-CA-DEMO-001", amount: 2950 }),
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
      },
    });
    await db.auditLog.create({
      data: {
        actorId: agent.id,
        actorRole: "AGENT",
        objectType: "Request",
        objectId: completedReq.id,
        action: "STATUS_CHANGE",
        changes: JSON.stringify({ from: "READY_FOR_FULFILLMENT", to: "COMPLETED" }),
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      },
    });
    console.log("  ✓ 1 sample COMPLETED request seeded (REQ-1027, for review testing)");
  }

  console.log("\n✅ Seed complete.");
  console.log("\nDefault accounts (password: parrotrehome123):");
  console.log("  Super admin   : admin@parrotrehome.com");
  console.log("  Manager       : manager@parrotrehome.com");
  console.log("  Agent         : agent@parrotrehome.com");
  console.log("  Stock mgr     : stock@parrotrehome.com");
  console.log("  Avian pro     : vet@parrotrehome.com");
  console.log("  Client        : client@example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
