# Portfolio

An explorable, multiplayer illustrated scene of the greater St. Louis region that serves as Joe Madden's portfolio. Visitors move through it as cursors, see each other, and enter places to learn about his career and life.

## Language

### Places

**Overworld**:
The top-level St. Louis scene that visitors explore first. Laid out to honour real geography.
_Avoid_: map, main scene, home

**District**:
One of the five named areas of the overworld: Midtown, Belleville, Maplewood, Central West End, Carondelet Park.
_Avoid_: area, section, region, location

**Venue**:
An enterable place inside a district, such as Saint Louis University, The Foundry, MonsterCommerce, Moosylvania, Side Project Cellar, Brennan's, or the park itself.
_Avoid_: building, location, portal

**Sub-scene**:
The interior scene a visitor enters through a venue, such as the CS lab inside Saint Louis University.
_Avoid_: interior, level, page, room

**Scene**:
Either the overworld or a sub-scene. The general term for any explorable space.

**Camera**:
The visitor's view onto a scene: the part of it currently on screen. Moves by edge-push, drag, joystick, keys or wheel.
_Avoid_: viewport, scroll position, window

### Things

**Prop**:
An interactive object placed in a scene that reacts when a visitor hovers or clicks it. Props are the only way career facts, links, and resume content are surfaced.
_Avoid_: object, item, hotspot, element

**Shared prop**:
A prop whose state is held by the room's server and seen identically by every visitor in the room, such as the Foundry screen.
_Avoid_: synced prop, global prop, multiplayer prop, server prop

**Local prop**:
A prop that reacts only for the visitor who touched it. Every prop is local unless named as shared.
_Avoid_: client prop, private prop, single-player prop

**Scenery**:
Non-interactive artwork in a scene, such as the Arch, the river, roads and parks between districts. Scenery never carries content and is never shared state.
_Avoid_: background, decoration, set dressing, filler

**Cosmetic**:
A decoration a prop grants to a visitor's cursor, such as a graduation cap or antlers, visible to everyone in the room. A cursor wears one cosmetic at a time, the most recently granted; earning a new one replaces the worn one.
_Avoid_: badge, item, unlock, accessory

**Gold cursor**:
The cursor of a visitor who has earned all seven cosmetics; its body is gold instead of white. The only completion reward.
_Avoid_: completionist, achievement, 100%

**Arrival point**:
The place in the overworld where every visitor first appears: the Moosylvania welcome sign.
_Avoid_: spawn, spawn point, home, start

### People

**Visitor**:
A connected user, shown to others as a cursor.
_Avoid_: user, player, cursor, client

**Room**:
The set of visitors who can currently see each other. There is one room per scene.
_Avoid_: channel, session, lobby
