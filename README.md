# Castle Conquest Remastered

<img src="./docs/images/castle-conquest-thumbnail.png" width="100%" alt="Castle Conquest Remastered Demo Thumbnail" />

Play it here: **https://oeponn.github.io/castle-conquest-remastered/**
But before you do, I recommend reading paragraphs two and three at least, because I like to yap.

## Why this game?

I remember this game on miniclip, or maybe one of the various flash games hosts that would have clones. 2flashgames? Newgrounds?

I have this memory... maybe around 2009, of playing it with my best friend's (Anton) house on his parents' shitty laptop. His dad yelled at us occasionally to be quiet so he could listen to French radio. We were in New Zealand, and he wasn't French. I think he just fancied himself a linguist. Apparently he also hated the sound of children having fun.


## Rose-tinted glasses

Before you try this out, let's think it through before you destroy your sense of nostalgia from when you still had a childlike sense of wonder. This was a free 2006 Shockwave
game. Your brain has probably been eroded by the attention economy to the extent that this game will feel like it's in slow motion. Maybe I'm projecting. 

All I'm saying is, if you played this as a kid, your brain had probably patched over rough edges. I didn't rebuild this game for the gaming experience, but for the memories attached to it.

I only made this because the [flashpoint archive version](https://flashpointproject.github.io/flashpoint-database/search/#f42bb47b-105c-3696-fe03-eb52e8d67589) of it doesn't seem to work at all for me, even with shockwave downloaded and updated.

I was able to fill some of the gaps in memory by watching this video:

<!-- [![Castle Conquest gameplay](https://img.youtube.com/vi/73ZuIfE9_1k/hqdefault.jpg)](https://www.youtube.com/watch?v=73ZuIfE9_1k) -->
[![Castle Conquest gameplay](./docs/images/castle-conquest-video-thumbnail.jpg)](https://www.youtube.com/watch?v=73ZuIfE9_1k)

Though, I have a distinct memory of my cannonballs being too slow to do significant damage, and it frustratingly bouncing off the enemy walls lol. I remember following the cannonball POV for ages, and being able to guide it slightly with left/right arrowkeys. Perhaps that video is sped up. I also thought the flags were red so clearly I'm not 100% reliable.

## A physics disclaimer

The original ran on Shockwave's Havok physics plugin, which has been [permanently deprecated for modern browser](https://helpx.adobe.com/enterprise/kb/eol-adobe-flash-shockwave-player.html). There's no emulator, no decoder, no nothin. Getting the new physics engine (cannon-es) to _feel_ like
the original meant reverse-engineering based off how I remember the launch speed, and impact
behavior from gameplay clues in the decompiled script (an AI aim table, a
smoke-trail duration, a turn timer) rather than from any physics constant
that actually survived.  If a shot feels slightly different from how you remember it, it's probably because its been abstracted through 17 years of memory haze.

## Recovering the 3D meshes

The actual 3D castle meshes were inside Shockwave's `.w3d` files in an Intel
IFX compressed format. Initially I thought these were undecodable, and that any castle geometry would have to be approximated by hand.

Thankfully I was wrong, even though I had already drafted up the 3D models by the time I found out. Anthony Kleine's
[Shockwave-3D-World-Converter](https://github.com/tomysshadow/Shockwave-3D-World-Converter)
reads exactly this format. It's a Windows tool, so I ran it using wine, put `castleConquest.w3d` through, and exported the whole scene!
Models, normals, UVs, materials, textures straight to Wavefront OBJ. The
recovered geometry and textures are committed in
[`assets/extracted/3d/`](./assets/extracted/3d/) (see commit
[`9848502`](https://github.com/Oeponn/castle-conquest-remastered/commit/9848502db931238852b410805288c5c4806bee4c)). It was like 2am and I was so excited lol.

<p align="center">
  <img src="./docs/images/shockwave-convert-01.png" width="45%" alt="Shockwave 3D World Converter with castleConquest.w3d loaded, all export options checked" />
  &nbsp;
  <img src="./docs/images/shockwave-convert-02.png" width="45%" alt="Shockwave 3D World Converter mid-conversion" />
</p>

### Getting them into the game

Recovering the OBJ was a good start; the meshes had to replace the
hand-built models without breaking the physics. The commit
[`bc6bfdf`](https://github.com/Oeponn/castle-conquest-remastered/commit/bc6bfdf4d319063bfa72960d53e00022b785dee3):
`tools/convert_3d_models.py` cleans the OBJ, converts the TIFF textures to PNG,
and generates the mesh data the game reads at runtime. This is when the game started looking like the original.
## The technical stuff

I then did a bunch of manual nudging and the pieces were mostly together. Lost the fonts though. Added a two player though!

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

If you don't already know how to do this, it's nice to know. Not because this
particular hack matters here, it is a pretty convenient skill in general. 


At a minimum, if you're going to cheat in a game, you should understand
_how_ you're cheating imo. I was big into hacking for unfair advantages when I was younger, so I'm hardly talking from a high horse. 
I even still write bots for games. But it does kind of take away the sense of achievement, so you may as well get something else out of it.
