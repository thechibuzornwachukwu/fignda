# Lantern Row

The street every case happens on. Read it before writing a story. Its map is `design/sketches/map/plan/the-street.html` (`.png`), and its places, with their spots, are `src/engine/world.ts`. By day in the light theme, at night in the dark (`the-street-dark.png`). A case may add a place, a person or a custom: add it here in the same change, and never contradict a line already here.

## The street

1 street, about 400 m long, running from the bus stop at the top to the market row at the bottom. Cobbled at the top, tarmac below the hall. The street is named for the gas lamps it once had. They are gone: modern street lights now, tall poles with an arm over the road.

| From the top | What is there |
|---|---|
| The bus stop | A shelter and a timetable. The last bus is the 10.30. The tea kiosk stands beside it |
| The alley | Up the left side of the hall and along its back wall, to the yard. Unlit |
| The hall | Brick, 1 storey, behind the market. Its clock faces the street |
| The yard and the gate | Behind the hall. A car park on Friday nights, with Mr Cole at the gate |
| The library | 2 rooms and a reading room. Minute books are kept here and never lent |
| The bakery | Marco's. Ovens at the back, lit from 4 am. The art room is upstairs. Window boxes on the front |
| The sale room | Auctions on Saturdays. A desk, a sale book, numbered lots |
| The houses | Terraced, on the bottom side past the library. Fenced back gardens behind, a shed at the end of each. 2 of the roofs need work |
| The billboards | 3 kinds: a hoarding on posts on open ground at the top of the market square, a poster on the sale room's side wall, a panel on the end of the bus shelter. Posters change with the case and the season |
| The signs | The street's name on a green sign on a post, at each end |
| Bins | Public litter bins at the bus stop, the hall and the market corners; wheelie bins in the back gardens and beside the bakery |
| Fences | Back gardens are fenced. A front fence is a case's to put up: the case names the house numbers (`fenced`) |
| CCTV | 3 cameras: the sale room's, over the street toward the hall; the bakery's, down the street toward the market; number 8's, over its front path. Each sees only its own wedge of ground (`CAMERAS` in `src/map/street.ts`) |
| The market row | Stalls under awnings, 1 pitch each. Market day is Friday |
| The watchman's hut | At the bottom of the row. Somebody sits in it from 10 pm to 6 am |

Numbers: odd on the hall's side (the hall 1, the bakery 3, the sale room 5), even on the library's (the library 2, the houses 4, 6, 8 and 10). Each is on a plaque by the door.

Pavements run both sides of the road. Cars park at the kerb, and in the yard on Friday nights. Fields lie round the town. The hall's roof is kept; the sale room's, the bus shelter's and the watchman's hut's are not.

Off the street, and further than a walk: Rosa's night stall (20 minutes' drive), the bus depot, the committee secretary's house (40 minutes from the hall).

## The hall

| Room | What is in it |
|---|---|
| The main room | A stage at the far end, a piano, rows of folding chairs. Tall windows on the street side |
| The store room | Hooks for keys, a locked cabinet (the Long Spoon), extension reels on the bottom shelf, a workbench |
| The committee room | 1 long table, a key board on the wall, the ballot tin when there is a vote |
| The caretaker's desk | By the gate. The key book, the gate book, Mr Cole's kettle |
| The side door | Onto the alley. Locked from inside |
| The notice board | Outside the front door. Anyone can pin to it |

The hall clock can be set from outside, through a hatch, with a rod.

## Trees and things that grow

- Plane trees along the top of the street, pollarded each winter.
- A lime tree outside the library, the oldest thing on the street.
- Window boxes over the bakery. Tomas's herbs and seedlings on the Green Fingers stall.

## People

They live and work here, and return from case to case. A cleared suspect can be a witness later. Nobody is the culprit twice in a casebook.

| Name | Who | Where | What everybody knows |
|---|---|---|---|
| Rosa | Stall owner, the Stew Pot | The market row | Won the last 3 cook-off finals. Runs a night stall without a permit |
| Marco | Baker | The bakery | Lost the final by 1 vote last year and says the count was wrong |
| Mr Cole | Caretaker | The hall | 22 years of keys. Held the plane in 2011 |
| Theo | Photographer | Comes for events | Has photographed the last 9 finals. R. Marlow's son |
| Ines | Usher | The hall | Seats people for the choir and the final |
| Otto | Choir leader | The hall | Rehearses on the stage. Keeps the choir's desk |
| Kwame | Bus driver | The 10.30 | 11 years on the route. Leaves by the hall clock |
| Noor | Librarian | The library | Keeps the minutes shelf |
| Tomas | Gardener, Green Fingers | The market row | Rosa's neighbour on the row |
| Bea | Art teacher | The art room | Her class burns letters into oak |
| The committee | 5 neighbours and a secretary | The committee room | Runs the cook-off, the votes and the hall |

## The year

| When | What happens |
|---|---|
| Fridays | Market day. The yard is a car park at night |
| Saturdays | Auctions at the sale room |
| The night before the final | Theo sets up his lamps in the hall |
| The cook-off final | Once a year, in the hall at 6 pm. The winner's name is burned into the Long Spoon. This year is the 20th |

## The thread

- In 2011 the committee planed R. MARLOW off the Long Spoon: said to have bought her stew base, never proved. The minute book for 2011 records what was decided.
- Somebody hands a plain cream card with a lantern drawn on it to each culprit, before they act. Each card is left at the scene. Case 8 finds out who: Mr Cole, who held the plane, and wants the street to look again.

## Rules for a new case

- Times and distances on this page hold. A walk on the street is under 5 minutes end to end.
- A new place goes in the table where it stands on the street, with what is in it, then on the map: a spot in `world.ts` and the same point in the drawing (a test checks both). Every case and every step names its place (`where`).
- A new person gets a row: name, who, where, what everybody knows. Their secret stays in the case's story file.
- No harm, no weapons, no police. The committee settles things.
- Money, food and names read anywhere: no 1 country's customs that need explaining.
