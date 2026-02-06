import { data as pgData, initPg } from './pg';
export const data = pgData;
export const isPostgres = true;

export const initData = async () => {
  await initPg();
};
