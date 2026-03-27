const LB_TO_KG = 0.45359237;
const KG_TO_LB = 2.20462262;
const IN_TO_CM = 2.54;
const CM_TO_IN = 0.393701;
const KCAL_TO_KJ = 4.184;
const KJ_TO_KCAL = 1 / 4.184;

export const lbsToKg = (lbs: number): number => lbs * LB_TO_KG;
export const kgToLbs = (kg: number): number => kg * KG_TO_LB;
export const inToCm = (inches: number): number => inches * IN_TO_CM;
export const cmToIn = (cm: number): number => cm * CM_TO_IN;
export const kcalToKj = (kcal: number): number => kcal * KCAL_TO_KJ;
export const kjToKcal = (kj: number): number => kj * KJ_TO_KCAL;
