# Castle Conquest, Remastered

Play it here: **https://oeponn.github.io/castle-conquest-remastered/**
But before you do, at least read the first two paragraphs.

## Why this game

I remember this game on miniclip, or maybe one of the various flash games hosts that would have clones. 2flashgames. Newgrounds?
I have this memory, maybe around 2009, of playing it with my best friend, Anton, at his house on his parents' shitty laptop while his dad yelled at us occasionally so he could listen to French radio. We were in New Zealand; he wasn't French, he just fancied himself a linguist. Apparently he also hated the sound of children having fun.


## Rose-tinted glasses

Before you try this game out, let's be honest with ourselves for a second: this was a free 2003 Shockwave
game. The physics were janky even in 2003, the
"3D" is a dozen boxes and cylinders on a grid, and the enemy AI aims at a random
flag and shrugs. If you played this as a kid, your
brain had probably patched over every rough edge with nostalgia, and no
amount of rebuilding it faithfully is going to un-patch that.

I only made this because the flashpoint archive version of it doesn't seem to work at all, even with shockwave downloaded and updated.

Not only that, the [version shown here](https://www.youtube.com/watch?v=73ZuIfE9_1k) seems to be a different version from the one I downloaded, and different to the one I remember playing. I have a distinct memory of my cannonballs being too slow to do significant damage, and it frustratingly bouncing off the enemy walls lol. I remember following the cannonball pov for ages, and being able to guide it slightly with left/right arrowkeys.

## A physics disclaimer

The original ran on Shockwave's Havok physics plugin, which no longer exists
in any usable form. There's no emulator, no decoder, nothing to point a
modern browser at. Getting the new physics engine (cannon-es) to _feel_ like
the original meant reverse-engineering gravity, launch speed, and impact
behavior from gameplay clues in the decompiled script (an AI aim table, a
smoke-trail duration, a turn timer) rather than from any physics constant
that actually survived. It's close to what I PERSONALLY remember the game felt like, but it is a **reconstruction**, not a bit-for-bit
port. If a shot feels slightly different from how you remember it, it's probably because its been abstracted through 17 years of memory haze.

## The technical stuff

The full engineering log; decompiling the game, recovering the physics
constants, fixing the aim math, chasing down deploy failures, is in
[`PORTING_NOTES.md`](./PORTING_NOTES.md). It's written to be read by a human
or by a coding agent, so it's long and blunt
about what was guessed, what was recovered, and what's still approximate.
Highlights if you don't want to read the whole thing:

- The game was Shockwave (Havok 3D), not Flash — decompiled with a patched
  [ProjectorRays](https://github.com/ProjectorRays/ProjectorRays).
- All original art, sound, and Lingo game logic (AI, scoring, castle
  layouts, shop prices) were extracted and ported 1:1.
- 3D geometry and the Havok physics engine itself had to be reconstructed —
  see the disclaimer above.
- Built with Vite + React + TypeScript + Three.js, deployed to GitHub Pages
  via GitHub Actions.

## Changing your gold (a.k.a. cheating)

Progress in this game is just one number: your gold, which unlocks castles
and shop items. It's stored entirely client-side in `localStorage`, under
the key `cstlcnqst20` (the name of the original Flash `SharedObject` this
replaced), as JSON like `{"gold": 1234}`.

If you want more gold, open your browser's DevTools (F12, or
Cmd+Option+I on Mac), go to the Console tab, and run:

```js
localStorage.setItem("cstlcnqst20", JSON.stringify({ gold: 999999 }));
```

Then reload the page.

If you don't already know how to do this: **learn it**. Not because this
particular hack matters. It's a browser game about knocking over toy
castles. But because "open DevTools and poke at the page's stored state"
is a pretty convenient skill. 


At minimum, if you're going to cheat in a game, you should understand
_how_ you're cheating.
