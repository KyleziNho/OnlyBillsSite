---
title: How to get paid back in your own currency with OnlyBills
seoTitle: Get paid back in your own currency on a bill abroad
description: On a bill abroad, friends can pay you back in pounds, dollars or euros at a rate fixed when you share: today's rate or the one your card gave you.
date: 2026-11-14
art: payout
order: 7.2
summary: Settle a foreign bill in your own currency, at a rate everyone sees.
related: split-bill-abroad-currency, get-paid-back-outside-the-uk, scan-a-receipt, share-a-live-table
trademarks: payments
---
On a bill in another currency, OnlyBills can have friends pay you back in your own. After you scan, the split sheet shows a line such as "THB 2,400.00 · settle in £ at today's rate (£1 = THB 43.80) · Change". Leave it, or tap **Change** to type the rate your card gave you. The rate is fixed when you share, and every friend sees what they owe you in pounds.

Why this matters, and which rate is fair, is covered in [splitting a bill abroad](/blog/split-bill-abroad-currency/).

## 1. Check the bill's currency

Scan the receipt as usual. On the review screen, the currency is next to the total. If OnlyBills had to guess, it asks, for example "Is this in THB?". Tap the currency to fix it before you continue. A wrong currency here means a wrong conversion later.

## 2. Look at the settle line

Tap **Continue**. The "How are you splitting?" sheet shows one line about the currency:

| Line | What it means |
|---|---|
| settle in £ at today's rate (£1 = THB 43.80) | Friends pay you in pounds at today's reference rate |
| settle in £ at the rate from 11 Nov | The newest rate available is a few days old |
| settle in £ at your rate | You typed your own rate |
| friends pay in ฿ | Friends pay in the bill's currency |
| settle in £: no rate yet · Enter rate | No rate could be found. Type one, or leave it in the bill's currency |

If your main way to get paid only takes your own currency (Monzo only takes pounds, for example), settling in pounds is switched on for you. If it can take the bill's currency, such as Revolut, it starts off and you can switch it on.

## 3. Change the currency or type your own rate

Tap **Change**. The "How friends pay you back" sheet lists the bill's currency and yours, each with the bill total, for example "In baht (THB 2,400.00)" and "In pounds (£54.79)".

With your currency selected, the rate field shows today's reference rate. To use the rate your card or Revolut gave you, type it in. The note changes to "Your rate", and **Use today's rate** puts the reference rate back. If your rate is far from today's, OnlyBills says so, but it doesn't stop you.

:::shot settle-how-friends-pay-you-back | Choose baht or pounds. The rate starts at today's reference rate, and you can type your card's rate instead. | Choose whether friends pay you in baht or pounds, and the rate.

To find your card's rate, divide the pound amount on your statement by the bill total. Then tap **Done**.

## 4. Share the table

Choose **Everyone taps their own** or **I'll assign it** as usual. Once a live table is shared, the rate is fixed for good, so nobody pays at a different rate. The live table shows it above **Finish**, for example "Friends pay in £ at £1 = THB 43.80 (13 Nov)", and each person's row shows both amounts.

:::shot settle-live-table | Once the table is shared, the rate is fixed and shown to everyone. | The live table: friends scan, and pay you in pounds at the frozen rate.

On a bill you assigned yourself, you can still tap **Change** on the summary. Requests you send after that use the new rate; ones already sent keep the old one.

## What friends see

Each friend's share card shows the bill currency and what they pay you: "Your share THB 888.75 · you pay £20.29".

:::shot guest-share-th-settle-gbp | Friends see their share in the bill's currency and what they pay you. | Your share in baht, and what you pay in pounds.

On the pay sheet, the big amount and every option carry the pound amount. Under the options is the rate and where it came from, such as "£1 = THB 43.80 · rate from 13 Nov", or your own name's rate, such as "Leo's rate", if you typed it yourself.

:::shot guest-pay-th-settle-gbp | Every pay option carries the pound amount, with the rate and its date underneath. | A Bangkok bill paid back in pounds at a fixed rate.

A friend from a third country pays the same pound amount; their own bank converts it. If one of your methods can't take pounds, for example Venmo only takes US dollars, it moves below the others with the reason.

Who still owes you appears in **Owed** in your currency, with the bill-currency amount noted underneath.

## Good to know

- The default rate is a public reference rate, not your bank's. Your friends' banks do the real conversion when they pay.
- Each person's share is converted on its own and rounded to the penny.
- OnlyBills never moves or holds money. Friends tap "I've paid" when they've sent it.

## FAQ

### Where does the exchange rate come from?
From a public reference rate, a blend of central bank and official rates, fetched by your phone when you split. It isn't your bank's rate. If your card charged a different rate, type that one instead.

### Can I change the rate after sharing the table?
Not on a live table. The rate is fixed when you share, so everyone pays at the same rate. On a bill you assigned yourself, you can change it for requests you send afterwards; links already sent keep their rate.

### What do friends from a third country pay?
The same amount in your currency. Their own bank or card converts it from theirs.
<!-- Verification notes (14 Nov 2026): all strings and behaviour from docs/SETTLE_CURRENCY_SPEC.md (2.4 review pill "Is this in THB?"; 3.2 line states and default ON/OFF rule; Change sheet title, rows, footnote "Today's rate, 13 Nov. Use the rate your card or Revolut gave you if you like.", "Your rate.", "Use today's rate", far-from-rate warning >25% not blocking; 4 live table "Friends pay in £ at £1 = ฿43.80 (13 Nov)" and guest row amounts; summary Change publishes a new doc, "Links you've already sent keep..."; 5 guest share card, pay sheet hero, rate line "rate from 13 Nov" / "Kyle's rate"; Owed in settle currency with note; per-guest conversion rounded half away from zero). The app renders THB as "THB" in amounts (captures), the spec's "฿" examples are symbol forms; "friends pay in ฿" OFF state text uses the symbol per spec, confirm on device. Rate sources: Frankfurter v2 (blended central bank/official), fallback fawazahmed0; stale > 4 days → "Enter rate". £54.79 = 2,400 / 43.80. The settle-8 capture shows £1 = THB 44 → £54.55 (2,400/44 = 54.545). Venmo demotion string "Venmo only takes US dollars." from contract 1.1. -->
