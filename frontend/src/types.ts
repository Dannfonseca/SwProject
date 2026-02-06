export interface LeaderSkill {
    attribute: string;
    amount: number;
    area: string;
    element?: string;
}

export interface Skill {
    com2us_id: number;
    id: number;
    name: string;
    description: string;
    icon_filename: string;
    name_pt?: string;
    description_pt?: string;
}

export interface Monster {
    com2us_id: number;
    name: string;
    family_id: number;
    element: string;
    natural_stars: number;
    image_filename: string;
    type: string;
    skills: number[];
    skills_data?: Skill[]; // Populated by backend lookup
    leader_skill?: LeaderSkill;
    max_lvl_hp?: number;
    max_lvl_attack?: number;
    max_lvl_defense?: number;
    speed?: number;
}

export interface FamilyGroup {
    _id: number; // family_id
    monsters: Monster[];
    firstMonsterName: string;
}
