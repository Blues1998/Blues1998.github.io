---
title: Focus Reader
summary: A stream-based reading app that presents text one word at a time to make reading possible in motion.
tags: [React, UX, Reading]
order: 3
status: under-development
liveUrl: /apps/focus-reader/
---

## Motivation

I recently decided to try reading books more consistently and started with *Yayati* by V. S. Khandekar. I had the PDF on my phone and tried reading it during my evening walks.

That experiment failed quickly.

The road I walk on doesn’t have a proper footpath, and dividing attention between navigating traffic and reading dense text on a phone screen turned out to be impractical. I realised that, for me at least, traditional page-based reading assumes a level of stillness and focus that isn’t always available.

That’s when the idea clicked.

What if reading didn’t require scanning lines of text at all?  
What if the content could come to you, one word at a time, at a controlled pace?

That evening, I opened my MacBook and started building Focus Reader.

---

## Core idea

Focus Reader presents text as a **continuous word stream**, highlighting a single word at a time at a user-defined speed. Instead of asking the reader to visually hunt for the next word, the app removes that cognitive overhead entirely.

The goal is not speed-reading for its own sake, but **reducing friction** — making it easier to read in imperfect conditions.

---

## Expanding the experience

Once the stream view was working, a limitation became obvious:  
sometimes you need context.

To address this, I added a **page view** that allows users to zoom out and see the surrounding text whenever they want. The reader can fluidly switch between focused consumption and contextual overview without losing their place.

This dual-mode approach turned out to be essential. Stream view is great for flow; page view is necessary for comprehension and grounding.

---

## Making reading rewarding

I don’t particularly enjoy reading long books. It feels effortful, and I’m easily distracted. Accepting that, rather than fighting it, shaped the next set of decisions.

If the app was going to work for someone like me, it had to be:
- intuitive
- low-effort
- subtly motivating

To that end, I added:
- **Optimal Recognition Point (ORP)** highlighting to anchor attention
- A **reading progress sidebar** with cues like “~2 minutes to next chapter”
- Clear, minimal controls that don’t interrupt flow

The intent isn’t gamification, but reassurance — small signals that make continuing feel manageable.

---

## Current state and next steps

Focus Reader is currently a web app built with React and deployed as a static application under this site.

Next steps I’m considering:
- Porting the app to **Android**
- Exploring offline reading
- Potentially publishing it on the **Play Store**

Whether or not it becomes a polished product, the project has already served its purpose: it helped me think deeply about attention, interface friction, and designing for real-world constraints.

---

*— 31st January 2026*
