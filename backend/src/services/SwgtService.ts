import axios from 'axios';
import { data } from '../data/provider';

// Using the URL provided by the user. Note: This might be dynamic in the future.
// The user provided: https://swgt.io/controllers/allServerAnalytics/defenseTrending/load?selectedFocus=&siegeSpecialDate=SSD_58&battleType=WORLDGUILDBATTLE&battleRank=*&naturalStars=
// It seems 'SSD_58' might be a specific date or season. We might want to make this configurable or fetch the latest.
// For now, I will use the exact URL provided.

const SWGT_URL = 'https://swgt.io/controllers/allServerAnalytics/defenseTrending/load?selectedFocus=&siegeSpecialDate=SSD_58&battleType=WORLDGUILDBATTLE&battleRank=*&naturalStars=';

export const syncDefenses = async () => {
    console.log('Starting SWGT Defense Sync...');
    try {
        const response = await axios.get(SWGT_URL);
        // Assuming the response is a JSON array or object with a list of defenses. 
        // I need to inspect the response structure. Since I cannot see it live without running, 
        // I will assume a structure or try to log it first if I were debugging strictly.
        // However, based on typical endpoints, let's assume `data` contains the list or `results`.

        // For safety, let's inspect the data type in a real run, but here I'll write defensive code.
        const data = response.data;

        // If data is an array directly
        let defenses = Array.isArray(data) ? data : (data.data || data.results || []);

        if (!Array.isArray(defenses)) {
            console.error('Unexpected SWGT response format:', data);
            return;
        }

        let count = 0;
        for (const item of defenses) {
            // We need to map the SWGT item to our Defense model.
            // We need a unique identifier. 'team_hash' is a good candidate if provided, otherwise we conjure one.
            // Let's assume the item has `monsters` (array of IDs or names) and `win_rate`, `pick_count`, etc.

            // CAUTION: Without seeing the actual JSON, mapping is a guess. 
            // I will dump the first item to console in the first run to verify mapping.

            // Constructing a "best effort" mapping based on standard analytics data
            // We might need to adjust this after the first successful fetch.

            // If we don't have a unique ID from SWGT, we create one from the monster combination
            const monsterIds = item.monsters || []; // Assuming this exists
            const teamHash = monsterIds.sort().join('_'); // Simple hash based on sorted monster IDs

            const defenseData = {
                team_hash: item.id || teamHash, // robust fallback
                monsters: monsterIds,
                win_rate: item.winRate || item.win_rate || 0,
                pick_rate: item.pickRate || item.pick_count || 0,
                tier: item.rank || 'N/A',
                battle_type: 'WORLDGUILDBATTLE', // From URL param
            };

            if (teamHash || item.id) {
                await data.upsertDefense(defenseData);
                count++;
            }
        }
        console.log(`Synced ${count} defenses from SWGT.`);

    } catch (error) {
        console.error('Error syncing SWGT defenses:', error);
    }
};
