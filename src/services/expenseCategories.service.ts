import { Categories, CommonFilterKeys } from "../@types/interfaces";
import prisma from "../config/prisma";
import { addDynamicFilters } from "../utils/common-functions";

export const getExpenseCategories = async (
  page: number = 1,
  pageSize: number = 10,
  parsedFilters: CommonFilterKeys = {},
  sortBy = "createdAt",
  sortOrder = "desc"
) => {
  const skip = (page - 1) * pageSize;

  const dynamicFilters: any = {};
  addDynamicFilters(parsedFilters, dynamicFilters);

  const orderBy = {
    [sortBy]: sortOrder === "desc" ? "desc" : "asc",
  };

  const categories: Categories[] = await prisma.expenseCategory.findMany({
    where: dynamicFilters,
    orderBy,
    take: pageSize,
    skip,
  });

  const totalItems = await prisma.expenseCategory.count({
    where: dynamicFilters,
  });

  return {
    data: categories.map((item, index) => ({
      ...item,
      no: skip + index + 1,
    })),
    totalPages: Math.ceil(totalItems / pageSize),
    currentPage: page,
    totalItems,
  };
};
