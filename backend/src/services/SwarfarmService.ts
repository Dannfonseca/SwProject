import axios from 'axios';
import { data } from '../data/provider';

const BASE_URL = 'https://swarfarm.com/api/v2';

export const syncSkills = async () => {
    let nextUrl: string | null = `${BASE_URL}/skills/`;
    let count = 0;

    console.log('Starting Skills Sync...');

    while (nextUrl) {
        try {
            const response: { data: { results: any[]; next: string | null } } = await axios.get(nextUrl);
            const { results, next } = response.data;

            for (const item of results) {
                await data.upsertSkill(item);
            }

            count += results.length;
            console.log(`Synced ${count} skills...`);
            nextUrl = next;
        } catch (error) {
            console.error('Error syncing skills:', error);
            break;
        }
    }
    console.log('Skills Sync Complete!');
};

export const syncMonsters = async () => {
    let nextUrl: string | null = `${BASE_URL}/monsters/?obtainable=true`;
    let count = 0;

    console.log('Starting Monsters Sync (Obtainable Only)...');

    while (nextUrl) {
        try {
            const response: { data: { results: any[]; next: string | null } } = await axios.get(nextUrl);
            const { results, next } = response.data;

            for (const item of results) {
                // Manually flag as obtainable since we are filtering by it
                item.obtainable = true;
                await data.upsertMonster(item);
            }

            count += results.length;
            console.log(`Synced ${count} monsters...`);
            nextUrl = next;
        } catch (error) {
            console.error('Error syncing monsters:', error);
            break;
        }
    }
    console.log('Monsters Sync Complete!');
};
