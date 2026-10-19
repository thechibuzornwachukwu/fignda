# Characters

How the people of Lantern Row are drawn: the player's detective and the suspects. The pets keep their own clean shapes (`design/characters/characters.ts`).

Today's avatars (`src/avatar`) are the old round, sticker-like style from the puzzle game. They are replaced by set 1c, below.

## The look

A grown-up, grounded look. A detective of the street who moves through it unnoticed, close in spirit to a hooded figure in a long coat, never a copy of one. Mature for adults, safe for children:
- Proportions about 6.5 heads tall. Never chibi, never a muscle figure.
- A calm, watchful face. No snarl, no smirk.
- Layered cloth that looks worn: a coat, a waistcoat or jumper under it, a scarf, a satchel.
- Muted colour: ink, slate, olive, oxblood, ochre, cream. Lime is never worn: it means "found".
- No weapons, no blades, no armour, no blood. Tools only: a notebook, a lantern, a lens, a torch, a key ring.
- Drawn in the house ink style: 1 line weight, flat fills, warm cream paper, no gradients.

## The player's detective

The player is the detective, and from set 1c they are seen: on the path, at the ending and in Settings. Never inside a drawn scene, which is what they look at.

Fixed, so the detective stays the same whatever they wear:
- **Outline**: a hood that can be up or down, and a coat to the knee.
- **Prop**: a small brass lantern on the belt. The street is Lantern Row.
- **Strap**: a satchel strap across the chest, left shoulder to right hip.
- **Stance**: weight on 1 foot, a slight lean forward, as if about to look closer.

The player chooses:
- Skin tone, face shape, hair (under or out of the hood), and how they present. Every choice is free.
- The outfit, in layers that combine: coat, under layer, scarf or collar, gloves, boots, hood lining. Some pieces are earned by closing cases (a case's badge, its gold seal), never bought to go faster.

## Suspects

Drawn with the same system and proportions as the detective, so the street looks like 1 place.
- Each has a role you can read: a baker's apron and floured sleeves, a caretaker's key ring and work coat, a photographer's lamp bag.
- No 2 in a case share an outline, a main colour and a stance.
- A culprit wears a disguise layer until the case is closed (`src/avatar/parts/disguises.ts`). It is never saved.
- A face belongs to the person, not the case: Rosa looks the same in every case she is in (`faceSeed`).

## Making the art

The order, so nothing drifts (learned from the character-design method in `khanhhuyenngo985-sys/character-scene-design-skills`; the ideas only, nothing copied):
1. **Proportion sheet**: 1 neutral figure at 6.5 heads, front, side and back. Nothing goes on until this is right.
2. **Face and prop**: the face set and the lantern, satchel and hood, locked.
3. **Outfit layers**: each piece drawn to fit the locked figure, front and back, so any mix works.
4. **Moods**: calm, thinking, found, stumped, for the ending and the empty states.
5. **In the app**: layered SVG parts on 1 shared figure, saved as 1 short code, as today's avatars are.

A prompt for an image model always carries the fixed parts word for word:

> A detective of a quiet market street, 6.5 heads tall, grounded proportions. Knee-length [colour] coat, hood [up/down], satchel strap across the chest left shoulder to right hip, a small brass lantern on the belt, weight on 1 foot leaning slightly forward. Calm, watchful face. Flat colour, 1 ink line weight, warm cream paper, no gradient, no weapon. Keep consistent: hood and coat outline, brass lantern, satchel strap, stance.

A drawing an image model makes is a reference. What ships is drawn as SVG parts, checked by eye against the proportion sheet.
