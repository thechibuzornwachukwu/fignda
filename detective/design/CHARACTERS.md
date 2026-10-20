# Characters

How the people of Lantern Row and the pets are made: the player's detective, the suspects and the 4 pets. They live in the 3D street (`src/map3d`) as realistic 3D figures: real proportions, real faces, real clothes, lit by the same sun, so they belong to the map. Their photos on the board and in Your Notebook are pictures taken of the same figures.

Today's round avatars (`src/avatar`) and the cartoon pets (`design/characters`) are replaced by set 1c.

## The look

A grown-up, grounded look. A detective of the street who moves through it unnoticed, close in spirit to a hooded figure in a long coat, never a copy of one. Mature for adults, safe for children:
- Proportions about 6.5 heads tall. Never chibi, never a muscle figure.
- A calm, watchful face. No snarl, no smirk.
- Layered cloth that looks worn: a coat, a waistcoat or jumper under it, a scarf, a satchel.
- Muted colour: ink, slate, olive, oxblood, ochre, cream. Brass is never worn: it means "found".
- No weapons, no blades, no armour, no blood. Tools only: a notebook, a lantern, a lens, a torch, a key ring.
- Real: skin, hair and cloth that read as themselves, no outline, no cartoon eyes, nothing toy-like.

## The player's detective

A detective anyone would know at a glance, without a costume:
- **Outline**: a knee-length overcoat with the collar up, and a brimmed hat.
- **Prop**: a small brass lantern on the belt. The street is Lantern Row.
- **Strap**: a satchel strap across the chest, left shoulder to right hip.
- **Stance**: weight on 1 foot, a slight lean forward, as if about to look closer.

What the player chooses:
- Skin tone, face shape, hair (under or out of the hood), and how they present. Every choice is free.
- The outfit, in layers that combine: coat, under layer, scarf or collar, gloves, boots, hood lining. Some pieces are earned by closing cases (a case's badge, its gold seal), never bought to go faster.

## Suspects

Drawn with the same system and proportions as the detective, so the street looks like 1 place.
- Each has a role you can read: a baker's apron and floured sleeves, a caretaker's key ring and work coat, a photographer's lamp bag.
- No 2 in a case share an outline, a main colour and a stance.
- Real people, not tidy ones: an odd beard (a fork, a chinstrap, a tangle), hair that needs a cut, a comb-over, a bald patch, glasses on a cord, a crooked collar. Some look kempt, some do not.
- A culprit wears a disguise layer until the case is closed (`src/avatar/parts/disguises.ts`). It is never saved.
- A face belongs to the person, not the case: Rosa looks the same in every case she is in (`faceSeed`).

## Pets

Working animals that go on cases, never toys. Grown, alert, real in shape and coat, no clothes, no hats.
- **A bloodhound**: follows a trail by scent.
- **An African grey parrot**: remembers every word it hears.
- **A capuchin monkey**: quick hands, reaches what is out of reach.
- **Agent 404, a robot**: a working machine of brushed metal and worn paint, never a toy.

Names are the owner's to choose (Agent 404 stays). Each has the 7 moods `<Partner>` shows (hello, empty, loading, error, done, found, asleep) as poses.

## Getting there

Between places the player watches the detective and the pet go there on the 3D street, never controls it: on foot with the pet, by skateboard, bicycle or car, or on a horse. A short hop is a walk; a long one is a ride (set 1-travel). A tap skips it.

## Making the figures

1. **1 figure**: a shared body at 6.5 heads, front, side and back, checked against the street's doors and lamps for scale. Nothing goes on until this is right.
2. **Face and props**: the face set, the hat, the lantern and the satchel, locked.
3. **Outfit parts**: each piece made to fit the figure, so any mix works, saved as 1 short code as today's avatars are.
4. **Poses and moves**: calm, thinking, found, stumped; walk, run, skate, cycle, drive, ride. Moves come from a free animation library fitted to the figure, its licence checked for sale before use.
5. **Pictures**: the board's photos and the empty states are pictures of the figures, rendered from the street.

A picture an image model makes is a reference only. What ships is the figure.
