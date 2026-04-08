export type NormalizedTrrStep = {
  order: number;
  name: string;
  expectedResult?: string;
  sourceStepId?: string;
  parentStepId?: string;
  metaJson?: string;
};

export type TrrStepParser = (raw: unknown) => NormalizedTrrStep[];
