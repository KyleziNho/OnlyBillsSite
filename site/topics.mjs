// Topic hubs at /blog/topic/<slug>/: one per article category (once it has MIN_POSTS
// articles), plus keyword clusters that cut across categories. New articles join their
// hubs automatically from `category` and their title/slug, so writers never touch this.
// Hub copy is template text: plain British English, no em dashes (build.mjs lints it).

export const MIN_POSTS = 3;

/** Per-category hub copy. A category missing here still gets a hub with generic copy. */
export const CATEGORY_HUBS = {
  Guides: {
    slug: 'split-the-bill',
    name: 'How to split the bill',
    title: 'How to split the bill: step-by-step guides',
    description: 'Step-by-step guides to splitting a bill fairly: at a restaurant, on your iPhone, with Monzo, Revolut or Starling, for big groups and on holiday.',
    lede: 'Practical, step-by-step ways to split a bill fairly, whoever is at the table and however they pay.',
    art: 'claim',
    tools: ['split', 'settle'],
  },
  Etiquette: {
    slug: 'etiquette',
    name: 'Bill splitting etiquette',
    title: 'Bill splitting etiquette: who pays and what is fair',
    description: 'The unwritten rules of splitting the bill in the UK: who pays, when to tip, asking a restaurant to split it, and chasing friends who owe you.',
    lede: 'The unwritten rules of who pays, how to bring up money with friends and what to do when it goes wrong.',
    art: 'receipts',
    tools: ['split', 'tip'],
  },
  Money: {
    slug: 'money',
    name: 'Money and fairness',
    title: 'Splitting the bill fairly: money, drinks and service',
    description: 'Where the money really goes when a group splits a bill, with fair ways to handle drinks, service charge, discounts and takeaway orders.',
    lede: 'Where the money really goes when a group splits a bill, and fair ways to handle the awkward parts.',
    art: 'payout',
    tools: ['overpay', 'split'],
  },
  Occasions: {
    slug: 'occasions',
    name: 'Occasions',
    title: 'Who pays? Birthdays, parties, dates and group trips',
    description: 'Who pays and how to split it fairly at birthday and graduation dinners, Christmas parties, bottomless brunches, leaving drinks, stag dos and first dates.',
    lede: 'Birthdays, work dos, dates and big nights out: who usually pays, and how to split it without any fuss.',
    art: 'paid',
    tools: ['split', 'settle'],
  },
  Comparisons: {
    slug: 'comparisons',
    name: 'App comparisons',
    title: 'Splitwise, Tricount and other split apps compared',
    description: 'Fair, sourced comparisons of bill splitting apps in the UK: Splitwise, Tricount, Settle Up, Splid, bank split buttons and OnlyBills, and who each one suits.',
    lede: 'Which app fits which job, what is free, and who needs an account. Checked against each app\'s own listing.',
    art: 'receipts',
    tools: ['split', 'settle'],
  },
  Research: {
    slug: 'research',
    name: 'Research',
    title: 'Research on splitting the bill and group spending',
    description: 'What studies and UK surveys say about splitting the bill, why groups order more when they split equally, and how people pay each other now.',
    lede: 'What studies and surveys say about how groups spend, split and pay each other back.',
    art: 'receipts',
    tools: ['overpay'],
  },
};

/** Clusters that cut across categories, matched on slug, title and SEO title. */
export const CLUSTER_HUBS = [
  {
    slug: 'tipping',
    name: 'Tipping and service charge',
    title: 'Tipping and service charge in the UK: the guides',
    description: 'How much to tip in the UK, whether service charge is mandatory, who gets the tip under UK law, and how to split service fairly in a group.',
    lede: 'How much to tip, when service is already included, where your tip goes and how to share it fairly in a group.',
    art: 'paid',
    tools: ['tip', 'service'],
    match: /\btip(s|ping)?\b|service[- ]charge/i,
  },
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * Resolves the hubs for a list of posts ({ slug, title, seoTitle, category }).
 * Returns [{ slug, path, name, title, description, lede, art, tools, posts, category? }].
 */
export function resolveTopics(posts) {
  const hubs = [];
  const cats = [...new Set(posts.map((p) => p.category).filter(Boolean))];
  for (const cat of cats) {
    const inCat = posts.filter((p) => p.category === cat);
    if (inCat.length < MIN_POSTS) continue;
    const meta = CATEGORY_HUBS[cat] || {
      slug: slugify(cat), name: cat, title: `${cat}: articles on splitting the bill`,
      description: `OnlyBills articles about ${cat.toLowerCase()}: fair ways to split the bill, tipping in the UK and money with friends.`,
      lede: `Articles about ${cat.toLowerCase()} and splitting the bill.`, art: 'receipts', tools: ['split'],
    };
    hubs.push({ ...meta, category: cat, path: `/blog/topic/${meta.slug}/`, posts: inCat });
  }
  for (const c of CLUSTER_HUBS) {
    const hit = posts.filter((p) => c.match.test(`${p.slug.replace(/-/g, ' ')} ${p.title} ${p.seoTitle || ''}`));
    if (hit.length >= MIN_POSTS) hubs.push({ ...c, path: `/blog/topic/${c.slug}/`, posts: hit });
  }
  return hubs;
}
