# Book Management Web App — Investigation Notes

Investigation into building and monetizing a book management web application.

## Market Context

- Crowded, mature market: Goodreads, The StoryGraph, LibraryThing dominate.
- Goodreads is aging (UX, Amazon ownership) — users actively seek alternatives.
- Winning requires niche focus, not a "Goodreads clone."

## Target Niche

**People with large book collections** (500–20,000+ books): hoarders, librarians, booksellers, reviewers.

### What this audience cares about
- Cataloging speed (scan many books in a session without friction)
- Knowing what they own (they forget — buy duplicates)
- Insurance / valuation (collections can be worth a lot)
- Export freedom (burned by Goodreads lock-in)
- Shelf management across multiple locations

## Product Concept

**"Memory aid for readers"** — core loop: *know what you own → remember it → reread it → know what's next.*

Not just a catalog, but behavior-driven engagement:
- **Reread reminders**: "You last read X 4 years ago — reread it?" sorted by time gap.
- **Wishlist + price alerts**: track desired books, notified on price drops or duplicate-purchase risk.
- **"Next up" engine**: queue mixing unread owned books + wishlist items to prevent impulsive buying.
- **Purchase blocker**: "You already own N unread books — buy anyway?"
- **Reread-ready scoring**: surface loved-but-forgotten books (high rating + long time since read).

## Recommendations

Blend three sources:
1. **Content-based**: features from owned/liked books (genre, author, series, length).
2. **Collaborative filtering** (user-requested): "users who own *this* also own *that*."
   - Similarity = overlap between users' libraries; recommend books owned by similar users that the user doesn't own.
   - Cold-start problem: weak until thousands of libraries exist.
   - Privacy: library use in recs should be opt-in or anonymized.
3. **Curated editorial lists** (older classics + new releases) to bootstrap before user data exists.

Goal: mix *classics their taste-friends own* with *new releases in similar genres*.

## Monetization

- **Freemium**: free core catalog; paid Pro for smart alerts, price tracking, advanced reread recommendations.
- **Alternative**: one-time license (Calibre-style) — collectors already spend heavily on books.
- **Donations**: viable supplement only; ~0.5–2% conversion. Pair with free/open-source model if chosen.
- Realistic income for indie book apps: $50–2,000/mo done well; side income, not a living wage.

## MVP vs. Later Phases

| Phase | Features |
|-------|----------|
| MVP | Book CRUD + metadata auto-fill (ISBN / Google Books API), search/filter, tags, reading status, progress, ratings/notes, CSV import, reread reminders, next-up queue |
| Later | Collaborative recommendations, price-drop alerts (scraping — technically hard), valuations, multi-location tracking, social-lite |
| After | Mobile apps, integrations (Kindle/Kobo, Readwise), export tools |

## Open Questions / Next Steps

- Pick a niche to validate demand before building.
- Decide data privacy model for recommendation engine.
- Confirm monetization model (subscription vs. license vs. donations).
