// Rude words in languages the main list does not cover. Short on purpose: clearly rude terms only, no
// words that are mild, slang for a fool, or common names. Lowercase, letters only, accents removed (isProfane
// removes them from the text too: "akwụna" is read as "akwuna"). Matched as whole words.
// The owner can add to it. A term that is also an ordinary word in English must not go here.

/** Pidgin and Yoruba. */
const PIDGIN_YORUBA = ['ashawo', 'oloshi', 'olosho', 'agbaya'];
/** Igbo. */
const IGBO = ['akwuna'];
/** Hausa. */
const HAUSA = ['karuwa', 'daniska'];

export const LOCAL_BLOCKED: readonly string[] = [...PIDGIN_YORUBA, ...IGBO, ...HAUSA];
