import bcrypt from "bcryptjs";
import { CreateUser, ROLES, User } from "../../@types/auth";
import { CommonFilterKeys } from "../../@types/interfaces";
import prisma from "../../config/prisma";
import { addDynamicFilters } from "../../utils/common-functions";
import { createAuditLog } from "./audit.service";

const { admin } = ROLES;

export const getUsers = async (
  page: number = 1,
  pageSize: number = 10,
  filters: CommonFilterKeys = {},
  sortBy: string = "name",
  sortOrder: string = "asc"
) => {
  const skip = (page - 1) * pageSize;
  const dynamicFilters: any = {};

  addDynamicFilters(filters, dynamicFilters);

  const orderBy = {
    [sortBy]: sortOrder === "desc" ? "desc" : "asc",
  };

  const data: User[] = await prisma.user.findMany({
    skip,
    take: pageSize,
    orderBy,
    where: dynamicFilters,
  });

  const totalItems = await prisma.user.count({
    where: dynamicFilters,
  });

  return {
    data: data.map((item, index) => ({
      ...item,
      no: skip + index + 1,
      password: undefined,
      fullName: `${item.name} ${item.surname}`,
    })),
    totalPages: Math.ceil(totalItems / pageSize),
    currentPage: page,
    totalItems,
  };
};

export const getUserById = async (id: number) => {
  const response = await prisma.user.findUnique({
    where: { id },
  });

  if (response) {
    const updatedData = {
      ...response,
      password: undefined,
    };
    return updatedData;
  }

  return {};
};

export const createUser = async (
  data: CreateUser,
  role: ROLES,
  currentUserId: number
) => {
  if (![admin].includes(role)) {
    throw { status: 403, message: "User with this role is unauthorized" };
  }

  const { password } = data;
  const hashedPassword = await bcrypt.hash(password, 10);

  const createdData: any = {
    ...data,
    password: hashedPassword,
    fullName: `${data.name} ${data.surname}`,
  };

  const user = await prisma.user.create({ data: createdData });

  await createAuditLog(
    currentUserId,
    "CREATE",
    "USER",
    `Created user "${user.fullName}"`
  );

  return {
    message: "User has been successfully created!",
    user: { id: user.id },
  };
};

export const updateUser = async (
  id: number,
  data: Partial<CreateUser>,
  currentUserId: number
) => {
  try {
    const { password, ...updateData } = data;

    const updatedData: any = { ...updateData };

    const user = await prisma.user.update({
      where: { id },
      data: updatedData,
    });

    await createAuditLog(
      currentUserId,
      "UPDATE",
      "USER",
      `Updated user "${user.fullName}"`
    );

    return {
      message: "User has been successfully updated!",
      user: { id: user.id },
    };
  } catch (error) {
    throw new Error("User not found or update failed.");
  }
};

export const deleteUser = async (id: number, currentUserId: number) => {
  try {
    const user = await prisma.user.delete({
      where: { id },
    });
    await createAuditLog(
      currentUserId,
      "DELETE",
      "USER",
      `Deleted user "${user.name} ${user.surname}"`
    );
    return {
      message: "User has been successfully deleted!",
      user: {
        id: user.id,
      },
    };
  } catch (error) {
    throw new Error("User not found or delete failed");
  }
};
