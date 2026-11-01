# Writing for onlybills.app

How articles (`content/blog/`) and tutorials (`content/how-to/`) are written. The build
(`node build.mjs` in this folder) turns each Markdown file into a page with SEO tags,
structured data, related links and the app call to action. Read
`~/Desktop/Projects/Apps/OnlyBills/SplitSwift/DESIGN.md` §9 (copy voice) too.

## File format

`content/blog/<slug>.md` → `onlybills.app/blog/<slug>/`. Slugs are short, lowercase, hyphenated
and keyword-led (`how-much-to-tip-uk`, not `my-thoughts-on-tipping`).

```markdown
---
title: How much should you tip in the UK?
seoTitle: How much to tip in the UK in 2026 (restaurants, pubs, taxis)
description: One or two plain sentences, 140 to 160 characters, that answer the search and make someone click.
date: 2026-10-21
category: Etiquette
art: paid
related: is-service-charge-mandatory-uk, split-service-charge-fairly
---

Opening paragraph: answer the question in the first two sentences. No throat-clearing.

## A question-shaped heading people search for

Body...
```

Frontmatter (one `key: value` per line, no quotes needed):
- `title` (required): the H1. Sentence case, ideally ≤ 60 characters.
- `seoTitle` (optional): the `<title>` if it should differ (≤ 60 chars; " · OnlyBills" is added).
- `description` (required): the meta description, 140 to 160 characters.
- `date` (required), `updated` (optional): `YYYY-MM-DD`.
- `category` (blog): one of `Money`, `Etiquette`, `Research`, `Occasions`, `Guides`, `Comparisons`.
- `art`: the illustration on the article's share image (`og.mjs`), one of `scan, claim, paid, receipts, pass, payout, allclear, camera`. Pages themselves show no art.
- `related`: comma-separated slugs of other articles or tutorials (2 to 4).
- `order` (how-to only): position in the tutorials list.
- `summary` (how-to only): one short line for the tutorials index.

## Special blocks

Write these on their own lines; everything else is normal Markdown (tables are fine).

```
:::stat 38% | of Brits feel they lose money when the bill is split equally | OpenTable UK survey, 2016
```
One big highlighted number. The third part is the short source credit (always give one).

```
:::stats
- 80% | would rather pay for what they ordered | Gneezy et al., 2004
- 6m 45s | average time to settle a group bill | comparethemarket, 2021
:::
```
A row of 2 or 3 stat cards.

```
:::shot guest-05-live | Friends tick what they had and see their share add up.
```
An app screenshot in a phone frame, light and dark versions picked automatically. Available now:
`guest-01-join` (join a table: "Who are you?"), `guest-02-claimed` (items ticked),
`guest-03-pay-sheet` (pay sheet with Monzo/bank options), `guest-04-paid` ("Paid"),
`guest-05-live` (live table: your share £22.22, shared Garlic Naan split 3 ways).
More (host side: home, scan, check, assign, QR table, summary, Owed, payout setup) are on the way;
the list is in `static/shots/`.

```
:::imessage Saffron House · Tap what you had | onlybills.app | An illustration of the link in iMessage.
```
A stylised sent message with a rich link preview: a right-aligned bubble with an illustration on
top, a bar with the bold title and the grey domain, a small "Delivered" label, and the caption
underneath. Parts are `title | domain | caption` (caption optional). Use it to show what a shared
table link looks like in a chat. The title should match the real preview format
(`<Venue> · Tap what you had`, see `worker/README.md`). The picture is always the site's own
receipts art, never a venue photo, so the caption should say it's an illustration and not promise
a photo. It's read to screen readers as "Example message: a link preview reading Saffron House,
Tap what you had, onlybills.app". No Apple logos or Messages UI beyond the bubble.

```
:::note
A short aside or tip. One or two sentences of Markdown.
:::
```

```
:::cta Stop doing the maths at the table
```
A quiet one-line link to the app (the heading is optional and becomes the link text). The page
already ends with the app card, so use at most one in the body, at a natural point, and only in
articles where the app solves the problem.

## FAQ and sources (special sections)

End articles with these two H2 sections when relevant. The build turns them into FAQ structured
data and a tidy source list.

```markdown
## FAQ

### Is service charge compulsory in the UK?
No. It's optional, even when it's added to the bill automatically...

### Second question?
Answer.

## Sources

- [OpenTable UK: Brits lose £38,782 over a lifetime splitting the bill (2016)](https://...)
- [Gneezy, Haruvy and Yafe, The Inefficiency of Splitting the Bill, Economic Journal (2004)](https://...)
```

## Voice (non-negotiable)

- British English and £. Plain, short, warm: a friend who's good with money.
- **No em dashes or en dashes anywhere** (— or –). The build fails on them. Use full stops,
  commas, colons or brackets. Number ranges: "2 to 4", not "2–4".
- No hype or filler: effortless, seamless, magic, instantly, in seconds, unlock, elevate,
  delightful, game-changer, "Say goodbye to", "In today's world", "Let's dive in", "navigate".
  No rhetorical rule-of-three lists for rhythm.
- Sentence case for every heading.
- Answer first. Headings should be phrased the way people search ("How do you split a bill
  when someone didn't drink?").
- Useful even to someone who never downloads the app: real advice, real numbers, worked examples
  with actual £ amounts, message templates people can copy. Mention OnlyBills where it truly
  helps, not in every paragraph. Never trash competitors; be fair and accurate about them.
- Length: articles 1,000 to 1,800 words. Tutorials 400 to 900 words. Short paragraphs, lots of
  subheadings, a table or worked example where it helps.

## Facts and claims

UK advertising rules (CAP code) need claims backed up. So:
- Every statistic gets an inline credit (survey, year) and a link in `## Sources`. Prefer the
  primary source. If you can't verify a figure, don't use it.
- Say "estimated" or "about" for self-reported survey numbers. Note when a study is old or small
  (e.g. the £8.73 figure is from a 2016 OpenTable survey; the Gneezy restaurant study was small,
  groups of six students in Israel).
- Never invent quotes, people, surveys or reviews.

### Key stats the founder supplied (verify before use)

- OpenTable UK survey (2016): 2 in 3 Brits happy to split equally, but 38% feel they lose money
  doing it, about £8.73 per meal, about £38,782 over a lifetime. 58% split equally just because
  it's easier to pay; a third go along with it so others don't think they're tight.
- Gneezy, Haruvy and Yafe (2004), The Inefficiency of Splitting the Bill: diners ordered about
  37 shekels' worth paying individually, 51 splitting equally, 82 when the meal was free
  (about 38% more when splitting). 80% said they'd prefer paying individually. Tim Harford wrote
  about it ("Free-riding à la carte").
- comparethemarket survey (reported by the Yorkshire Post / Farming Life): 43% feel awkward about
  how to pay when eating out; average 6 min 45 sec to settle the bill; 52% have been embarrassed
  by how companions handled payment; 13% have fallen out with someone over the bill.
- Confused.com: half of Brits have turned down an invitation because of cost, 63% in London.
- Caterer & Licensee: a third only go to social events for special occasions because of cost.
- Employment (Allocation of Tips) Act 2023, in force 1 October 2024: employers must pass all tips,
  gratuities and service charges to workers, fairly, without deductions.

## What OnlyBills is (only claim these)

- iPhone and iPad app for splitting restaurant, pub and group bills. Made in the UK by Kyle, a
  student at the University of Bath, on his own.
- The host scans the receipt and it reads every line (AI receipt reading). You check it adds up,
  then either:
  - **share a live table**: friends scan a QR code or open a link and tick the items they had on
    their own phone. No app download needed (it opens on the web or as an App Clip). Everyone
    sees their share add up live, and who's claimed what.
    On iPhone, the App Clip lets guests join straight from the QR code without downloading the
    app; anyone else joins in their phone's browser.
  - or **assign items yourself** to each person.
- Shared items (a bottle of wine, sides) split between the people who shared them. Service charge,
  tips, discounts and other extras are spread across everyone fairly (in proportion). Always exact
  to the penny; the shares add up to the bill.
- Friends pay the host back with a link: Monzo ("Card, Apple Pay or bank transfer. No Monzo
  account needed"), Starling and Revolut ("Card or Apple Pay. No Starling/Revolut account
  needed"), PayPal ("PayPal account may be needed") or bank transfer ("From any banking app").
  Never imply friends need the host's bank app.
- **Owed** tracks who still owes you across bills, with their faces: a running balance with each
  friend. You can add IOUs for anything else (the taxi, tickets). A reminder after a week to chase
  anyone who hasn't paid.
- Receipts in other languages are **automatically translated into English** (on by default, can be
  turned off in Settings).
- Taglines the founder likes: "Take the maths out of special moments." and "Dinners should end with
  great conversations, not 15 minutes working out the bill."
- Versus Splitwise Pro (UK App Store, Oct 2026: £3.99 a month, £39.99 a year): OnlyBills is free.
  Be fair: Splitwise has a free plan too (with a daily cap on new expenses), so compare free with
  free and Pro with Pro, and never imply Splitwise has no free plan.
  Nobody signs up for OnlyBills, host included; Splitwise needs an account. The full comparison
  lives at /vs/splitwise/. Tone can be bold and salesy, but every claim
  about Splitwise not doing something must be true.
- Price: OnlyBills is free. Lead with "free" (headlines, heroes, CTAs, share images) and don't put
  prices, "Pro" or the scan allowance in headlines. There's no first-split paywall, no trial, no
  sign-up and nothing is locked. Everything is free: manual entry, live tables, Owed, History,
  payment links.
- Receipt scanning has a fair-use limit: 30 receipt scans in any 30 days (rolling, not a calendar
  month). Rescanning the same receipt within 48 hours doesn't count, and nor does the practice scan
  or a photo that couldn't be read. Typing a bill in is always unlimited.
- The optional subscription is **OnlyBills Pro** (monthly or yearly). It gives higher scan limits
  (up to 250 receipt scans in 30 days) and helps keep the app free. It gates nothing else.
- The one honest line: wherever cost is explained (FAQ answers, the pricing explainer at
  /how-to/first-run-and-pricing/, comparison tables), say plainly: "Free includes 30 receipt scans
  in any 30 days. Typing a bill in is always unlimited. OnlyBills Pro, optional, raises the scan
  limit."
- Never call scanning "unlimited" (free or Pro), and never say "free unlimited scans". Don't quote
  a price for OnlyBills Pro on the site; the app shows the real price and renewal before you pay.
- App Store: https://apps.apple.com/app/onlybills/id6754412082
- Don't claim: Android, multiple currencies, splitting rent/utilities as a household bills app,
  automatic bank integration, payment processing by OnlyBills itself (it hands off to the bank or
  PayPal), or anything you can't see in the list above.
