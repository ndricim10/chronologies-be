import { RatesProps } from "../@types/auth";
import prisma from "../config/prisma";

async function main() {
  await prisma.currency.createMany({
    data: [
      { base: "EUR", target: "USD", rate: 1.08 },
      { base: "EUR", target: "ALL", rate: 104.5 },
      { base: "EUR", target: "EUR", rate: 1 },
      { base: "USD", target: "EUR", rate: 0.93 },
      { base: "USD", target: "ALL", rate: 96.8 },
      { base: "USD", target: "USD", rate: 1 },

      { base: "ALL", target: "EUR", rate: 0.0096 },
      { base: "ALL", target: "USD", rate: 0.0103 },
      { base: "ALL", target: "ALL", rate: 1 },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());

export const getCurrencyRatesService = async () => {
  try {
    const rates: RatesProps[] = await prisma.currency.findMany();
    const result: Record<string, Record<string, number>> = {};

    rates.forEach(({ base, target, rate }) => {
      // Only include rates where base and target are different
      if (base !== target) {
        if (!result[base]) result[base] = {};
        result[base][target] = parseFloat(rate.toFixed(4));
      }
    });

    return result;
  } catch (error) {
    throw new Error("Failed to fetch currency rates");
  }
};

const updateReverseCurrencyRate = async (
  base: string,
  target: string,
  rate: number
) => {
  try {
    const reverseRate = 1 / rate;

    await prisma.currency.upsert({
      where: {
        base_target: {
          base: target,
          target: base,
        },
      },
      update: {
        rate: parseFloat(reverseRate.toFixed(4)),
      },
      create: {
        base: target,
        target: base,
        rate: parseFloat(reverseRate.toFixed(4)),
      },
    });
  } catch (error) {
    throw new Error("Failed to update reverse currency rate");
  }
};

export const updateCurrencyRateService = async (
  base: string,
  target: string,
  rate: number
) => {
  try {
    const updatedRate = await prisma.currency.upsert({
      where: {
        base_target: {
          base,
          target,
        },
      },
      update: {
        rate: parseFloat(rate.toFixed(4)),
      },
      create: {
        base,
        target,
        rate: parseFloat(rate.toFixed(4)),
      },
    });

    await updateReverseCurrencyRate(base, target, rate);

    return updatedRate;
  } catch (error) {
    throw new Error("Failed to update currency rate");
  }
};
