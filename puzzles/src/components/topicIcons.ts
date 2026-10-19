import { Apple, Atom, Baby, Banknote, BookOpen, Bird, Camera, Car, Church, Clapperboard, CloudSun, Cpu, Crown, Dna, Dumbbell, FlaskConical, Gamepad2, Goal, GraduationCap, HeartPulse, Landmark, Leaf, MapPin, Mountain, Music, Palette, PawPrint, Plane, Rocket, Shapes, Shirt, Trophy, Users, Utensils, WavesHorizontal, type LucideIcon } from 'lucide-react';

import { HOME_ICONS } from './icons/home';

/** Every icon a topic can have, by its name in data/topicIcons.json. A test keeps the 2 lists the same. */
export const TOPIC_ICONS: Readonly<Record<string, LucideIcon>> = {
  Shapes, Goal, Trophy, Music, Utensils, Apple, PawPrint, Bird, Rocket, Car, Banknote, GraduationCap, Church, BookOpen, MapPin,
  Plane, Users, Baby, FlaskConical, Atom, Dna, Clapperboard, HeartPulse, Dumbbell, CloudSun, Cpu, Gamepad2, Landmark, Crown,
  Shirt, Palette, Camera, Leaf, WavesHorizontal, Mountain,
  ...HOME_ICONS,
};
